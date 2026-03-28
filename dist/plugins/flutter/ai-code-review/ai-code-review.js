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
 * Keys são lidas de: danger-bot.yaml (settings.gemini_api_keys) ou env vars.
 */
const _types_1 = require("../../../types");
const config_1 = require("../../../config");
const fs = __importStar(require("fs"));
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_OUTPUT_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_CONTENT_CHARS = 30000;
const FILES_PER_KEY = 15;
const DELAY_BETWEEN_REQUESTS_MS = 15000;
const MAX_CONSECUTIVE_RATE_LIMITS = 3;
const MIN_LINES_FOR_REVIEW = 20;
const MIN_CHANGED_LINES = 5;
const SYSTEM_PROMPT = `Você é um code reviewer sênior especialista em Flutter/Dart, Clean Architecture, Clean Code e SOLID.

Analise o código abaixo e aponte APENAS problemas reais e relevantes.

## FOCO DA ANÁLISE:

1. **Bugs e erros lógicos** — condições invertidas, null safety, race conditions, async mal tratado
2. **SOLID** — violações de SRP, DIP, OCP, ISP, LSP
3. **Clean Architecture** — imports entre camadas incorretos, dependências invertidas, lógica de negócio na camada errada
4. **Segurança** — keys/secrets hardcoded, dados sensíveis expostos, logs com informação sensível
5. **Complexidade** — métodos longos (>50 linhas), aninhamento excessivo (>3 níveis), god classes
6. **Performance Flutter** — dispose de controllers/streams, rebuilds desnecessários, uso correto de const, ListView.builder vs Column para listas, setState em árvores pesadas

## FORMATO DE RESPOSTA (siga exatamente):

Cada achado deve ser UMA linha com este formato:
EMOJI **Título curto** — Explicação em 1-2 frases. Use \`backticks\` para nomes de classes, métodos ou variáveis.

Emojis de severidade (SEMPRE comece a linha com um destes):
- 🔴 = crítico (bugs, segurança, crashes)
- 🟡 = atenção (violações de arquitetura, code smells sérios)
- 🔵 = sugestão (melhorias, refatorações)

ORDEM OBRIGATÓRIA: primeiro todos os 🔴, depois todos os 🟡, depois todos os 🔵.

Exemplo de resposta correta (note a ordem por severidade):
🔴 **Dependência invertida** — \`UserModel\` importa diretamente \`UserEntity\`. A camada de dados não deve depender do domínio. Use uma interface ou mapper.
🟡 **Falta dispose** — O \`StreamController\` em \`_authStream\` nunca é fechado. Adicione \`_authStream.close()\` no \`dispose()\`.
🔵 **Método longo** — \`fetchData()\` tem 60 linhas. Considere extrair a lógica de retry para um helper.

## REGRAS OBRIGATÓRIAS:

- Responda SEMPRE em PT-BR
- SEMPRE ordene: 🔴 primeiro, depois 🟡, depois 🔵
- Use \`backticks simples\` para nomes de classes, métodos e variáveis inline
- Se incluir exemplo de código, SEMPRE feche o bloco com \`\`\`
- Se o código estiver bom, responda apenas: "✅ Código aprovado — nenhum problema encontrado."
- NÃO comente sobre imports faltantes (você não tem o contexto completo)
- NÃO comente sobre formatação ou estilo (isso é responsabilidade do linter)
- NÃO invente problemas — se há poucos achados, liste poucos
- Seja direto e objetivo, cada achado em UMA linha`;
function getApiKeys() {
  const keys = [];
  try {
    const cfg = (0, config_1.loadConfig)();
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function callGemini(prompt, key) {
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
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return { text: text ?? null, rateLimited: false };
  } catch {
    console.log(`  ⚠️ Gemini falha na key ...${key.slice(-6)}`);
    return { text: null, rateLimited: false };
  }
}
function sanitizeAiOutput(text) {
  let result = text;
  const openBlocks = (result.match(/```/g) || []).length;
  if (openBlocks % 2 !== 0) {
    result += "\n```";
  }
  result = result.replace(/<\/?(?:sub|sup|b|i|em|strong|br|hr|div|span|p)[^>]*>/gi, "");
  return result.trim();
}
function sortBySeverity(points) {
  const severity = (p) => {
    if (p.includes("\u{1F534}")) return 0; // 🔴
    if (p.includes("\u{1F7E1}")) return 1; // 🟡
    if (p.includes("\u{1F535}")) return 2; // 🔵
    return 3;
  };
  return [...points].sort((a, b) => severity(a) - severity(b));
}
function buildReviewMarkdown(file, text) {
  const lines = ["", "", "| 🤖 AI Code Review |", "| :--- |", `| **Arquivo:** \`${file}\` |`, ""];
  const rawPoints = sortBySeverity(splitPoints(text));
  for (let idx = 0; idx < rawPoints.length; idx++) {
    lines.push(rawPoints[idx]);
    if (idx < rawPoints.length - 1) {
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }
  lines.push("", "---", "");
  lines.push(`*Análise gerada por **Danger Bot AI** — revise antes de aplicar.*`);
  return lines.join("\n");
}
function splitPoints(text) {
  const lines = text.split("\n");
  const points = [];
  let current = [];
  for (const line of lines) {
    const isNewPoint =
      /^\s*(?:[•\-*]|\u{1F534}|\u{1F7E1}|\u{1F535})\s/u.test(line) || /^\s*\d+[.)]\s/.test(line);
    if (isNewPoint && current.length > 0) {
      points.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) {
    const trimmed = current.join("\n").trim();
    if (trimmed) points.push(trimmed);
  }
  if (points.length <= 1) return [text.trim()];
  return points;
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
function isFileWorthReviewing(content) {
  const lineCount = content.split("\n").length;
  return lineCount >= MIN_LINES_FOR_REVIEW;
}
async function countChangedLines(git, file) {
  try {
    const diff = await git.structuredDiffForFile(file);
    if (!diff) return 0;
    let added = 0;
    for (const chunk of diff.chunks) {
      for (const change of chunk.changes) {
        if (change.type === "add") added++;
      }
    }
    return added;
  } catch {
    return 999;
  }
}
function truncateContent(content) {
  if (content.length <= MAX_CONTENT_CHARS) return content;
  return content.slice(0, MAX_CONTENT_CHARS) + "\n// ... (arquivo truncado para análise)";
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
        "⚠️ ai-code-review: nenhuma API key configurada. " +
          "Defina gemini_api_keys no danger-bot.yaml ou GEMINI_API_KEYS/GEMINI_API_KEY como variável de ambiente."
      );
      return;
    }
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) => f.endsWith(".dart") && shouldAnalyzeFile(f) && fs.existsSync(f)
    );
    if (dartFiles.length === 0) return;
    const candidates = [];
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (!isFileWorthReviewing(content)) {
        console.log(`  ⏭️ ${file} — ignorado (< ${MIN_LINES_FOR_REVIEW} linhas)`);
        continue;
      }
      const changed = await countChangedLines(git, file);
      if (changed < MIN_CHANGED_LINES) {
        console.log(`  ⏭️ ${file} — ignorado (${changed} linha(s) alterada(s))`);
        continue;
      }
      candidates.push({ file, changedLines: changed });
    }
    candidates.sort((a, b) => b.changedLines - a.changedLines);
    const maxFiles = FILES_PER_KEY * apiKeys.length;
    const filesToAnalyze = candidates.slice(0, maxFiles).map((c) => c.file);
    if (filesToAnalyze.length === 0) {
      console.log("🤖 AI Code Review: nenhum arquivo com mudanças significativas para analisar.");
      return;
    }
    const filtered = dartFiles.length - candidates.length;
    console.log(
      `🤖 AI Code Review: ${dartFiles.length} arquivo(s) .dart encontrados` +
        (filtered > 0 ? `, ${filtered} ignorado(s) por filtro` : "") +
        `, analisando ${filesToAnalyze.length} com Gemini...`
    );
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
        const cleanText = sanitizeAiOutput(result.text);
        (0, _types_1.sendWarn)(`🤖 **AI CODE REVIEW** — \`${file}\``);
        (0, _types_1.sendMarkdown)(buildReviewMarkdown(file, cleanText));
        console.log(`  🤖 ${file} — review gerado`);
      }
      if (i < filesToAnalyze.length - 1) {
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      }
    }
    if (reviewed > 0) {
      const message =
        issues === 0
          ? `🤖 **AI Code Review**: IA analisou **${reviewed} arquivo(s)** e aprovou todos. Nenhuma sugestão encontrada.`
          : `🤖 **AI Code Review**: IA analisou **${reviewed} arquivo(s)** — **${approved} aprovado(s)**, **${issues} com sugestões**.`;
      (0, _types_1.sendMessage)(message);
    } else if (skipped > 0) {
      console.log(
        `⚠️ ai-code-review: nenhum arquivo analisado com sucesso (${skipped} falharam/ignorados).`
      );
    }
  }
);
