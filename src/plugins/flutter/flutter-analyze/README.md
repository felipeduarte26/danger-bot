# 🔍 Flutter Analyze

## 📋 Visão Geral

Executa `flutter analyze` nos arquivos Dart modificados e reporta issues com mensagens traduzidas e links para documentação oficial.

---

## 🎯 Objetivo

Análise estática automatizada de código Dart para:

- 🐛 Detectar erros antes da revisão de código
- ✅ Garantir boas práticas Flutter/Dart
- 📚 Fornecer mensagens de erro úteis e traduzidas
- 🔗 Linkar documentação oficial para cada issue

---

## ⚙️ Como Funciona

1. 🔎 Identifica arquivos `.dart` modificados/criados (excluindo gerados)
2. ⚡ Executa `flutter analyze` nesses arquivos específicos
3. 📝 Extrai e processa os issues encontrados
4. 🌐 Traduz mensagens de erro para português
5. 🔗 Adiciona links para documentação
6. 💬 Reporta inline no PR

---

## 📁 Arquivos Analisados

### ✅ Incluídos

```dart
*.dart    // Todos os arquivos Dart
```

### ❌ Excluídos

```dart
*.g.dart        // Arquivos gerados
*.freezed.dart  // Freezed gerados
*.mocks.dart    // Arquivos de mock
```

---

## 🚀 Configuração

### Uso Básico

```typescript
import { flutterAnalyzePlugin } from "@felipeduarte26/danger-bot";

const plugins = [
  flutterAnalyzePlugin,  // Habilitado por padrão
];
```

### Desabilitar se Flutter não estiver instalado

```typescript
if (!isFlutterInstalled()) {
  flutterAnalyzePlugin.config.enabled = false;
}
```

---

## 📊 Exemplos de Saída

### ⚠️ Quando issues são encontrados

```
🔍 Flutter Analyze (warning)

Use isEmpty ao invés de length == 0

Rule: prefer_is_empty

📖 Documentação Oficial
```

### ✅ Quando não há problemas

```
✅ Flutter Analyze: Nenhum problema encontrado nos arquivos modificados!
```

---

## 🌐 Regras Traduzidas

O plugin traduz **50+ regras** do Flutter/Dart para português:

### 📋 Categorias Principais

#### 🔤 **Convenções de Código**
| Regra Original | Tradução |
|----------------|----------|
| `unused_local_variable` | Variável local não utilizada |
| `prefer_const_constructors` | Prefira construtores const |
| `avoid_print` | Evite usar print() em produção |
| `public_member_api_docs` | Documentação ausente em API pública |

#### ⚡ **Performance**
| Regra Original | Tradução |
|----------------|----------|
| `avoid_function_literals_in_foreach_calls` | Evite literals de função em forEach |
| `prefer_iterable_whereType` | Prefira whereType ao invés de where |
| `prefer_const_constructors` | Use const para melhor performance |

#### 🔒 **Null Safety**
| Regra Original | Tradução |
|----------------|----------|
| `unnecessary_null_checks` | Verificação de null desnecessária |
| `unnecessary_null_in_if_null_operators` | Null desnecessário em operadores ?? |

#### 🏗️ **Estrutura**
| Regra Original | Tradução |
|----------------|----------|
| `prefer_final_fields` | Prefira campos final |
| `prefer_final_locals` | Prefira variáveis locais final |
| `unnecessary_this` | Uso desnecessário de this |

---

## 🛠️ Setup em CI/CD

### GitHub Actions

```yaml
- name: Setup Flutter
  uses: subosito/flutter-action@v2
  with:
    flutter-version: '3.x'

- name: Run Danger
  run: npm run danger:ci
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Bitbucket Pipelines

```yaml
image: ghcr.io/cirruslabs/flutter:stable

pipelines:
  pull-requests:
    '**':
      - step:
          name: Danger Bot
          script:
            - flutter --version
            - npm install
            - npm run danger:ci
```

### GitLab CI

```yaml
danger:
  image: ghcr.io/cirruslabs/flutter:stable
  stage: test
  script:
    - flutter --version
    - npm install
    - npm run danger:ci
  only:
    - merge_requests
```

---

## 💡 Boas Práticas

### ✅ Recomendado

- ✅ Executar `flutter analyze` localmente antes de push
- ✅ Corrigir issues críticos antes de abrir PR
- ✅ Usar `// ignore:` com justificativa quando necessário
- ✅ Manter `analysis_options.yaml` atualizado

### ❌ Evitar

- ❌ Ignorar avisos sem justificativa
- ❌ Usar `// ignore` em excesso
- ❌ Desabilitar regras importantes
- ❌ Deixar código com warnings em produção

---

## 📝 Exemplo de `analysis_options.yaml`

```yaml
include: package:flutter_lints/flutter.yaml

linter:
  rules:
    # Convenções
    - prefer_const_constructors
    - prefer_final_fields
    - unnecessary_this
    
    # Performance
    - avoid_function_literals_in_foreach_calls
    - prefer_const_literals_to_create_immutables
    
    # Documentação
    - public_member_api_docs
    
    # Null Safety
    - unnecessary_null_checks
    - unnecessary_null_in_if_null_operators

analyzer:
  strong-mode:
    implicit-casts: false
    implicit-dynamic: false
  
  errors:
    # Tratar warnings como erros
    unused_local_variable: error
    avoid_print: error
```

---

## 🔧 Requisitos

### Ambiente CI/CD

- ✅ Flutter SDK instalado
- ✅ Comando `flutter` no PATH
- ✅ Versão Flutter >= 2.0

### Verificar Instalação

```bash
flutter --version
flutter analyze --help
```

---

## 🌐 Plataformas Suportadas

| Plataforma | Status |
|------------|--------|
| GitHub | ✅ |
| Bitbucket Cloud | ✅ |
| GitLab | ✅ |

---

## 📦 Dependências

- **Flutter SDK** (obrigatório no CI)
- **Node.js** `child_process` module

---

## 🔗 Plugins Relacionados

- [flutter-architecture](../flutter-architecture/README.md) - Valida arquitetura
- [spell-checker](../spell-checker/README.md) - Verifica ortografia
- [portuguese-documentation](../portuguese-documentation/README.md) - Detecta docs em PT

---

<div align="center">

**Código limpo e sem erros, sempre! ✨**

</div>
