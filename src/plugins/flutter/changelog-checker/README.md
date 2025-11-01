# 📄 Changelog Checker

## 📋 Visão Geral

Garante que o arquivo CHANGELOG.md seja atualizado sempre que mudanças significativas de código forem feitas no projeto.

---

## 🎯 Objetivo

Manter um CHANGELOG atualizado é crucial para:

- 📚 Rastrear mudanças do projeto ao longo do tempo
- 💬 Comunicar atualizações para usuários e desenvolvedores
- ⚠️ Documentar breaking changes
- 🏷️ Facilitar o gerenciamento de versões

---

## ⚙️ Como Funciona

O plugin verifica se:

1. ✅ Arquivos de código significativos foram modificados ou criados
2. ✅ O arquivo CHANGELOG.md também foi atualizado

Se mudanças de código forem detectadas sem atualização do CHANGELOG, um aviso é emitido.

---

## 📁 Arquivos Considerados Significativos

### ✅ Incluídos

```
.dart    # Arquivos Dart
.ts      # TypeScript
.js      # JavaScript  
.tsx     # React TypeScript
.jsx     # React JavaScript
```

### ❌ Ignorados

```
.test.       # Arquivos de teste
.spec.       # Specs
_test.dart   # Testes Dart
.md          # Documentação
.txt         # Texto
.json        # Configuração
.yaml, .yml  # Configuração
test/        # Diretórios de teste
tests/
__tests__/
```

---

## 🚀 Configuração

### Uso Básico

```typescript
import { changelogCheckerPlugin } from "@diletta/danger-bot";

const plugins = [
  changelogCheckerPlugin,  // Habilitado por padrão
];
```

### Desabilitar

```typescript
changelogCheckerPlugin.config.enabled = false;
```

---

## 📊 Exemplo de Saída

### ⚠️ Quando CHANGELOG precisa ser atualizado

```
📝 CHANGELOG não atualizado

Este PR modifica 5 arquivo(s) de código.

Por favor, atualize o CHANGELOG.md com:
- Resumo das mudanças
- Impacto para usuários/desenvolvedores
- Breaking changes (se houver)

Arquivos modificados:
- lib/features/auth/login.dart
- lib/core/services/api_service.dart
- lib/utils/validators.dart
```

---

## 📝 Formato Recomendado do CHANGELOG

### Estrutura Padrão

```markdown
## [Não Lançado]

### ✨ Adicionado
- Nova funcionalidade X
- Nova funcionalidade Y

### 🔄 Modificado
- Comportamento alterado de Z

### 🐛 Corrigido
- Bug corrigido na issue #123

### 💥 Breaking Changes
- Endpoint da API /old renomeado para /new
```

### Exemplo Completo

```markdown
# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [Não Lançado]

### ✨ Adicionado
- Sistema de autenticação com JWT
- Cache Redis para melhor performance
- Testes unitários para serviços principais

### 🔄 Modificado
- Migrado de REST para GraphQL
- Atualizado Flutter para versão 3.16

### 🐛 Corrigido
- Correção de memory leak no auth service
- Fix em validação de formulários

### 💥 Breaking Changes
- API antiga v1 foi removida, use v2

## [1.2.0] - 2024-01-15

### ✨ Adicionado
- Suporte para dark mode
- Exportação de relatórios em PDF
```

---

## 💡 Boas Práticas

### ✅ Recomendado

- ✅ Atualizar CHANGELOG a cada mudança significativa
- ✅ Usar entradas claras e descritivas
- ✅ Incluir números de issues/PRs quando relevante
- ✅ Separar entradas por tipo (Adicionado, Modificado, Corrigido, etc)
- ✅ Documentar breaking changes com destaque

### ❌ Evitar

- ❌ Commits sem atualizar CHANGELOG
- ❌ Descrições vagas ou genéricas
- ❌ Misturar diferentes tipos de mudanças
- ❌ Esquecer de documentar breaking changes

---

## 🎨 Categorias Sugeridas

| Emoji | Categoria | Uso |
|-------|-----------|-----|
| ✨ | **Adicionado** | Novas funcionalidades |
| 🔄 | **Modificado** | Mudanças em funcionalidades existentes |
| 🐛 | **Corrigido** | Correções de bugs |
| 🗑️ | **Removido** | Funcionalidades removidas |
| 💥 | **Breaking Changes** | Mudanças incompatíveis |
| 🔒 | **Segurança** | Correções de vulnerabilidades |
| 📝 | **Documentação** | Apenas mudanças em docs |
| ⚡ | **Performance** | Melhorias de performance |

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

- [pr-size-checker](../pr-size-checker/README.md) - Valida tamanho do PR
- [flutter-architecture](../flutter-architecture/README.md) - Valida arquitetura

---

<div align="center">

**Mantenha seu histórico de mudanças sempre atualizado! 📝**

</div>
