# 🔌 Column Row Spacing

> Sugere uso da propriedade `spacing` (Flutter 3.27+) em `Column` e `Row` no lugar de `SizedBox` intercalados entre os filhos.

---

## 📋 Visão Geral

Este plugin do Danger Bot ajuda a manter:

- ✅ Uso de APIs recentes do Flutter quando o padrão de layout é uniforme
- ✅ Listas de filhos mais legíveis (menos widgets “espacadores” explícitos)
- ✅ Feedback **somente como aviso** (`warn`) — não falha o build

---

## 🎯 Objetivo

A partir do **Flutter 3.27+**, `Column` e `Row` passaram a aceitar a propriedade [`spacing`](https://api.flutter.dev/flutter/widgets/Flex/spacing.html), que define o espaçamento **entre** os filhos. Este plugin detecta o padrão repetido de `SizedBox(height: …)` ou `SizedBox(width: …)` entre todos os filhos e sugere migrar para `spacing`, alinhado ao artigo [Spacing in Row and Column](https://codewithandrea.com/tips/spacing-row-column/).

O plugin analisa arquivos `.dart` modificados ou criados no Pull Request e comenta no PR quando a troca é segura de inferir.

---

## ⚙️ Como Funciona

1. **Análise**: Percorre `Column`/`Row` com `children: [ ... ]` nos arquivos do PR.
2. **Condições**: Só sugere quando **todos** os `SizedBox` entre filhos têm o **mesmo valor numérico literal** (ex.: sempre `8`), no padrão filho → `SizedBox` → filho → `SizedBox` → …
3. **Conservador**: Se houver variável, expressão, valores diferentes ou estrutura ambígua, **não reporta** (na dúvida, fica em silêncio).
4. **Feedback**: Usa `sendFormattedWarn` — **aviso**, não erro.

---

## 📝 Antes e depois

### Column com `SizedBox` uniforme

```dart
// ❌ Antes — vários SizedBox com o mesmo height
Column(
  children: [
    Text('A'),
    const SizedBox(height: 8),
    Text('B'),
    const SizedBox(height: 8),
    Text('C'),
  ],
)

// ✅ Depois — spacing (Flutter 3.27+)
Column(
  spacing: 8,
  children: [
    Text('A'),
    Text('B'),
    Text('C'),
  ],
)
```

### Row com `SizedBox` uniforme

```dart
// ❌ Antes
Row(
  children: [
    Icon(Icons.star),
    const SizedBox(width: 12),
    Text('Titulo'),
    const SizedBox(width: 12),
    Icon(Icons.more_vert),
  ],
)

// ✅ Depois
Row(
  spacing: 12,
  children: [
    Icon(Icons.star),
    Text('Titulo'),
    Icon(Icons.more_vert),
  ],
)
```

---

## 🚀 Configuração

### Importação

```typescript
import { columnRowSpacingPlugin } from "@felipeduarte26/danger-bot";
```

### Uso básico

```typescript
// dangerfile.ts
import { columnRowSpacingPlugin, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot([columnRowSpacingPlugin]);
```

O plugin também faz parte de `performancePlugins` e `allFlutterPlugins`.

### Personalização

```typescript
// Desabilitar o plugin
columnRowSpacingPlugin.config.enabled = false;

// Modificar descrição exibida na configuração
columnRowSpacingPlugin.config.description = "Minha descrição customizada";
```

---

## 📊 Exemplos de saída

### ✅ Quando nada é reportado

Não há comentário quando não há padrão uniforme de `SizedBox`, quando os valores diferem ou quando a análise não consegue garantir o padrão.

### ⚠️ Quando uma sugestão é enviada

Mensagem formatada no padrão Danger Bot (título, problema identificado, ação sugerida, link de referência), como **aviso** — o pipeline não falha por causa deste plugin.

---

## 🎨 Boas práticas

- Garanta **Flutter SDK ≥ 3.27** no projeto antes de aplicar `spacing` em massa.
- Prefira `spacing` quando **todo** o espaçamento entre filhos for igual; casos mistos continuam com `SizedBox` ou outros widgets.
- Revise o diff do PR: o plugin é heurístico e pode não cobrir layouts muito aninhados ou quebrados em múltiplas linhas de forma ambígua.

---

## 🔧 Opções avançadas

### Integração com outros plugins

```typescript
import { executeDangerBot, performancePlugins } from "@felipeduarte26/danger-bot";

executeDangerBot([...performancePlugins]); // flutter-performance, mediaquery-modern, column-row-spacing
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

| Pacote                     | Versão   | Uso                                |
| -------------------------- | -------- | ---------------------------------- |
| `danger`                   | ^13.0.0  | Framework base (peer dependency)   |
| `@felipeduarte26/danger-bot` | latest | Helpers e tipos                    |

---

## 🔗 Plugins relacionados

- [`flutter-performance`](../flutter-performance/README.md) — operações custosas no `build()`
- [`mediaquery-modern`](../mediaquery-modern/README.md) — APIs modernas do `MediaQuery`
- [`flutter-widgets`](../flutter-widgets/README.md) — ordem de métodos em widgets

---

## 📚 Recursos adicionais

- [Spacing in Row and Column — Code With Andrea](https://codewithandrea.com/tips/spacing-row-column/)
- [Guia de Plugins](../../../../docs/GUIA_PLUGINS.md)
- [API Reference](../../../../docs/API.md)

---

## 💡 Dicas

- Valide o plugin com: `danger-bot validate src/plugins/flutter/column-row-spacing/column-row-spacing.ts`
- Combine com `flutter-analyze` no CI para garantir que o SDK do projeto aceita `spacing`.

---

<div align="center">

**[Danger Bot](https://github.com/felipeduarte26/danger-bot)**

[![Danger Bot](https://img.shields.io/badge/Danger-Bot-success)](https://github.com/felipeduarte26/danger-bot)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

</div>
