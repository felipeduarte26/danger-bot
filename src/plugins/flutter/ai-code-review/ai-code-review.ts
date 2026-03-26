/**
 * AI Code Review Plugin
 *
 * Usa Google Gemini (free tier) para analisar código Dart/Flutter.
 * Foca em: Clean Code, SOLID, Clean Architecture, segurança, bugs e refatoração.
 *
 * Suporta rotation de API keys para contornar rate limits do free tier.
 * Keys são lidas de: danger-bot.yaml (settings.gemini_api_keys) ou env vars.
 */
import { createPlugin, getDanger, sendMessage } from "@types";
import { loadConfig } from "../../../config";
import * as fs from "fs";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_OUTPUT_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_CONTENT_CHARS = 30000;
const FILES_PER_KEY = 15;
const DELAY_BETWEEN_REQUESTS_MS = 10000;
const MAX_CONSECUTIVE_RATE_LIMITS = 10;

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
- Se o código estiver bom, responda APENAS: "✅ Código aprovado — nenhum problema encontrado."
- NÃO comente sobre imports faltantes (você não tem o contexto completo)
- NÃO comente sobre formatação ou estilo (isso é responsabilidade do linter)

FORMATO OBRIGATÓRIO para cada ponto encontrado (use exatamente este template markdown):

---

### {emoji} {TÍTULO EM MAIÚSCULO}

{Explicação curta do problema em 1-2 linhas}

**❌ Problema encontrado:**
\`\`\`dart
// código atual com problema (trecho relevante)
\`\`\`

**✅ Sugestão de correção:**
\`\`\`dart
// código corrigido/sugerido
\`\`\`

**🎯 Ação:** {O que o dev precisa fazer, em 1 linha}

---

Emojis de severidade: 🔴 crítico, 🟡 atenção, 🔵 sugestão.
Sempre inclua os blocos de código com o problema e a sugestão de correção.
Seja direto e objetivo.`;

function getApiKeys(): string[] {
  const keys: string[] = [];

  try {
    const cfg = loadConfig();
    const yamlKeys = cfg.settings?.gemini_api_keys;
    if (Array.isArray(yamlKeys)) {
      keys.push(...yamlKeys.map((k) => String(k).trim()).filter(Boolean));
    }
  } catch {
    // danger-bot.yaml não encontrado ou inválido
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(
  prompt: string,
  key: string
): Promise<{ text: string | null; rateLimited: boolean }> {
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
      return { text: null, rateLimited: true };
    }

    if (res.status === 400) {
      const errBody = await res.text();
      console.log(`  ⚠️ Gemini erro 400: ${errBody.slice(0, 200)}`);
      return { text: null, rateLimited: false };
    }

    if (!res.ok) {
      console.log(`  ⚠️ Gemini erro ${res.status} na key ...${key.slice(-6)}`);
      return { text: null, rateLimited: false };
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return { text: text ?? null, rateLimited: false };
  } catch {
    console.log(`  ⚠️ Gemini falha na key ...${key.slice(-6)}`);
    return { text: null, rateLimited: false };
  }
}

function shouldAnalyzeFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    !lower.endsWith(".g.dart") &&
    !lower.endsWith(".freezed.dart") &&
    !lower.endsWith("_test.dart") &&
    !lower.includes("/generated/") &&
    !lower.includes("/l10n/")
  );
}

function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_CHARS) return content;
  return content.slice(0, MAX_CONTENT_CHARS) + "\n// ... (arquivo truncado para análise)";
}

export default createPlugin(
  {
    name: "ai-code-review",
    description: "Code review com IA (Gemini) — analisa Clean Code, SOLID, segurança e bugs",
    enabled: true,
  },
  async () => {
    const apiKeys = getApiKeys();

    if (apiKeys.length === 0) {
      console.log(
        "⚠️ ai-code-review: nenhuma API key configurada. " +
          "Defina gemini_api_keys no danger-bot.yaml ou GEMINI_API_KEYS/GEMINI_API_KEY como variável de ambiente."
      );
      return;
    }

    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) => f.endsWith(".dart") && shouldAnalyzeFile(f) && fs.existsSync(f)
    );

    if (dartFiles.length === 0) return;

    const maxFiles = FILES_PER_KEY * apiKeys.length;
    const filesToAnalyze = dartFiles.slice(0, maxFiles);

    if (filesToAnalyze.length < dartFiles.length) {
      console.log(
        `🤖 AI Code Review: ${dartFiles.length} arquivo(s) encontrados, analisando ${filesToAnalyze.length} ` +
          `(${FILES_PER_KEY} por key × ${apiKeys.length} keys). Adicione mais keys para cobrir todos.`
      );
    } else {
      console.log(
        `🤖 AI Code Review: analisando ${filesToAnalyze.length} arquivo(s) com Gemini...`
      );
    }

    let reviewed = 0;
    let approved = 0;
    let issues = 0;
    let skipped = 0;
    let keyIndex = 0;
    let usedWithCurrentKey = 0;
    let consecutiveRateLimits = 0;
    let aborted = false;

    for (let i = 0; i < filesToAnalyze.length; i++) {
      if (aborted) break;

      const file = filesToAnalyze[i];
      const content = fs.readFileSync(file, "utf-8");

      if (content.split("\n").length < 5) {
        skipped++;
        continue;
      }

      if (usedWithCurrentKey >= FILES_PER_KEY && keyIndex < apiKeys.length - 1) {
        keyIndex++;
        usedWithCurrentKey = 0;
        consecutiveRateLimits = 0;
        console.log(
          `  🔑 Trocando para key ${keyIndex + 1}/${apiKeys.length} ...${apiKeys[keyIndex].slice(-6)}`
        );
      }

      const trimmed = truncateContent(content);
      const prompt = `${SYSTEM_PROMPT}\n\nArquivo: ${file}\n\n\`\`\`dart\n${trimmed}\n\`\`\``;

      const result = await callGemini(prompt, apiKeys[keyIndex]);

      if (result.rateLimited) {
        consecutiveRateLimits++;
        console.log(
          `  ⚠️ Rate limit na key ...${apiKeys[keyIndex].slice(-6)} (${consecutiveRateLimits}/${MAX_CONSECUTIVE_RATE_LIMITS})`
        );

        await sleep(5000);

        if (consecutiveRateLimits >= MAX_CONSECUTIVE_RATE_LIMITS) {
          if (keyIndex < apiKeys.length - 1) {
            keyIndex++;
            usedWithCurrentKey = 0;
            consecutiveRateLimits = 0;
            console.log(
              `  🔑 Trocando para key ${keyIndex + 1}/${apiKeys.length} ...${apiKeys[keyIndex].slice(-6)}`
            );
            i--;
            continue;
          }

          console.log(
            "  🛑 Todas as keys atingiram rate limit consecutivo. Interrompendo AI Code Review para não travar a pipeline."
          );
          aborted = true;
          break;
        }

        await sleep(DELAY_BETWEEN_REQUESTS_MS);
        i--;
        continue;
      }

      consecutiveRateLimits = 0;
      usedWithCurrentKey++;

      if (!result.text) {
        console.log(`  ❌ ${file} — falha na API`);
        skipped++;
        continue;
      }

      reviewed++;

      if (result.text.includes("Código aprovado")) {
        approved++;
        console.log(`  ✅ ${file} — aprovado pela IA`);
      } else {
        issues++;

        console.log(`  🤖 ${file} — review gerado`);
      }

      if (i < filesToAnalyze.length - 1) {
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      }
    }

    if (aborted && reviewed > 0) {
      sendMessage(
        `🤖 **AI Code Review**: IA analisou **${reviewed} arquivo(s)** antes de atingir o rate limit — **${approved} aprovado(s)**, **${issues} com sugestões**. Alguns arquivos não foram analisados.`
      );
    } else if (aborted) {
      sendMessage(
        "🤖 **AI Code Review**: Rate limit atingido em todas as API keys. Nenhum arquivo foi analisado. Tente novamente mais tarde ou adicione mais keys."
      );
    } else if (reviewed > 0) {
      if (issues === 0) {
        sendMessage(
          `🤖 **AI Code Review**: IA analisou **${reviewed} arquivo(s)** e aprovou todos. Nenhuma sugestão encontrada.`
        );
      } else {
        sendMessage(
          `🤖 **AI Code Review**: IA analisou **${reviewed} arquivo(s)** — **${approved} aprovado(s)**, **${issues} com sugestões**.`
        );
      }
    } else if (skipped > 0) {
      console.log(
        `⚠️ ai-code-review: nenhum arquivo analisado com sucesso (${skipped} falharam/ignorados).`
      );
    }
  }
);
