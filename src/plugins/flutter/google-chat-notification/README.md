# 🔌 Google Chat Notification

> Envia notificação no Google Chat quando o Danger Bot finaliza o code review

---

## 📋 Visão Geral

Este plugin do Danger Bot ajuda a manter:
- ✅ Qualidade do código
- ✅ Boas práticas
- ✅ Consistência no projeto

---

## 🎯 Objetivo

Envia notificação no Google Chat quando o Danger Bot finaliza o code review

O plugin analisa automaticamente as mudanças no Pull Request e fornece feedback instantâneo sobre possíveis melhorias ou problemas detectados.

---

## ⚙️ Como Funciona

1. **Análise**: Examina arquivos modificados/criados no PR
2. **Validação**: Executa verificações específicas
3. **Feedback**: Reporta descobertas diretamente no PR

---

## 🚀 Configuração

### Importação

```typescript
import { googleChatNotificationPlugin } from "@felipeduarte26/danger-bot";
```

### Uso Básico

```typescript
// dangerfile.ts
import { googleChatNotificationPlugin, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot([
  googleChatNotificationPlugin, // Habilitado por padrão
]);
```

### Personalização

```typescript
// Desabilitar o plugin
googleChatNotificationPlugin.config.enabled = false;

// Modificar configuração
googleChatNotificationPlugin.config.description = "Minha descrição customizada";
```

---

## 📊 Exemplos de Saída

### ✅ Quando tudo está OK

```
✅ Google Chat Notification: Todas as verificações passaram!
```

### ⚠️ Quando problemas são encontrados

```
⚠️ Google Chat Notification: Verificação detectou problemas

[Mensagem de aviso detalhada]
```

### ❌ Quando há erros críticos

```
❌ Google Chat Notification: Erro crítico detectado

[Descrição do erro e sugestão de correção]
```

---

## 🎨 Boas Práticas

- Siga as recomendações do plugin
- Mantenha o código limpo e manutenível
- Documente suas mudanças adequadamente
- Revise o feedback antes de fazer merge

---

## 🔧 Opções Avançadas

### Configuração Condicional

```typescript
// Habilitar apenas para branches específicas
const d = getDanger();
const isMainBranch = d.github?.pr?.base?.ref === "main";

if (isMainBranch) {
  googleChatNotificationPlugin.config.enabled = true;
}
```

### Integração com Outros Plugins

```typescript
import {
  googleChatNotificationPlugin,
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  executeDangerBot
} from "@felipeduarte26/danger-bot";

executeDangerBot([
  prSizeCheckerPlugin,
  googleChatNotificationPlugin,
  changelogCheckerPlugin,
]);
```

---

## 🌍 Plataformas Suportadas

| Plataforma | Status |
|------------|--------|
| GitHub | ✅ Suportado |
| Bitbucket Cloud | ✅ Suportado |
| Bitbucket Server | ✅ Suportado |
| GitLab | ✅ Suportado |

---

## 📦 Dependências

| Pacote | Versão | Uso |
|--------|--------|-----|
| `danger` | ^13.0.0 | Framework base (peer dependency) |
| `@felipeduarte26/danger-bot` | latest | Helpers e tipos |

---

## 🔗 Plugins Relacionados

- [`pr-size-checker`](../pr-size-checker/README.md) - Validação de tamanho de PR
- [`changelog-checker`](../changelog-checker/README.md) - Validação de CHANGELOG
- [`flutter-analyze`](../flutter-analyze/README.md) - Análise estática Flutter
- [`spell-checker`](../spell-checker/README.md) - Verificação ortográfica

---

## 📚 Recursos Adicionais

- [Documentação Completa](../../docs/README.md)
- [Guia de Plugins](../../docs/GUIA_PLUGINS.md)
- [API Reference](../../docs/API.md)
- [Exemplos](../../docs/EXEMPLOS.md)

---

## 🐛 Problemas Conhecidos

Nenhum problema conhecido no momento.

---

## 💡 Dicas

- Execute o plugin localmente antes de fazer push: `npm run danger:local`
- Use o CLI para validar: `danger-bot validate src/plugins/google-chat-notification/google-chat-notification.ts`
- Combine com outros plugins para máxima cobertura

---

## 📝 Notas

**Nota**: Esta documentação é gerada automaticamente pelo CLI do Danger Bot. Atualize conforme necessário para refletir funcionalidades específicas do seu plugin.

---

<div align="center">

**[Danger Bot](https://github.com/felipeduarte26/danger-bot)**

[![Danger Bot](https://img.shields.io/badge/Danger-Bot-success)](https://github.com/felipeduarte26/danger-bot)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

</div>
