# 🔌 Presentation Try Catch Checker

> Detecta uso de try-catch na camada Presentation

---

## 📋 Visão Geral

Este plugin do Danger Bot ajuda a manter:
- ✅ Qualidade do código
- ✅ Boas práticas
- ✅ Consistência no projeto

---

## 🎯 Objetivo

Detecta uso de try-catch na camada Presentation

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
import { presentationTryCatchCheckerPlugin } from "@felipeduarte26/danger-bot";
```

### Uso Básico

```typescript
// dangerfile.ts
import { presentationTryCatchCheckerPlugin, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot([
  presentationTryCatchCheckerPlugin, // Habilitado por padrão
]);
```

### Personalização

```typescript
// Desabilitar o plugin
presentationTryCatchCheckerPlugin.config.enabled = false;

// Modificar configuração
presentationTryCatchCheckerPlugin.config.description = "Minha descrição customizada";
```

---

## 📊 Exemplos de Saída

### ✅ Quando tudo está OK

```
✅ Presentation Try Catch Checker: Todas as verificações passaram!
```

### ⚠️ Quando problemas são encontrados

```
⚠️ Presentation Try Catch Checker: Verificação detectou problemas

[Mensagem de aviso detalhada]
```

### ❌ Quando há erros críticos

```
❌ Presentation Try Catch Checker: Erro crítico detectado

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
  presentationTryCatchCheckerPlugin.config.enabled = true;
}
```

### Integração com Outros Plugins

```typescript
import {
  presentationTryCatchCheckerPlugin,
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  executeDangerBot
} from "@felipeduarte26/danger-bot";

executeDangerBot([
  prSizeCheckerPlugin,
  presentationTryCatchCheckerPlugin,
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
- Use o CLI para validar: `danger-bot validate src/plugins/presentation-try-catch-checker/presentation-try-catch-checker.ts`
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
