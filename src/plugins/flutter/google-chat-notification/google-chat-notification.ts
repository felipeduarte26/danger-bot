/**
 * GOOGLE CHAT NOTIFICATION PLUGIN
 * ================================
 * Envia notificação no Google Chat via webhook quando o Danger Bot finaliza o code review.
 *
 * Configuração no danger-bot.yaml:
 *   settings:
 *     google_chat_webhook: "https://chat.googleapis.com/v1/spaces/..."
 *
 * Ou via env var: GOOGLE_CHAT_WEBHOOK
 *
 * IMPORTANTE: este plugin deve ser o ÚLTIMO a rodar para capturar todos os resultados.
 */

import { createPlugin, getDanger } from "@types";
import { loadConfig } from "../../../config";
import { getPRTitle } from "../../../helpers";

const REQUEST_TIMEOUT_MS = 10000;

function getWebhookUrl(): string | null {
  try {
    const cfg = loadConfig();
    const url = cfg.settings?.google_chat_webhook;
    if (url && typeof url === "string" && url.startsWith("https://")) return url;
  } catch {
    // config não encontrado
  }

  const envUrl = process.env.GOOGLE_CHAT_WEBHOOK;
  if (envUrl?.startsWith("https://")) return envUrl;

  return null;
}

function getDangerResults(): { fails: number; warnings: number; messages: number } {
  const results = (global as any).results ?? (globalThis as any).results;
  if (!results) return { fails: 0, warnings: 0, messages: 0 };

  return {
    fails: Array.isArray(results.fails) ? results.fails.length : 0,
    warnings: Array.isArray(results.warnings) ? results.warnings.length : 0,
    messages: Array.isArray(results.messages) ? results.messages.length : 0,
  };
}

function getPRUrl(): string {
  const d = getDanger();

  const bbPr = d.bitbucket_cloud?.pr;
  if (bbPr?.links?.html?.href) return bbPr.links.html.href;

  const ghPr = d.github?.pr;
  if (ghPr?.html_url) return ghPr.html_url;

  return "";
}

function buildChatMessage(): object {
  const { fails, warnings } = getDangerResults();
  const prUrl = getPRUrl();
  const prTitle = getPRTitle() || "Pull Request";

  let statusEmoji: string;
  let statusText: string;

  if (fails > 0) {
    statusEmoji = "🔴";
    statusText = "Problemas encontrados no code review";
  } else if (warnings > 0) {
    statusEmoji = "🟡";
    statusText = "Avisos encontrados no code review";
  } else {
    statusEmoji = "🟢";
    statusText = "Nenhum problema encontrado";
  }

  const sections: any[] = [
    {
      widgets: [
        {
          decoratedText: {
            topLabel: "Status",
            text: `${statusEmoji} ${statusText}`,
          },
        },
      ],
    },
  ];

  if (prUrl) {
    sections.push({
      widgets: [
        {
          buttonList: {
            buttons: [
              {
                text: "Ver Pull Request",
                onClick: { openLink: { url: prUrl } },
              },
            ],
          },
        },
      ],
    });
  }

  return {
    cardsV2: [
      {
        cardId: "danger-bot-review",
        card: {
          header: {
            title: "Danger Bot — Code Review",
            subtitle: prTitle,
            imageUrl: "https://cdn-icons-png.flaticon.com/128/4712/4712109.png",
            imageType: "CIRCLE",
          },
          sections,
        },
      },
    ],
  };
}

export default createPlugin(
  {
    name: "google-chat-notification",
    description: "Envia notificação no Google Chat quando o Danger Bot finaliza o code review",
    enabled: true,
  },
  async () => {
    const webhookUrl = getWebhookUrl();

    if (!webhookUrl) {
      console.log(
        "⚠️ google-chat-notification: nenhum webhook configurado. " +
          "Defina google_chat_webhook no danger-bot.yaml ou GOOGLE_CHAT_WEBHOOK como variável de ambiente."
      );
      return;
    }

    const message = buildChatMessage();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        console.log("✅ Notificação enviada para o Google Chat");
      } else {
        const body = await res.text();
        console.log(`⚠️ Google Chat erro ${res.status}: ${body.slice(0, 200)}`);
      }
    } catch (err) {
      console.log(
        `⚠️ Google Chat falha ao enviar: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
);
