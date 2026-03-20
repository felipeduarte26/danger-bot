# 🔤 Spell Checker

## 📋 Visão Geral

Valida a ortografia em identificadores Dart (nomes de classes, métodos, variáveis) para garantir clareza e profissionalismo no código.

---

## 🎯 Objetivo

Ortografia correta no código é essencial para:

- 📖 Legibilidade do código
- 💼 Aparência profissional
- 🤝 Evitar confusão na colaboração em equipe
- 🔍 Facilitar busca e navegação no código
- 📚 Terminologia consistente

---

## ⚙️ Como Funciona

1. 🔎 Extrai identificadores Dart dos arquivos modificados
2. ✂️ Divide camelCase/PascalCase em palavras individuais
3. ✅ Executa verificação ortográfica usando CSpell
4. 📝 Reporta palavras com erro de ortografia com sugestões
5. 📖 Suporta dicionários personalizados

---

## 🚀 Configuração

```typescript
import { spellCheckerPlugin } from "@felipeduarte26/danger-bot";

const plugins = [
  spellCheckerPlugin,  // Habilitado por padrão
];
```

---

## 🛠️ Setup Automático

O plugin executa automaticamente o script de setup na primeira vez:

```bash
scripts/setup_spell_check.sh
```

Isso cria:
- `cspell.json` - Arquivo de configuração
- `.cspell-words.txt` - Dicionário personalizado

---

## 📁 Arquivos Analisados

### ✅ Incluídos

```dart
*.dart            // Todos os arquivos Dart
// Analisa:
- Nomes de classes
- Nomes de métodos
- Nomes de variáveis
- Nomes de funções
- Nomes de parâmetros
```

### ❌ Excluídos

```dart
"String literals"  // Literais de string
// Comentários      // Comentários
import 'path';     // Caminhos de import
*.g.dart           // Arquivos gerados
*.freezed.dart     // Freezed gerados
*.mocks.dart       // Arquivos de mock
```

---

## 📊 Exemplos de Saída

### ⚠️ Quando erros são encontrados

```
Erros de ortografia encontrados em lib/features/payment/paymnt_service.dart:

Linha 15: "paymnt" (deveria ser "payment")
Linha 23: "usrName" (deveria ser "userName")
Linha 45: "proccess" (deveria ser "process")

Sugestões:
- payment
- userName
- process
```

### ✅ Sem erros

```
✅ Nenhum erro de ortografia encontrado nos identificadores Dart
```

---

## 🐛 Problemas Comuns Detectados

### 1. Erros em Nomes de Classes

#### ❌ Errado

```dart
class UserContoller { }   // "Contoller" → "Controller"
class PaymntService { }   // "Paymnt" → "Payment"
class AccntManager { }    // "Accnt" → "Account"
```

#### ✅ Correto

```dart
class UserController { }
class PaymentService { }
class AccountManager { }
```

---

### 2. Erros em Métodos

#### ❌ Errado

```dart
void fetchUsrData() { }     // "Usr" → "User"
void calclateTotl() { }     // "calclate" → "calculate", "Totl" → "Total"
void proccess Data() { }    // "proccess" → "process"
```

#### ✅ Correto

```dart
void fetchUserData() { }
void calculateTotal() { }
void processData() { }
```

---

### 3. Erros em Variáveis

#### ❌ Errado

```dart
final usrName = 'John';        // "usr" → "user"
final totlAmount = 100.0;      // "totl" → "total"
final isProccessing = false;   // "Proccessing" → "Processing"
```

#### ✅ Correto

```dart
final userName = 'John';
final totalAmount = 100.0;
final isProcessing = false;
```

---

## 📖 Dicionário Personalizado

### Adicionar Termos Específicos do Projeto

Edite `.cspell-words.txt`:

```txt
# Termos específicos do projeto
Esfera
UserDto
ProductEntity
AuthBloc
```

Essas palavras não serão marcadas como erros.

---

## ⚙️ Configuração do CSpell

O plugin cria automaticamente `cspell.json`:

```json
{
  "version": "0.2",
  "language": "en",
  "dictionaries": ["custom-words"],
  "dictionaryDefinitions": [
    {
      "name": "custom-words",
      "path": "./.cspell-words.txt"
    }
  ],
  "ignorePaths": [
    "**/*.g.dart",
    "**/*.freezed.dart",
    "**/*.mocks.dart",
    "**/node_modules/**",
    "**/build/**"
  ]
}
```

---

## 🔍 Extração de Identificadores

O plugin extrai identificadores de várias construções Dart:

```dart
// Classes
class MyClass { }            // Extrai: "My", "Class"

// Métodos
void fetchUserData() { }     // Extrai: "fetch", "User", "Data"

// Variáveis
final userName = '';         // Extrai: "user", "Name"

// Parâmetros
void login(String userEmail) { }  // Extrai: "user", "Email"

// Enums
enum PaymentStatus { }       // Extrai: "Payment", "Status"

// Constantes
const kApiKey = '';          // Extrai: "Api", "Key"
```

---

## 📚 Termos Técnicos Suportados

CSpell inclui dicionários para:

| Categoria | Exemplos |
|-----------|----------|
| **Programação** | async, await, const, final |
| **Flutter/Dart** | widget, stateful, stateless |
| **Abreviações** | dto, api, url, http |
| **Jargão Técnico** | auth, repo, impl, util |

---

## 💡 Boas Práticas

### ✅ Recomendado

1. **Palavras Completas**: Prefira `userName` ao invés de `usrNm`
2. **Consistência**: Use terminologia consistente no codebase
3. **Dicionário**: Adicione termos técnicos legítimos ao dicionário
4. **Revisar Sugestões**: O plugin fornece sugestões ortográficas
5. **Abreviações Padrão**: Use abreviações conhecidas (DTO, API, HTTP)

### ❌ Evitar

- ❌ Abreviações excessivas: `usrNm`, `prdctCtlr`
- ❌ Ortografia inconsistente: `colour` vs `color`
- ❌ Erros de digitação: `proccess`, `recieve`
- ❌ Termos inventados sem necessidade

---

## 📝 Exemplos de Boas Práticas

### ✅ Nomes Descritivos

```dart
// ✅ Claro e bem escrito
class UserAuthenticationService { }
void calculateMonthlyRevenue() { }
final isEmailVerified = false;

// ❌ Abreviado e com erros
class UsrAuthSrvc { }         // Muito abreviado
void calcMnthRev() { }        // Incompreensível
final isEmlVrfied = false;    // Erro + abreviação
```

### ✅ Termos do Domínio

```dart
// ✅ Adicione ao dicionário
final productSKU = '123';      // SKU é termo válido
final httpClient = Client();   // HTTP é abreviação conhecida
final apiEndpoint = '/users';  // API é padrão

// Adicione ao .cspell-words.txt:
// SKU
// HTTP
// API
```

---

## 🛠️ Setup em CI/CD

### GitHub Actions

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'

- name: Install Dependencies
  run: npm install

- name: Run Danger
  run: npm run danger:ci
```

### Bitbucket Pipelines

```yaml
- step:
    name: Danger Bot
    image: node:18
    script:
      - npm install
      - npm run danger:ci
```

---

## 🔧 Customização

### Desabilitar Plugin

```typescript
spellCheckerPlugin.config.enabled = false;
```

### Adicionar Palavras Customizadas

Edite `.cspell-words.txt`:

```txt
NomeDoProjeto
TermoCustomizado
SiglaEspecifica
```

---

## ⚡ Performance

- ✅ Analisa apenas arquivos modificados
- ✅ Cache de dicionário para velocidade
- ✅ Tipicamente adiciona < 5 segundos ao CI

---

## 🌐 Plataformas Suportadas

| Plataforma | Status |
|------------|--------|
| GitHub | ✅ |
| Bitbucket Cloud | ✅ |
| GitLab | ✅ |

---

## 📦 Dependências

- **cspell** - Verificador ortográfico (incluído com danger-bot)
- **scripts/setup_spell_check.sh** - Script de setup (incluído)
- **scripts/extract_dart_identifiers.js** - Extrator (incluído)

---

## 🔗 Plugins Relacionados

- [flutter-analyze](../flutter-analyze/README.md) - Análise estática Dart
- [portuguese-documentation](../portuguese-documentation/README.md) - Detecção de idioma
- [flutter-architecture](../flutter-architecture/README.md) - Validação de qualidade

---

<div align="center">

**Código bem escrito, equipe profissional! ✨**

</div>
