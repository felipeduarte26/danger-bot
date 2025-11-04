# PR Validation Plugin

Plugin de validação de Pull Requests para garantir qualidade e documentação adequada.

## 📋 Descrição

Valida aspectos essenciais de uma Pull Request antes do merge, garantindo que todas as mudanças sejam adequadamente documentadas e organizadas.

## ✨ Funcionalidades

- ✅ **Descrição Obrigatória**: Garante descrição mínima da PR (padrão: 15 caracteres)
- ✅ **Changelog Obrigatório**: Verifica se o changelog foi criado/atualizado
- ✅ **Controle de Tamanho**: Alerta sobre PRs muito grandes (>180 arquivos .dart)
- ✅ **Sincronização Pubspec**: Detecta inconsistências entre pubspec.yaml e pubspec.lock
- ✅ **Métricas de Código**: Contagem de linhas alteradas

## 📦 Instalação

```typescript
import { prValidation } from '@danger-bot/flutter';

export default async () => {
  await prValidation()();
};
```

## ⚙️ Configuração

### Opções Disponíveis

```typescript
interface PRValidationOptions {
  minDescriptionLength?: number;  // Padrão: 15
  maxDartFiles?: number;          // Padrão: 180
  requireChangelog?: boolean;      // Padrão: true
}
```

### Exemplo Básico

```typescript
import { prValidation } from '@danger-bot/flutter';

export default async () => {
  // Usar configuração padrão
  await prValidation()();
};
```

### Exemplo Avançado

```typescript
import { prValidation } from '@danger-bot/flutter';

export default async () => {
  // Configuração personalizada
  await prValidation({
    minDescriptionLength: 30,    // Exigir descrição mais longa
    maxDartFiles: 100,            // Limite mais restritivo
    requireChangelog: true        // Changelog obrigatório
  })();
};
```

### Exemplo: Sem Changelog

```typescript
import { prValidation } from '@danger-bot/flutter';

export default async () => {
  // Para projetos que não usam changelog
  await prValidation({
    minDescriptionLength: 20,
    requireChangelog: false  // Desabilita verificação de changelog
  })();
};
```

## 📊 Verificações Realizadas

### 1. Descrição da PR

**O que verifica:**
- Comprimento mínimo da descrição
- Presença de informações essenciais

**Exemplo de mensagem:**

```markdown
## 📝 DESCRIÇÃO DE PR INSUFICIENTE

A descrição do Pull Request está muito curta (5 caracteres, mínimo 15).

### ⚠️ Problema Identificado
Descrições curtas dificultam a revisão e compreensão das mudanças.

### 🎯 AÇÃO NECESSÁRIA
- Explique o contexto da mudança
- Descreva o que foi implementado
- Mencione o impacto no sistema
- Liste breaking changes
```

### 2. Changelog

**O que verifica:**
- Existência do arquivo changelog.md
- Atualização do changelog na PR

**Níveis de severidade:**
- 🔴 **FAIL**: Changelog não existe no projeto
- 🔴 **FAIL**: Changelog existe mas não foi atualizado

### 3. Sincronização Pubspec

**O que verifica:**
- pubspec.lock modificado sem pubspec.yaml
- Indica possíveis inconsistências de dependências

**Exemplo de problema detectado:**

```markdown
## 📦 PUBSPEC.LOCK MODIFICADO SEM PUBSPEC.YAML

Situação:
✅ pubspec.lock foi modificado
❌ pubspec.yaml não foi alterado

Ação: Execute `flutter pub get` localmente
```

### 4. Tamanho da PR

**Métricas analisadas:**
- Número de arquivos .dart alterados
- Total de linhas modificadas (inserções + deleções)

**Limites:**

| Arquivos Dart | Severidade | Ação |
|---------------|-----------|------|
| 0-60 | ✅ Ideal | Nenhuma |
| 61-80 | ⚠️ Médio | Aviso informativo |
| 81-180 | ⚠️ Grande | Recomendação de quebrar |
| 180+ | 🚨 Crítico | Forte recomendação de quebrar |

**Exemplo de alerta:**

```markdown
## 🚨 PR CRÍTICA - MUITOS ARQUIVOS DART

Esta PR alterou 250 arquivos .dart!

### Sugestão
Quebrar em 7 PRs menores (30-40 arquivos cada):
1. Refatoração de Models
2. Novos UseCases
3. ViewModels e States
4. UI e Widgets
5. Testes
```

## 🎯 Casos de Uso

### Projeto com Changelog Obrigatório

```typescript
import { prValidation } from '@danger-bot/flutter';

export default async () => {
  await prValidation({
    minDescriptionLength: 50,
    maxDartFiles: 120,
    requireChangelog: true
  })();
};
```

### Projeto sem Changelog

```typescript
import { prValidation } from '@danger-bot/flutter';

export default async () => {
  await prValidation({
    minDescriptionLength: 30,
    requireChangelog: false  // Desabilita verificação
  })();
};
```

### Equipe Grande (PRs Menores)

```typescript
import { prValidation } from '@danger-bot/flutter';

export default async () => {
  await prValidation({
    minDescriptionLength: 20,
    maxDartFiles: 60,  // Limite mais restritivo
    requireChangelog: true
  })();
};
```

## 📝 Boas Práticas

### Template de Descrição de PR

```markdown
## 🔍 Contexto
Por que essa mudança foi necessária?

## 🛠️ Mudanças Implementadas
- Lista das principais alterações
- Novos arquivos/funcionalidades
- Refatorações realizadas

## 💥 Impacto
- Como afeta usuários/sistema
- Breaking changes (se houver)
- Migrações necessárias

## 🧪 Testes
- Testes unitários
- Testes de integração
- Testes manuais realizados

## 📸 Screenshots (se aplicável)
Capturas de tela das mudanças visuais
```

### Boas Práticas de Changelog

1. **Use categorias claras**: `Added`, `Changed`, `Fixed`, `Security`
2. **Seja descritivo**: Explique o que mudou e por quê
3. **Mantenha cronológico**: Mais recente no topo
4. **Use Semantic Versioning**: Major.Minor.Patch

### Exemplo de Changelog Bem Mantido

```markdown
# Changelog

## [Unreleased]

### Added
- ✨ Nova tela de perfil do usuário com edição
- ✨ Suporte a tema escuro em todo o app

### Changed
- ⚡ Melhorada performance da lista (50% mais rápido)
- 🎨 Redesenhada interface da tela inicial

### Fixed
- 🐛 Corrigido crash ao fazer logout
- 🐛 Corrigido vazamento de memória na galeria

## [1.2.0] - 2024-01-15

### Added
- Autenticação biométrica (iOS e Android)
```

## 🔧 Troubleshooting

### Problema: "Descrição muito curta" mas a descrição está adequada

**Causa**: Contador de caracteres pode incluir espaços/quebras de linha.

**Solução**: Ajuste `minDescriptionLength` conforme necessário:

```typescript
await prValidation({
  minDescriptionLength: 10  // Mais permissivo
})();
```

### Problema: Changelog não detectado

**Causa**: Nome do arquivo diferente do esperado.

**Solução**: O plugin busca por:
- `changelog.md`
- `CHANGELOG.md`

Certifique-se de usar um desses nomes exatos.

### Problema: Muitos alertas de tamanho

**Causa**: PR realmente está muito grande.

**Solução**: Considere quebrar a PR em partes menores. PRs grandes:
- São difíceis de revisar
- Têm maior chance de bugs
- Demoram mais para serem aprovadas

## 🚀 Integração com Outros Plugins

### Combinação Recomendada

```typescript
import { 
  prValidation,
  changelogChecker,
  spellChecker 
} from '@danger-bot/flutter';

export default async () => {
  // Validação geral da PR
  await prValidation({
    minDescriptionLength: 30,
    maxDartFiles: 100,
    requireChangelog: true
  })();
  
  // Verificações adicionais
  await changelogChecker()();
  await spellChecker()();
};
```

## 📚 Referências

- [Keep a Changelog](https://keepachangelog.com/) - Guia de boas práticas para changelogs
- [Semantic Versioning](https://semver.org/) - Versionamento semântico
- [Conventional Commits](https://www.conventionalcommits.org/) - Padrão de mensagens de commit

## 📄 Licença

MIT

