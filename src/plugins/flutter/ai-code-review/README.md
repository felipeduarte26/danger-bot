# 🔌 AI Code Review

> Code review com IA (Gemini) — analisa Clean Code, SOLID, segurança e bugs

---

## 📋 Visão Geral

Este plugin usa a API **Google Gemini** (tier gratuito, modelo `gemini-2.5-flash-lite`) para revisar código Dart/Flutter alterado no Pull Request. O feedback aparece no PR como **aviso** (`sendWarn`): **não falha o CI** — serve como orientação para humanos.

---

## 🎯 O que a IA analisa

Entre os focos do prompt estão:

- **Bugs e lógica** — null safety, condições, race conditions, `setState` após `async` sem checagem de `mounted`
- **SOLID** — violações de SRP, DIP, OCP, ISP, LSP
- **Clean Architecture** — imports entre camadas, dependências e responsabilidades
- **Segurança** — secrets hardcoded, dados sensíveis, vetores comuns (ex.: SQL injection, XSS)
- **Complexidade** — métodos longos, aninhamento, god classes
- **Flutter** — `dispose`, `const`, performance em `build()`

A resposta é em **PT-BR**, com limite de pontos por arquivo conforme a implementação do plugin.

---

## ⚙️ Arquivos considerados e limites

O plugin **ignora** (não envia à API):

- Arquivos `.g.dart`, `.freezed.dart` e `*_test.dart`
- Caminhos que contenham `generated/` ou `l10n/`

---

## 🚀 Configuração das API keys (3 formas)

Todas as fontes são **combinadas**; duplicatas são removidas automaticamente.

### 1. `danger-bot.yaml` (`settings.gemini_api_keys`)

```yaml
settings:
  gemini_api_keys:
    - "AIzaSy..."
    - "AIzaSy..."
```

### 2. Variável de ambiente `GEMINI_API_KEYS`

Várias keys em uma única variável, **separadas por vírgula**:

```bash
export GEMINI_API_KEYS="key1,key2,key3"
```

### 3. Variável de ambiente `GEMINI_API_KEY`

Uma única key:

```bash
export GEMINI_API_KEY="AIzaSy..."
```

**Link para gerar keys gratuitas:** [Google AI Studio — API key](https://aistudio.google.com/apikey)

Sem nenhuma key configurada, o plugin exibe um aviso no log e não chama a API.

---

## 🔄 Rotação de keys

Com **múltiplas keys** configuradas, o plugin pode tentar a próxima key quando recebe **rate limit** (429), ajudando a distribuir o uso entre as keys.

---

## 📊 Free tier e modelo

- **Modelo:** `gemini-2.5-flash-lite`
- **Custo:** uso alinhado ao tier gratuito do Google (sem cobrança direta no cenário típico de free tier)
- **Limites usuais (por key):** ~**15 requisições/minuto** e ~**1.000 requisições/dia** — verifique sempre a documentação oficial do Google para valores atualizados

---

## 🚀 Uso no `dangerfile`

O plugin faz parte de `codeQualityPlugins` e de `allFlutterPlugins`.

### Importação

```typescript
import { aiCodeReviewPlugin } from "@felipeduarte26/danger-bot";
```

### Uso básico

```typescript
// dangerfile.ts
import { aiCodeReviewPlugin, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot([aiCodeReviewPlugin]);
```

### Personalização

```typescript
// Desabilitar o plugin
aiCodeReviewPlugin.config.enabled = false;
```

---

## ⚠️ Tipo de mensagem: aviso (não falha)

Todas as sugestões da IA são enviadas com **`sendWarn`**. O pipeline do Danger **não é marcado como falha** por este plugin por causa do review de IA — revise os comentários no PR e decida o que aplicar.

---

## 🔧 Opções avançadas

### Integração com outros plugins

```typescript
import {
  aiCodeReviewPlugin,
  securityCheckerPlugin,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

executeDangerBot([securityCheckerPlugin, aiCodeReviewPlugin]);
```

---

## 🌍 Plataformas suportadas

| Plataforma        | Status      |
| ----------------- | ----------- |
| GitHub            | ✅ Suportado |
| Bitbucket Cloud   | ✅ Suportado |
| Bitbucket Server  | ✅ Suportado |
| GitLab            | ✅ Suportado |

---

## 📦 Dependências

| Pacote                       | Uso                          |
| ---------------------------- | ---------------------------- |
| `danger` (peer)              | Framework base               |
| `@felipeduarte26/danger-bot` | Helpers, `createPlugin`, tipos |
| Rede                         | Chamadas HTTPS à API Gemini  |

---

## 🔗 Plugins relacionados

- [`security-checker`](../security-checker/README.md) — detecção heurística de secrets e vulnerabilidades
- [`avoid-god-class`](../avoid-god-class/README.md) — tamanho de classes (SRP)
- [`flutter-analyze`](../flutter-analyze/README.md) — análise estática Flutter

---

## 📚 Documentação adicional

- [Configuração (inclui `gemini_api_keys`)](../../docs/CONFIGURACAO.md)
- [Guia de Plugins](../../docs/GUIA_PLUGINS.md)
- [API Reference](../../docs/API.md)

---

## 💡 Dicas

- Configure keys no **CI** via secrets (`GEMINI_API_KEY` ou `GEMINI_API_KEYS`), não commite keys no repositório.
- Para PRs grandes, várias keys reduzem chance de esgotar quota de uma única key no mesmo dia.
- Valide o plugin: `danger-bot validate src/plugins/flutter/ai-code-review/ai-code-review.ts`

---

<div align="center">

**[Danger Bot](https://github.com/felipeduarte26/danger-bot)**

[![Danger Bot](https://img.shields.io/badge/Danger-Bot-success)](https://github.com/felipeduarte26/danger-bot)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

</div>
