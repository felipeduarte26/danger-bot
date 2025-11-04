"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
/**
 * 📋 PR Validation Plugin
 *
 * Valida aspectos gerais de uma Pull Request para garantir qualidade e documentação adequada.
 */
exports.default = (0, _types_1.createPlugin)({
    name: 'pr-validation',
    description: 'Valida descrição, changelog e aspectos gerais do PR',
    enabled: true,
}, async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const minDescriptionLength = 15;
    const maxDartFiles = 180;
    const requireChangelog = true;
    // 1. VERIFICAR DESCRIÇÃO DO PR
    const prDescription = danger.github?.pr?.body || danger.bitbucket_cloud?.pr?.description || '';
    if (prDescription.length < minDescriptionLength) {
        (0, _types_1.sendFail)(`## 📝 DESCRIÇÃO DE PR INSUFICIENTE

A descrição do Pull Request está muito curta (**${prDescription.length} caracteres**, mínimo **${minDescriptionLength}**).

---

### ⚠️ Problema Identificado

Descrições curtas dificultam a revisão e compreensão das mudanças implementadas.

**📍 Descrição atual:**
\`\`\`
${prDescription || '(vazio)'}
\`\`\`

---

### 🎯 AÇÃO NECESSÁRIA

Melhore a descrição da PR incluindo:

| Item | Descrição |
|------|-----------|
| **🔍 Contexto** | Por que essa mudança foi necessária? |
| **🛠️ Mudanças** | Quais alterações foram implementadas? |
| **💥 Impacto** | Como isso afeta o sistema/usuários? |
| **⚡ Breaking Changes** | Lista de mudanças que quebram compatibilidade |

---

### 💡 Exemplo de Boa Descrição

\`\`\`markdown
## 🔍 Contexto
Usuários com emails longos não conseguiam fazer login devido a 
limitação no banco de dados (máximo 50 caracteres).

## 🛠️ Mudanças Implementadas
- ✅ Aumentei limite do campo email de 50 para 255 caracteres
- ✅ Adicionei migração do banco de dados (v1.2.3)
- ✅ Atualizei validações no frontend
- ✅ Adicionei testes para emails longos

## 💥 Impacto
- ✅ Usuários com emails longos agora conseguem fazer login
- ✅ Compatível com versões anteriores
- ⚠️ Requer execução de migração no deploy

## 🧪 Testes Realizados
- ✅ Login com emails de 100+ caracteres funcionando
- ✅ Login com emails curtos continua funcionando
- ✅ Validação de email mantida
- ✅ 15 testes unitários passando
\`\`\`

---

### 🚀 Objetivo

Facilitar revisão e documentar mudanças importantes para toda a equipe.

> **Dica:** Uma boa descrição economiza tempo de revisão e evita perguntas repetidas!`, 'README.md', 1);
    }
    // 2. VERIFICAR CHANGELOG OBRIGATÓRIO
    if (requireChangelog) {
        const changelogModified = git.modified_files.includes('changelog.md') ||
            git.modified_files.includes('CHANGELOG.md') ||
            git.created_files.includes('changelog.md') ||
            git.created_files.includes('CHANGELOG.md');
        if (!changelogModified) {
            const hasChangelog = [...git.modified_files, ...git.created_files, ...git.deleted_files]
                .some((f) => f.toLowerCase() === 'changelog.md');
            if (!hasChangelog) {
                (0, _types_1.sendFail)(`## 📋 CHANGELOG.MD NÃO ENCONTRADO

Este projeto **não possui** um arquivo \`changelog.md\`.

---

### ⚠️ Problema Identificado

Sem changelog, mudanças ficam **sem rastreabilidade** e **comunicação** entre a equipe.

**Consequências:**
- ❌ Dificulta rollback seguro
- ❌ Desenvolvedores não sabem histórico de mudanças
- ❌ Usuários não sabem o que foi corrigido/adicionado
- ❌ Dificulta debug de problemas introduzidos

---

### 🎯 AÇÃO NECESSÁRIA

**Passos para criar o changelog:**

1. **Crie** o arquivo \`changelog.md\` na raiz do projeto
2. **Use** formato padrão: [Keep a Changelog](https://keepachangelog.com/)
3. **Documente** mudanças a partir desta PR
4. **Mantenha** atualizado em cada PR futura

---

### 💡 Template do Changelog

\`\`\`markdown
# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/),
e este projeto adere ao [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Nova tela de configurações do usuário
- Suporte a tema escuro
- Integração com notificações push

### Changed  
- Melhorada performance da lista de produtos (30% mais rápido)
- Atualizada biblioteca HTTP para v5.0

### Fixed
- Corrigido bug no login com Gmail
- Corrigido crash ao abrir app sem internet
- Corrigido vazamento de memória na tela de produtos

### Security
- Atualizada dependência com vulnerabilidade CVE-2024-XXXX

## [1.2.0] - 2024-01-15

### Added
- Sistema de autenticação biométrica (iOS e Android)
- Export de relatórios em PDF

### Fixed
- Corrigido vazamento de memória na tela de produtos
\`\`\`

---

### 🚀 Objetivo

Manter **histórico completo** e **comunicação clara** das mudanças para toda equipe.

> **Referência:** [Keep a Changelog](https://keepachangelog.com/) - Guia completo de boas práticas`, 'changelog.md', 1);
            }
            else {
                (0, _types_1.sendFail)(`## 📋 CHANGELOG OBRIGATÓRIO - ATUALIZAÇÃO NECESSÁRIA

Esta PR **não inclui** alterações no \`changelog.md\` existente.

---

### ⚠️ Problema Identificado

PR com mudanças mas sem documentação no changelog deixa usuários e desenvolvedores sem saber o que foi alterado.

**📊 Situação atual:**
- ✅ \`changelog.md\` existe no projeto  
- ❌ \`changelog.md\` **não foi modificado** nesta PR

---

### 🎯 AÇÃO NECESSÁRIA

**Passos para atualizar:**

1. **Abra** o arquivo \`changelog.md\` na raiz do projeto
2. **Localize** a seção \`## [Unreleased]\`
3. **Adicione** as mudanças desta PR nas categorias apropriadas
4. **Use** as categorias: \`Added\`, \`Fixed\`, \`Changed\`, \`Security\`

---

### 💡 Exemplo de Atualização

\`\`\`markdown
## [Unreleased]

### Added
- ✨ Nova tela de perfil do usuário
- ✨ Validação de CPF no formulário de cadastro
- ✨ Suporte a upload de múltiplas imagens

### Fixed
- 🐛 Corrigido crash ao fazer logout
- 🐛 Corrigido bug de validação de email
- 🐛 Corrigido layout quebrado em tablets

### Changed
- ⚡ Melhorada performance da busca (50% mais rápido)
- 🎨 Atualizada UI dos botões principais
- 📦 Atualizada dependência X para v2.0

### Security
- 🔒 Corrigida vulnerabilidade no endpoint de login
\`\`\`

---

### 🚀 Objetivo

Manter histórico claro das mudanças para **usuários** e **desenvolvedores**.

> **Lembre-se:** Cada PR deve documentar suas mudanças no changelog!`, 'changelog.md', 1);
            }
        }
    }
    // 3. VERIFICAR SINCRONIZAÇÃO PUBSPEC
    const pubspecYamlChanged = git.modified_files.includes('pubspec.yaml');
    const pubspecLockChanged = git.modified_files.includes('pubspec.lock');
    if (pubspecLockChanged && !pubspecYamlChanged) {
        (0, _types_1.sendFail)(`## 📦 PUBSPEC.LOCK MODIFICADO SEM PUBSPEC.YAML

O arquivo \`pubspec.lock\` foi alterado **sem mudanças** correspondentes no \`pubspec.yaml\`.

---

### ⚠️ Problema Identificado

Isso pode indicar:
- 🔄 Dependências desatualizadas
- ⚠️ Conflitos de versão entre ambientes
- 🐛 Inconsistência na resolução de dependências

**📊 Situação encontrada:**
- ✅ \`pubspec.lock\` foi modificado
- ❌ \`pubspec.yaml\` **não foi alterado**

---

### 🎯 AÇÃO NECESSÁRIA

**Passos para sincronizar:**

1. **Execute** localmente:
   \`\`\`bash
   flutter pub get
   \`\`\`

2. **Verifique** se o lock gerado é o mesmo da PR:
   \`\`\`bash
   git diff pubspec.lock
   \`\`\`

3. **Se diferente**: Commite a versão local atualizada
4. **Se igual**: Ignore - pode ser diferença de plataforma/cache

---

### 💡 Fluxo Correto

\`\`\`bash
# 1️⃣ Atualizar dependências localmente
flutter pub get

# 2️⃣ Verificar se houve mudanças
git status
git diff pubspec.lock

# 3️⃣ Se houver diferenças, comitar
git add pubspec.lock
git commit -m "chore: sincroniza pubspec.lock"

# 4️⃣ Push para a PR
git push
\`\`\`

---

### 🚀 Objetivo

Manter **dependências consistentes** entre todos os ambientes de desenvolvimento.

> **Importante:** Sempre execute \`flutter pub get\` após pull de mudanças!`, 'pubspec.lock', 1);
    }
    // 4. VERIFICAR TAMANHO DA PR (ARQUIVOS DART)
    const dartFiles = git.modified_files
        .concat(git.created_files)
        .concat(git.deleted_files)
        .filter((file) => file.endsWith('.dart'));
    if (dartFiles.length > maxDartFiles) {
        const suggestedPRs = Math.ceil(dartFiles.length / 40);
        (0, _types_1.sendWarn)(`## 🚨 PR CRÍTICA - MUITOS ARQUIVOS DART

Esta PR alterou **${dartFiles.length} arquivos .dart**!

---

### ⚠️ Problema Identificado

PRs com mais de **${maxDartFiles} arquivos** Dart são:
- 😰 Extremamente difíceis de revisar
- 🐛 Maior probabilidade de bugs passarem
- ⏰ Demoram muito para serem aprovadas
- 🔀 Mais conflitos de merge

**📊 Análise:**
- Arquivos alterados: **${dartFiles.length}**
- Limite recomendado: **${maxDartFiles}**
- Sugestão: Quebrar em **${suggestedPRs} PRs** menores

---

### 🎯 AÇÃO NECESSÁRIA

**Como quebrar esta PR:**

1. **Identifique** grupos lógicos de mudanças
2. **Separe** por feature, módulo ou camada
3. **Crie** PRs menores (30-40 arquivos cada)
4. **Ordene** por dependência (base → features)

---

### 💡 Exemplo de Quebra

\`\`\`
📦 PR Original: 200 arquivos
   └─ ❌ Difícil revisar, muitos conflitos

Quebrar em 5 PRs menores:

1️⃣ PR: Refatoração de Models (40 arquivos)
   ├─ Base para outras mudanças
   └─ ✅ Fácil revisar

2️⃣ PR: Novos UseCases e Repositories (35 arquivos) 
   ├─ Depende da PR 1
   └─ ✅ Contexto claro

3️⃣ PR: ViewModels e States (40 arquivos)
   ├─ Depende da PR 2
   └─ ✅ Lógica isolada

4️⃣ PR: UI e Widgets (45 arquivos)
   ├─ Depende da PR 3
   └─ ✅ Visual separado

5️⃣ PR: Testes e Ajustes Finais (40 arquivos)
   ├─ Depende de todas anteriores
   └─ ✅ Validação completa
\`\`\`

---

### 🚀 Objetivo

Facilitar **code review** de qualidade e reduzir **riscos de bugs**.

> **Regra de ouro:** PRs menores = revisões melhores = menos bugs em produção!`);
    }
    else if (dartFiles.length > 80) {
        (0, _types_1.sendWarn)(`## ⚠️ PR GRANDE\n\nEsta PR alterou **${dartFiles.length} arquivos .dart**. PRs menores (30-40 arquivos) facilitam revisões mais detalhadas.`);
    }
    else if (dartFiles.length > 60) {
        (0, _types_1.sendMessage)(`## 📏 PR MÉDIA-GRANDE\n\nEsta PR alterou **${dartFiles.length} arquivos .dart**. Está no limite aceitável, mas PRs menores são preferíveis.`);
    }
    else if (dartFiles.length > 0) {
        (0, _types_1.sendMessage)(`## ✅ Tamanho Ideal de PR\n\n**${dartFiles.length} arquivo(s) .dart** alterado(s) - excelente tamanho para revisão! 🎉`);
    }
    // 5. VERIFICAÇÃO DE LINHAS DE CÓDIGO
    const linesChanged = (git.insertions || 0) + (git.deletions || 0);
    if (linesChanged === 0) {
        (0, _types_1.sendMessage)('ℹ️ Nenhuma linha de código alterada nesta PR');
    }
    else if (linesChanged <= 80) {
        (0, _types_1.sendMessage)(`✅ **Ótimo**: PR pequeno e focado (**${linesChanged} linhas** alteradas)`);
    }
    else if (linesChanged <= 200) {
        (0, _types_1.sendMessage)(`👍 **Bom**: PR de tamanho médio (**${linesChanged} linhas** alteradas)`);
    }
    else if (linesChanged <= 600) {
        (0, _types_1.sendWarn)(`⚠️ **Atenção**: PR grande (**${linesChanged} linhas** alteradas). Considere quebrar em PRs menores.`);
    }
    else {
        (0, _types_1.sendWarn)(`🚨 **PR Muito Grande**: **${linesChanged} linhas** alteradas! Forte recomendação de quebrar em múltiplos PRs menores.`);
    }
});
