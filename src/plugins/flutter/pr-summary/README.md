# PR Summary Plugin

Plugin que cria um sumário consolidado no topo da Pull Request com estatísticas e overview.

## 📋 Descrição

Gera automaticamente um comentário no topo da PR com estatísticas consolidadas sobre arquivos alterados, linhas de código, e tamanho geral da PR. Facilita a revisão rápida e oferece uma visão geral antes de mergulhar nos detalhes.

## ✨ Funcionalidades

- 📊 **Sumário Visual**: Exibe estatísticas da PR de forma organizada
- 🎯 **Classificação de Tamanho**: Indica se a PR é pequena, média, grande ou muito grande
- 📁 **Contagem de Arquivos**: Mostra arquivos criados, modificados e deletados
- 📏 **Linhas de Código**: Contabiliza inserções e deleções
- 🎨 **Emojis Visuais**: Usa cores (🟢🟡🟠🔴) para indicar o tamanho da PR
- 🎯 **Foco em Dart**: Destaca quantidade de arquivos Dart alterados

## 📦 Instalação

```typescript
import { prSummaryPlugin } from '@diletta/danger-bot';
import { executeDangerBot } from '@diletta/danger-bot';

// Sumário deve ser o primeiro plugin para aparecer no topo
executeDangerBot([
  prSummaryPlugin,
  // ... outros plugins
]);
```

## ⚙️ Configuração

### Exemplo Básico (Recomendado)

```typescript
import { allFlutterPlugins, executeDangerBot } from '@diletta/danger-bot';

// O prSummaryPlugin já está incluído no allFlutterPlugins
// e é automaticamente executado primeiro
executeDangerBot(allFlutterPlugins);
```

### Exemplo: Apenas Sumário

```typescript
import { prSummaryPlugin, executeDangerBot } from '@diletta/danger-bot';

executeDangerBot([prSummaryPlugin]);
```

### Exemplo: Ordem Customizada

```typescript
import { 
  prSummaryPlugin,
  flutterAnalyzePlugin,
  spellCheckerPlugin,
  executeDangerBot
} from '@diletta/danger-bot';

// Sumário sempre no topo
executeDangerBot([
  prSummaryPlugin,  // ⬅️ Primeiro para aparecer no topo
  flutterAnalyzePlugin,
  spellCheckerPlugin
]);
```

## 📊 Exemplo de Sumário Gerado

### PR Pequena (Ideal)

```markdown
## 📊 SUMÁRIO DA PR

🟢 **Tamanho:** PR pequena (ideal)

### 📁 Arquivos Alterados

- **Total:** 3 arquivo(s)
- ✅ Criados: 1
- ✏️ Modificados: 2
- ❌ Deletados: 0
- 🎯 Arquivos Dart: 3

### 📏 Linhas de Código

- **Total:** 45 linha(s) alterada(s)
- ➕ Adicionadas: 38
- ➖ Removidas: 7

---

📝 **Análise detalhada abaixo...**
```

### PR Média

```markdown
## 📊 SUMÁRIO DA PR

🟡 **Tamanho:** PR média

### 📁 Arquivos Alterados

- **Total:** 8 arquivo(s)
- ✅ Criados: 3
- ✏️ Modificados: 5
- ❌ Deletados: 0
- 🎯 Arquivos Dart: 7

### 📏 Linhas de Código

- **Total:** 150 linha(s) alterada(s)
- ➕ Adicionadas: 120
- ➖ Removidas: 30

---

📝 **Análise detalhada abaixo...**
```

### PR Grande

```markdown
## 📊 SUMÁRIO DA PR

🟠 **Tamanho:** PR grande

### 📁 Arquivos Alterados

- **Total:** 15 arquivo(s)
- ✅ Criados: 8
- ✏️ Modificados: 7
- ❌ Deletados: 0
- 🎯 Arquivos Dart: 12

### 📏 Linhas de Código

- **Total:** 450 linha(s) alterada(s)
- ➕ Adicionadas: 380
- ➖ Removidas: 70

---

📝 **Análise detalhada abaixo...**
```

### PR Muito Grande (Crítico)

```markdown
## 📊 SUMÁRIO DA PR

🔴 **Tamanho:** PR muito grande

### 📁 Arquivos Alterados

- **Total:** 35 arquivo(s)
- ✅ Criados: 20
- ✏️ Modificados: 15
- ❌ Deletados: 0
- 🎯 Arquivos Dart: 30

### 📏 Linhas de Código

- **Total:** 850 linha(s) alterada(s)
- ➕ Adicionadas: 720
- ➖ Removidas: 130

---

📝 **Análise detalhada abaixo...**
```

## 🎯 Classificação de Tamanho

O plugin classifica automaticamente o tamanho da PR com base no total de linhas alteradas:

| Linhas | Emoji | Classificação | Recomendação |
|--------|-------|---------------|--------------|
| 0 | ⚪ | Sem alterações | Verificar se a PR está correta |
| 1-80 | 🟢 | PR pequena (ideal) | ✅ Tamanho perfeito para revisão |
| 81-200 | 🟡 | PR média | ✅ Tamanho aceitável |
| 201-600 | 🟠 | PR grande | ⚠️ Considere quebrar em PRs menores |
| 600+ | 🔴 | PR muito grande | 🚨 Forte recomendação de quebrar |

## 💡 Por que usar este plugin?

### Benefícios para Revisores

1. **Visão Geral Imediata**: Veja o tamanho da PR antes de começar a revisar
2. **Planejamento de Tempo**: Estime quanto tempo levará a revisão
3. **Priorização**: Identifique PRs pequenas para revisão rápida
4. **Contexto Visual**: Emojis coloridos facilitam identificação rápida

### Benefícios para Autores

1. **Feedback Instantâneo**: Saiba se a PR está muito grande
2. **Autoavaliação**: Identifique oportunidades de quebrar a PR
3. **Transparência**: Mostre claramente o escopo da mudança
4. **Estatísticas**: Veja exatamente quantos arquivos e linhas foram alterados

### Benefícios para o Time

1. **Padronização**: Todas as PRs têm o mesmo formato de sumário
2. **Métricas**: Acompanhe o tamanho médio das PRs ao longo do tempo
3. **Cultura de PRs Pequenas**: Incentiva PRs menores e mais focadas
4. **Documentação Visual**: Estatísticas ficam registradas no histórico

## 📝 Boas Práticas

### Ordem de Plugins

```typescript
// ✅ CORRETO: Sumário no topo
executeDangerBot([
  prSummaryPlugin,        // 1º - Aparece no topo
  flutterAnalyzePlugin,   // 2º
  spellCheckerPlugin      // 3º
]);

// ❌ ERRADO: Sumário no meio/final
executeDangerBot([
  flutterAnalyzePlugin,
  prSummaryPlugin,        // ❌ Vai aparecer depois
  spellCheckerPlugin
]);
```

### Interpretando o Sumário

**🟢 PR Pequena (ideal)**
- Revisão rápida (5-15 minutos)
- Fácil de entender o contexto
- Menor risco de bugs

**🟡 PR Média**
- Revisão moderada (15-30 minutos)
- Contexto claro mas requer atenção
- Risco controlado

**🟠 PR Grande**
- Revisão demorada (30-60 minutos)
- Considere quebrar em partes menores
- Maior risco de bugs passarem despercebidos

**🔴 PR Muito Grande**
- Revisão muito demorada (60+ minutos)
- **Forte recomendação de quebrar**
- Alto risco de bugs e problemas
- Dificulta o processo de revisão

### Dicas para PRs Menores

Se o sumário mostrar 🟠 ou 🔴, considere:

1. **Quebrar por Feature**
   - PR 1: Backend/Data Layer
   - PR 2: Domain Layer
   - PR 3: Presentation Layer
   - PR 4: UI/Widgets

2. **Quebrar por Tipo**
   - PR 1: Novos arquivos/estrutura
   - PR 2: Lógica de negócio
   - PR 3: Testes
   - PR 4: Documentação

3. **Quebrar por Módulo**
   - PR 1: Módulo de Autenticação
   - PR 2: Módulo de Produtos
   - PR 3: Módulo de Carrinho

## 🚀 Integração com Outros Plugins

### Combinação com PR Validation

```typescript
import { 
  prSummaryPlugin,
  prValidationPlugin,
  executeDangerBot
} from '@diletta/danger-bot';

// Sumário + validação detalhada
executeDangerBot([
  prSummaryPlugin,        // Estatísticas no topo
  prValidationPlugin      // Validações detalhadas depois
]);
```

**Resultado:** Sumário mostra overview, e PR Validation detalha cada problema.

### Stack Completo de Revisão

```typescript
import { allFlutterPlugins, executeDangerBot } from '@diletta/danger-bot';

// Ordem otimizada para melhor UX
executeDangerBot(allFlutterPlugins);

// O allFlutterPlugins já inclui:
// 1. prSummaryPlugin      ← Sumário no topo
// 2. prValidationPlugin   ← Validações
// 3. flutterAnalyzePlugin ← Análise de código
// 4. spellCheckerPlugin   ← Ortografia
// 5. ... todos os outros
```

## 🔧 Troubleshooting

### Problema: Sumário não aparece no topo

**Causa:** Plugin não está na primeira posição do array.

**Solução:**

```typescript
// ✅ Correto
executeDangerBot([
  prSummaryPlugin,  // Primeiro!
  // ... outros
]);
```

### Problema: Contagem de linhas mostra 0

**Causa:** PR pode conter apenas arquivos binários ou repositório não tem commits.

**Solução:** Isso é esperado. O sumário mostrará:

```markdown
⚪ **Tamanho:** Sem alterações de código
```

### Problema: Arquivos Dart diferente do total

**Causa:** PR contém arquivos não-Dart (yaml, json, etc.).

**Solução:** Isso é correto! O sumário mostra:
- **Total:** Todos os arquivos
- **Arquivos Dart:** Apenas `.dart`

## 📚 Referências

- [Danger JS Documentation](https://danger.systems/js/)
- [Best Practices for Code Review](https://google.github.io/eng-practices/review/)
- [The Art of Small Pull Requests](https://essenceofcode.com/2019/10/29/the-art-of-small-pull-requests/)

## 📊 Métricas e KPIs

Use o sumário para acompanhar métricas do time:

1. **Tamanho Médio de PR**: Objetivo < 200 linhas
2. **% de PRs Pequenas**: Meta > 70% 🟢
3. **% de PRs Críticas**: Meta < 5% 🔴
4. **Tempo Médio de Revisão**: Correlaciona com tamanho

## 📄 Licença

MIT

## 🤝 Contribuindo

Sugestões de melhorias:
- Adicionar métricas de complexidade ciclomática
- Integrar com tempo estimado de revisão
- Adicionar gráficos históricos
- Comparação com PRs anteriores


