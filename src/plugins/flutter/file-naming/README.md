# File Naming Plugin

Plugin que verifica se os arquivos seguem a convenção de nomenclatura snake_case do Dart/Flutter.

## 📋 Descrição

Garante que todos os arquivos Dart sigam a convenção oficial de nomenclatura do Effective Dart, facilitando navegação, manutenibilidade e colaboração entre desenvolvedores.

## ✨ Funcionalidades

- ✅ **Validação snake_case**: Verifica se arquivos .dart usam apenas letras minúsculas, números e underscores
- ✅ **Detecção de Padrões**: Identifica automaticamente padrões incorretos (PascalCase, camelCase, kebab-case)
- ✅ **Sugestões Automáticas**: Fornece sugestão de nome correto para cada arquivo com problema
- ✅ **Mensagens Educativas**: Explica por que a convenção é importante e como corrigir
- ✅ **Links para Documentação**: Referências diretas para o Effective Dart Style Guide

## 📦 Instalação

```typescript
import { fileNaming } from '@danger-bot/flutter';

export default async () => {
  await fileNaming()();
};
```

## ⚙️ Configuração

### Opções Disponíveis

```typescript
interface FileNamingOptions {
  checkDartFiles?: boolean;  // Padrão: true
}
```

### Exemplo Básico

```typescript
import { fileNaming } from '@danger-bot/flutter';

export default async () => {
  // Usar configuração padrão
  await fileNaming()();
};
```

### Exemplo: Desabilitar Verificação

```typescript
import { fileNaming } from '@danger-bot/flutter';

export default async () => {
  // Desabilitar verificação (não recomendado)
  await fileNaming({
    checkDartFiles: false
  })();
};
```

## 📊 Regras de Nomenclatura

### ✅ Padrão Correto: snake_case

| Permitido | Descrição |
|-----------|-----------|
| `a-z` | Letras minúsculas |
| `0-9` | Números |
| `_` | Underscores para separação |

### ❌ Padrões Incorretos

| Padrão | Exemplo | Problema |
|--------|---------|----------|
| **PascalCase** | `HomePage.dart` | Usa letras maiúsculas |
| **camelCase** | `homePage.dart` | Primeira palavra minúscula, outras maiúsculas |
| **kebab-case** | `home-page.dart` | Usa hífens ao invés de underscores |
| **Com espaços** | `home page.dart` | Contém espaços |
| **UPPER_CASE** | `HOME_PAGE.dart` | Todas letras maiúsculas |

## 💡 Exemplos

### Arquivos Corretos ✅

```
lib/
  ├── main.dart
  ├── app.dart
  ├── home_page.dart
  ├── user_profile.dart
  ├── user_profile_screen.dart
  ├── authentication_service.dart
  ├── http_client_impl.dart
  ├── product_list_item.dart
  └── custom_button_widget.dart
```

### Arquivos Incorretos ❌

```
lib/
  ├── HomePage.dart           ❌ PascalCase
  ├── userProfile.dart        ❌ camelCase
  ├── user-profile.dart       ❌ kebab-case
  ├── User Profile.dart       ❌ Espaços
  ├── USER_PROFILE.dart       ❌ UPPER_CASE
  ├── UserProfilePage.dart    ❌ PascalCase
  └── myCustomWidget.dart     ❌ camelCase
```

## 🎯 Casos de Uso

### Projeto Novo

```typescript
import { fileNaming } from '@danger-bot/flutter';

export default async () => {
  // Garantir padrões desde o início
  await fileNaming()();
};
```

### Projeto com Múltiplos Desenvolvedores

```typescript
import { fileNaming } from '@danger-bot/flutter';

export default async () => {
  // Importante para manter consistência
  await fileNaming({
    checkDartFiles: true
  })();
};
```

## 📝 Mensagem de Erro

Quando um arquivo não segue o padrão, o plugin exibe:

```markdown
## 📁 NOMENCLATURA DE ARQUIVO INCORRETA

O arquivo `lib/pages/HomePage.dart` não segue a convenção de nomenclatura do Dart.

### ⚠️ Problema Identificado
Nomenclatura inconsistente dificulta:
- 🔍 Navegação no projeto
- 🤝 Colaboração entre desenvolvedores
- 📚 Manutenibilidade do código

📍 Arquivo problemático: `lib/pages/HomePage.dart`
📍 Sugestão: `home_page.dart`

### 🎯 AÇÃO NECESSÁRIA
Renomeie o arquivo para seguir snake_case

### 💡 Exemplos
❌ HomePage.dart
✅ home_page.dart
```

## 🔧 Como Renomear Arquivos

### Método 1: Usando Git (Recomendado)

```bash
# Renomear arquivo preservando histórico
git mv lib/pages/HomePage.dart lib/pages/home_page.dart

# Commit
git add .
git commit -m "refactor: renomeia HomePage para snake_case"
```

### Método 2: Usando IDE

**VS Code:**
1. Clique com botão direito no arquivo
2. Selecione "Rename Symbol" (F2)
3. Digite o novo nome em snake_case
4. IDE atualiza todos os imports automaticamente

**Android Studio:**
1. Clique com botão direito no arquivo
2. Selecione "Refactor" → "Rename"
3. Digite o novo nome em snake_case
4. Clique "Refactor"
5. IDE atualiza todos os imports automaticamente

### Método 3: Script de Migração em Massa

Para projetos legados com muitos arquivos:

```bash
#!/bin/bash
# renomear_para_snake_case.sh

find lib -name "*.dart" | while read file; do
  dir=$(dirname "$file")
  oldname=$(basename "$file" .dart)
  newname=$(echo "$oldname" | sed 's/\([A-Z]\)/_\L\1/g' | sed 's/^_//')
  
  if [ "$oldname" != "$newname" ]; then
    echo "Renomeando: $oldname -> $newname"
    git mv "$file" "$dir/${newname}.dart"
  fi
done
```

## 🚨 Troubleshooting

### Problema: Alerta em arquivo gerado automaticamente

**Causa**: Arquivos gerados (`.g.dart`, `.freezed.dart`) podem ter nomes diferentes.

**Solução**: Estes arquivos são gerados e seguem o nome do arquivo fonte:

```dart
// ✅ CORRETO
user_model.dart          // Arquivo fonte
user_model.g.dart        // Gerado automaticamente
user_model.freezed.dart  // Gerado automaticamente
```

### Problema: Muitos arquivos para renomear

**Causa**: Projeto legado sem padrão.

**Solução**: Renomeie gradualmente:
1. **PR 1**: Renomear arquivos da camada Domain
2. **PR 2**: Renomear arquivos da camada Data
3. **PR 3**: Renomear arquivos da camada Presentation

### Problema: Conflitos após renomear

**Causa**: Outros desenvolvedores trabalhando nos mesmos arquivos.

**Solução**:
1. Comunique a equipe sobre renomeação
2. Faça renomeações em PRs dedicadas
3. Merge rápido para evitar conflitos

## 📚 Por Que snake_case?

### Razões Técnicas

1. **Compatibilidade Cross-Platform**: Alguns sistemas de arquivo são case-insensitive
2. **Convenção Dart Oficial**: Alinhado com style guide oficial
3. **Facilita Busca**: Mais fácil buscar e filtrar arquivos
4. **Previsibilidade**: Desenvolvedores sabem exatamente como nomear

### Benefícios para a Equipe

- ✅ **Consistência**: Todo código segue mesmo padrão
- ✅ **Onboarding**: Novos devs entendem estrutura mais rápido
- ✅ **Code Review**: Fácil identificar arquivos por nome
- ✅ **Refatoração**: IDEs funcionam melhor com padrões consistentes

## 🔗 Integração com Outros Plugins

### Combinação Recomendada

```typescript
import { 
  fileNaming,
  domainEntities,
  domainFailures,
  cleanArchitecture 
} from '@danger-bot/flutter';

export default async () => {
  // Nomenclatura de arquivos
  await fileNaming()();
  
  // Nomenclatura de classes
  await domainEntities()();
  await domainFailures()();
  
  // Arquitetura
  await cleanArchitecture()();
};
```

## 📖 Referências

- [Effective Dart: Style Guide](https://dart.dev/guides/language/effective-dart/style#do-name-libraries-and-source-files-using-lowercase_with_underscores)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)
- [Flutter Style Guide](https://github.com/flutter/flutter/wiki/Style-guide-for-Flutter-repo)

## 🎓 Exemplos Reais

### Estrutura de Projeto Bem Organizada

```
lib/
├── main.dart
├── app.dart
├── core/
│   ├── errors/
│   │   ├── failures.dart
│   │   └── exceptions.dart
│   ├── utils/
│   │   ├── date_formatter.dart
│   │   ├── string_validator.dart
│   │   └── network_checker.dart
│   └── constants/
│       ├── app_colors.dart
│       ├── app_strings.dart
│       └── api_endpoints.dart
├── features/
│   ├── authentication/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── user_entity.dart
│   │   │   ├── repositories/
│   │   │   │   └── auth_repository_interface.dart
│   │   │   └── usecases/
│   │   │       ├── login_usecase.dart
│   │   │       └── logout_usecase.dart
│   │   ├── data/
│   │   │   ├── models/
│   │   │   │   └── user_model.dart
│   │   │   ├── datasources/
│   │   │   │   └── auth_datasource.dart
│   │   │   └── repositories/
│   │   │       └── auth_repository.dart
│   │   └── presentation/
│   │       ├── pages/
│   │       │   ├── login_page.dart
│   │       │   └── register_page.dart
│   │       ├── viewmodels/
│   │       │   └── auth_viewmodel.dart
│   │       └── widgets/
│   │           ├── custom_text_field.dart
│   │           └── primary_button.dart
│   └── products/
│       └── ... (mesma estrutura)
└── shared/
    ├── widgets/
    │   ├── loading_indicator.dart
    │   ├── error_message.dart
    │   └── empty_state.dart
    └── theme/
        ├── app_theme.dart
        └── text_styles.dart
```

## 💪 Boas Práticas

### ✅ Faça

- Use nomes descritivos e claros
- Separe palavras com underscore
- Use apenas letras minúsculas
- Seja consistente em todo o projeto
- Renomeie imediatamente se detectar erro

### ❌ Não Faça

- Não use abreviações não óbvias (`usr_prf.dart`)
- Não misture padrões no mesmo projeto
- Não use caracteres especiais além de `_`
- Não use números no início do nome
- Não ignore os avisos deste plugin

## 📄 Licença

MIT
