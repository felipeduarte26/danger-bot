# 📏 PR Size Checker

## 📋 Visão Geral

Valida o tamanho dos Pull Requests e alerta quando estão muito grandes, ajudando a manter a qualidade nas revisões de código.

---

## 🎯 Objetivo

Pull Requests grandes são difíceis de revisar e mais propensos a bugs. Este plugin:

- ⚠️ Avisa quando PRs excedem limites recomendados
- 🎯 Incentiva PRs menores e mais focados
- ⚡ Melhora a eficiência das revisões de código
- 🐛 Reduz a probabilidade de bugs

---

## ⚙️ Como Funciona

O plugin analisa o número de adições e deleções no PR e fornece avisos baseados em limites configuráveis:

| Tamanho | Linhas Alteradas | Ação |
|---------|------------------|------|
| ✅ **Normal** | < 500 | Mensagem de sucesso |
| ⚠️ **Grande** | 500 - 1000 | Aviso |
| 🚨 **Muito Grande** | > 1000 | Aviso forte |

---

## 🚀 Configuração

### Uso Básico

```typescript
import { prSizeCheckerPlugin } from "@diletta/danger-bot";

const plugins = [
  prSizeCheckerPlugin,  // Habilitado por padrão
];
```

### Desabilitar

```typescript
prSizeCheckerPlugin.config.enabled = false;
```

---

## 📊 Exemplos de Saída

### ✅ PR Normal (< 500 linhas)

```
✅ Tamanho do PR: 234 linhas (OK)
```

### ⚠️ PR Grande (500-1000 linhas)

```
⚠️ PR Grande (678 linhas)

Este PR tem 456 adições e 222 deleções.

Considere revisar se pode ser dividido em partes menores.
```

### 🚨 PR Muito Grande (> 1000 linhas)

```
🚨 PR MUITO GRANDE (1.245 linhas)

Este PR tem 980 adições e 265 deleções.

Recomendação: Considere dividir em PRs menores para facilitar a revisão.

PRs menores são:
- ✅ Mais fáceis de revisar
- ✅ Menos propensos a bugs
- ✅ Mais rápidos para merge
```

---

## 💡 Boas Práticas

### ✅ Recomendado

- Manter PRs abaixo de 500 linhas quando possível
- Dividir funcionalidades grandes em múltiplos PRs
- Focar cada PR em uma única preocupação
- Usar feature flags para releases incrementais

### ❌ Evitar

- PRs com mais de 1000 linhas
- Misturar múltiplas funcionalidades
- Refatorações + novas features no mesmo PR
- Mudanças não relacionadas

---

## 🌐 Plataformas Suportadas

| Plataforma | Status |
|------------|--------|
| GitHub | ✅ |
| Bitbucket Cloud | ✅ |
| GitLab | ✅ |

---

## 📦 Dependências

Nenhuma - usa apenas APIs nativas do Danger JS.

---

## 🔗 Plugins Relacionados

- [changelog-checker](../changelog-checker/README.md) - Valida CHANGELOG
- [flutter-analyze](../flutter-analyze/README.md) - Análise estática de código

---

<div align="center">

**Mantenha seus PRs pequenos e suas revisões eficientes! 🚀**

</div>
