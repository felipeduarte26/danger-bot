/**
 * Security Checker Plugin
 * Detecta problemas de segurança em projetos Flutter/Dart.
 *
 * Analisa:
 * 1. API Keys / Tokens hardcoded em arquivos .dart (Google, AWS, OpenAI, Firebase, Stripe, etc.)
 * 2. Senhas e secrets hardcoded em código
 * 3. Headers com tokens Bearer/Basic hardcoded
 * 4. Arquivos sensíveis commitados (.env, google-services.json, keystore, etc.)
 * 5. Arquivos sensíveis ausentes no .gitignore
 *
 * Exclui arquivos de teste (*_test.dart) e ignora matches em comentários.
 */
import { createPlugin, getDanger, sendFail, sendWarn } from "@types";
import * as fs from "fs";

interface SecretPattern {
  id: string;
  regex: RegExp;
  label: string;
  severity: "critical" | "high" | "medium";
}

const SECRET_PATTERNS: SecretPattern[] = [
  // ── API Keys de provedores ──
  {
    id: "google-api",
    regex: /['"]AIza[0-9A-Za-z_-]{35}['"]/,
    label: "Google API Key",
    severity: "critical",
  },
  {
    id: "aws-access",
    regex: /['"]AKIA[0-9A-Z]{16}['"]/,
    label: "AWS Access Key",
    severity: "critical",
  },
  {
    id: "openai",
    regex: /['"]sk-[A-Za-z0-9]{20,}['"]/,
    label: "OpenAI API Key",
    severity: "critical",
  },
  {
    id: "stripe-secret",
    regex: /['"]sk_live_[A-Za-z0-9]{24,}['"]/,
    label: "Stripe Secret Key",
    severity: "critical",
  },
  {
    id: "stripe-publish",
    regex: /['"]pk_live_[A-Za-z0-9]{24,}['"]/,
    label: "Stripe Publishable Key (live)",
    severity: "high",
  },
  {
    id: "firebase-key",
    regex: /['"]firebase[_-]?api[_-]?key['"]\s*[:=]\s*['"][^'"]{10,}['"]/,
    label: "Firebase API Key",
    severity: "critical",
  },
  {
    id: "github-token",
    regex: /['"](ghp_[A-Za-z0-9]{36}|gho_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,})['"]/,
    label: "GitHub Token",
    severity: "critical",
  },
  {
    id: "twilio-sid",
    regex: /['"]AC[a-f0-9]{32}['"]/,
    label: "Twilio Account SID",
    severity: "critical",
  },
  {
    id: "sendgrid",
    regex: /['"]SG\.[A-Za-z0-9_-]{22,}\.[A-Za-z0-9_-]{22,}['"]/,
    label: "SendGrid API Key",
    severity: "critical",
  },
  {
    id: "slack-token",
    regex: /['"]xox[bpas]-[A-Za-z0-9-]{10,}['"]/,
    label: "Slack Token",
    severity: "critical",
  },
  {
    id: "jwt-token",
    regex: /['"]eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+['"]/,
    label: "JWT Token",
    severity: "critical",
  },

  // ── Senhas e secrets genéricos ──
  {
    id: "password-assign",
    regex: /(?:password|passwd|pwd)\s*=\s*['"][^'"]{4,}['"]/,
    label: "Password hardcoded",
    severity: "critical",
  },
  {
    id: "secret-assign",
    regex: /(?:secret|secretKey|secret_key|api_secret)\s*=\s*['"][^'"]{4,}['"]/,
    label: "Secret hardcoded",
    severity: "critical",
  },
  {
    id: "token-assign",
    regex: /(?:token|accessToken|access_token|auth_token)\s*=\s*['"][^'"]{8,}['"]/,
    label: "Token hardcoded",
    severity: "high",
  },
  {
    id: "private-key",
    regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    label: "Private Key",
    severity: "critical",
  },

  // ── Headers com credenciais ──
  {
    id: "bearer-header",
    regex: /['"](?:Authorization|authorization)['"]\s*:\s*['"]Bearer\s+[A-Za-z0-9_.=-]{20,}['"]/,
    label: "Bearer Token em header",
    severity: "critical",
  },
  {
    id: "basic-header",
    regex: /['"](?:Authorization|authorization)['"]\s*:\s*['"]Basic\s+[A-Za-z0-9+/=]{10,}['"]/,
    label: "Basic Auth em header",
    severity: "critical",
  },
  {
    id: "api-key-header",
    regex: /['"](?:X-API-Key|x-api-key|Api-Key|api-key)['"]\s*:\s*['"][^'"]{8,}['"]/,
    label: "API Key em header",
    severity: "high",
  },

  // ── URLs com credenciais ──
  {
    id: "url-with-key",
    regex:
      /['"]https?:\/\/[^'"]*[?&](?:key|apiKey|api_key|token|access_token)=[A-Za-z0-9_.=-]{10,}['"]/,
    label: "URL com credencial no query string",
    severity: "high",
  },
  {
    id: "url-with-auth",
    regex: /['"]https?:\/\/[^:'"]+:[^@'"]+@[^'"]+['"]/,
    label: "URL com user:password",
    severity: "critical",
  },
];

const SENSITIVE_FILES = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.staging",
  ".env.development",
  "google-services.json",
  "GoogleService-Info.plist",
  "firebase_app_id_file.json",
  "keystore.jks",
  "upload-keystore.jks",
  "key.properties",
  "release.keystore",
  "service-account.json",
  "credentials.json",
  "secrets.json",
  "secrets.yaml",
  "secrets.yml",
];

const GITIGNORE_EXPECTED = [
  ".env",
  "*.env",
  "*.jks",
  "*.keystore",
  "key.properties",
  "google-services.json",
  "GoogleService-Info.plist",
  "service-account.json",
];

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("///");
}

export default createPlugin(
  {
    name: "security-checker",
    description: "Detecta problemas de segurança (keys, secrets, arquivos sensíveis)",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const allFiles = [...git.created_files, ...git.modified_files];

    // ── 1. Verificar secrets em arquivos .dart ──
    const dartFiles = allFiles.filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".mock.dart") &&
        !f.endsWith(".mocks.dart") &&
        !f.includes("/test/") &&
        !f.includes("/test_driver/") &&
        !f.includes("/integration_test/") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (isCommentLine(line)) continue;

        for (const { regex, label, severity } of SECRET_PATTERNS) {
          if (!regex.test(line)) continue;

          const icon = severity === "critical" ? "🚨" : severity === "high" ? "⚠️" : "💡";

          sendFail(
            `\n${icon} SEGURANÇA — ${label.toUpperCase()}

\`${line.trim()}\`

Credencial detectada diretamente no código-fonte. Isso é um **risco ${severity === "critical" ? "crítico" : "alto"}** de segurança.

**Consequências:**

- Exposição de credenciais em repositório
- Uso não autorizado por terceiros
- Possível violação de dados

**Ação necessária:**

1. Remova a credencial do código
2. Revogue a credencial no provedor (considere comprometida)
3. Use variáveis de ambiente:

\`\`\`dart
// ❌ Hardcoded
const apiKey = 'AIzaSyD-9tNTn...';

// ✅ Variável de ambiente
const apiKey = String.fromEnvironment('API_KEY');

// ✅ flutter_dotenv
final apiKey = dotenv.env['API_KEY'] ?? '';
\`\`\``,
            file,
            i + 1
          );
          break;
        }
      }
    }

    // ── 2. Verificar arquivos sensíveis commitados ──
    for (const file of allFiles) {
      const fileName = file.split("/").pop() ?? "";

      const matched = SENSITIVE_FILES.find((s) => fileName === s || file.endsWith(`/${s}`));

      if (matched) {
        sendFail(
          `\n🚨 ARQUIVO SENSÍVEL COMMITADO — \`${fileName}\`

O arquivo \`${file}\` **não deve ser commitado** no repositório. Ele pode conter credenciais, chaves ou configurações sensíveis.

**Ação necessária:**

1. Remova o arquivo do commit: \`git rm --cached ${file}\`
2. Adicione ao \`.gitignore\`: \`${fileName}\`
3. Se continha credenciais, revogue e gere novas`,
          file,
          1
        );
      }
    }

    // ── 3. Verificar .gitignore ──
    if (fs.existsSync(".gitignore")) {
      const gitignoreContent = fs.readFileSync(".gitignore", "utf-8");
      const missing: string[] = [];

      for (const entry of GITIGNORE_EXPECTED) {
        const escaped = entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
        const entryRegex = new RegExp(`^${escaped}\\s*$`, "m");
        if (!entryRegex.test(gitignoreContent)) {
          missing.push(entry);
        }
      }

      if (missing.length > 0) {
        const missingList = missing.map((m) => `- \`${m}\``).join("\n");

        sendWarn(
          `\n⚠️ GITIGNORE — Entradas de segurança ausentes

O \`.gitignore\` não contém algumas entradas recomendadas para proteger arquivos sensíveis:

${missingList}

**Adicione ao .gitignore:**

${missingList}`
        );
      }
    }
  }
);
