# Google Chat Notification

Ao final do review, envia um **card** ao Google Chat via webhook (`google_chat_webhook` no `danger-bot.yaml` ou `GOOGLE_CHAT_WEBHOOK` no ambiente). Resume quantidade de fails/warnings do Danger e link do PR (GitHub/Bitbucket quando disponível).

## O que verifica

- Não analisa código-fonte; apenas POST HTTP para o webhook configurado
- Se não houver URL HTTPS válida, só registra log no console

## Severidade

- **Tipo:** `message` (notificação externa; não usa `fail`/`warn` do Danger no PR)

## Exemplo

```yaml
# danger-bot.yaml — conceito (configuração do projeto)
settings:
  google_chat_webhook: "https://chat.googleapis.com/v1/spaces/.../messages?key=..."
```

## Referências

- [Google Chat webhooks](https://developers.google.com/chat/how-tos/webhooks)
