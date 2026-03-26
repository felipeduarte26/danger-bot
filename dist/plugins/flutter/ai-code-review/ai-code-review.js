"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * AI Code Review Plugin
 *
 * Usa Google Gemini (free tier) para analisar código Dart/Flutter.
 * Foca em: Clean Code, SOLID, Clean Architecture, segurança, bugs e refatoração.
 *
 * Suporta rotation de API keys para contornar rate limits do free tier.
 * Keys são lidas de:
 *   1. danger-bot.yaml → settings.gemini_api_keys: [...]
 *   2. Env var GEMINI_API_KEYS (separadas por vírgula)
 *   3. Env var GEMINI_API_KEY (uma única key)
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_OUTPUT_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 30000;
const SYSTEM_PROMPT = `Você é um code reviewer sênior especialista em Flutter/Dart, Clean Architecture, Clean Code e SOLID.

Analise o código abaixo e aponte APENAS problemas reais e relevantes. Foque em:

1. **Bugs e erros lógicos** — condições invertidas, null safety, race conditions, setState após async sem mounted check
2. **SOLID** — violações de SRP, DIP, OCP, ISP, LSP
3. **Clean Architecture** — imports entre camadas incorretos, dependências invertidas, lógica de negócio na camada errada
4. **Segurança** — keys/secrets hardcoded, dados sensíveis expostos, SQL injection, XSS
5. **Complexidade** — métodos muito longos, aninhamento excessivo, god classes
6. **Boas práticas Flutter** — dispose de controllers, uso correto de const, performance em build()

REGRAS:
- Responda SEMPRE em PT-BR
- Máximo 5 pontos por arquivo
- Cada ponto deve ter: emoji de severidade (🔴 crítico, 🟡 atenção, 🔵 sugestão), título curto e explicação em 1-2 linhas
- Se o código estiver bom, responda apenas: "✅ Código aprovado — nenhum problema encontrado."
- NÃO comente sobre imports faltantes (você não tem o contexto completo)
- NÃO comente sobre formatação ou estilo (isso é responsabilidade do linter)
- Seja direto e objetivo`;
function getApiKeys() {
  const keys = [];
  try {
    const configPaths = ["danger-bot.yaml", "danger-bot.yml"];
    for (const name of configPaths) {
      const fullPath = `${process.cwd()}/${name}`;
      if (fs.existsSync(fullPath)) {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const yamlMatch = raw.match(/gemini_api_keys:\s*\n((?:\s*-\s*.+\n?)+)/);
        if (yamlMatch) {
          const yamlKeys = yamlMatch[1]
            .split("\n")
            .map((l) => l.replace(/^\s*-\s*["']?|["']?\s*$/g, "").trim())
            .filter((k) => k.length > 0);
          keys.push(...yamlKeys);
        }
        break;
      }
    }
  } catch {
    // yaml parse error
  }
  if (process.env.GEMINI_API_KEYS) {
    keys.push(
      ...process.env.GEMINI_API_KEYS.split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    );
  }
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  return [...new Set(keys)];
}
async function callGemini(prompt, apiKeys) {
  for (const key of apiKeys) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.3,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.status === 429) {
        console.log(`⚠️ Gemini rate limit na key ...${key.slice(-6)}, tentando próxima...`);
        continue;
      }
      if (!res.ok) {
        console.log(`⚠️ Gemini erro ${res.status} na key ...${key.slice(-6)}, tentando próxima...`);
        continue;
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch {
      console.log(`⚠️ Gemini falha na key ...${key.slice(-6)}, tentando próxima...`);
      continue;
    }
  }
  return null;
}
function shouldAnalyzeFile(filePath) {
  const lower = filePath.toLowerCase();
  return (
    !lower.endsWith(".g.dart") &&
    !lower.endsWith(".freezed.dart") &&
    !lower.endsWith("_test.dart") &&
    !lower.includes("/generated/") &&
    !lower.includes("/l10n/")
  );
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "ai-code-review",
    description: "Code review com IA (Gemini) — analisa Clean Code, SOLID, segurança e bugs",
    enabled: true,
  },
  async () => {
    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
      console.log(
        "ℹ️ AI Code Review: nenhuma API key configurada. " +
          "Configure GEMINI_API_KEY, GEMINI_API_KEYS ou gemini_api_keys no danger-bot.yaml."
      );
      return;
    }
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) => f.endsWith(".dart") && shouldAnalyzeFile(f) && fs.existsSync(f)
    );
    if (dartFiles.length === 0) return;
    console.log(`🤖 AI Code Review: analisando ${dartFiles.length} arquivo(s) com Gemini...`);
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      if (lines.length < 5) continue;
      const prompt = `${SYSTEM_PROMPT}\n\nArquivo: ${file}\n\n\`\`\`dart\n${content}\n\`\`\``;
      const review = await callGemini(prompt, apiKeys);
      if (!review) {
        console.log(`  ❌ ${file} — falha na API (todas as keys falharam)`);
        continue;
      }
      if (review.includes("✅ Código aprovado")) {
        console.log(`  ✅ ${file} — aprovado pela IA`);
        continue;
      }
      (0, _types_1.sendWarn)(
        `🤖 **AI CODE REVIEW** — \`${file}\`\n\n${review}\n\n---\n_Revisão automática por Gemini (${GEMINI_MODEL}). Valide as sugestões antes de aplicar._`,
        file
      );
      console.log(`  🤖 ${file} — review gerado`);
    }
  }
);
