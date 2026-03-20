# 🌐 Portuguese Documentation

## 📋 Visão Geral

Detect

a documentação escrita em português (ou outros idiomas não-inglês) e incentiva documentação em inglês para colaboração internacional.

---

## 🎯 Objetivo

Manter documentação em inglês é importante para:

- 🌍 Colaboração internacional em equipes
- 🤝 Contribuições open source globais
- 📚 Acessibilidade para desenvolvedores do mundo todo
- 🏢 Conformidade com padrões da indústria

---

## ⚙️ Como Funciona

1. 🔎 Analisa arquivos `.dart` modificados
2. 📝 Extrai comentários de documentação (`///` e `/** */`)
3. 🤖 Usa detecção de idioma (biblioteca cld3-asm)
4. ⚠️ Reporta documentação em idiomas não-inglês com avisos

---

## 🚀 Configuração

```typescript
import { portugueseDocumentationPlugin } from "@felipeduarte26/danger-bot";

const plugins = [
  portugueseDocumentationPlugin,  // Habilitado por padrão
];
```

---

## 🔍 Detecção de Idioma

Usa o **Google Compact Language Detector v3 (CLD3)** para identificar:

| Idioma | Código | Status |
|--------|--------|--------|
| Português | pt | ✅ Detectado |
| Espanhol | es | ✅ Detectado |
| Francês | fr | ✅ Detectado |
| Alemão | de | ✅ Detectado |
| Italiano | it | ✅ Detectado |
| Russo | ru | ✅ Detectado |
| Japonês | ja | ✅ Detectado |
| Chinês | zh | ✅ Detectado |
| **+ 100 idiomas** | ... | ✅ Detectado |

---

## 📁 Arquivos Analisados

### ✅ Incluídos

```dart
/// Comentários de documentação
/**
 * Blocos de documentação
 */
```

### ❌ Excluídos

```dart
// Comentários de código (não analisados)
/* Comentários multi-linha (não analisados) */
// String literals no código
*.g.dart       // Arquivos gerados
*.freezed.dart // Freezed gerados
```

---

## 📊 Exemplo de Saída

### ⚠️ Quando documentação em português é encontrada

```
Documentação em português detectada

lib/features/auth/login_service.dart (linhas 23-25):

/// Faz o login do usuário no sistema
/// Retorna true se o login foi bem-sucedido
class LoginService { ... }

Recomendação: Use inglês para documentação para facilitar colaboração internacional.

Sugestão:
/// Logs the user into the system
/// Returns true if login was successful
```

---

## 💡 Exemplos de Documentação

### ❌ Português (Detectado)

```dart
/// Classe responsável por gerenciar autenticação
/// 
/// Esta classe fornece métodos para login, logout e
/// validação de tokens de autenticação.
class AuthManager {
  /// Faz login do usuário com email e senha
  Future<bool> login(String email, String password) async {
    // ...
  }
  
  /// Faz logout do usuário
  Future<void> logout() async {
    // ...
  }
}
```

### ✅ Inglês (Recomendado)

```dart
/// Class responsible for managing authentication
/// 
/// This class provides methods for login, logout and
/// authentication token validation.
class AuthManager {
  /// Logs in the user with email and password
  Future<bool> login(String email, String password) async {
    // ...
  }
  
  /// Logs out the current user
  Future<void> logout() async {
    // ...
  }
}
```

---

## 📝 Tipos de Comentários

### Analisados ✅

```dart
/// Comentário de documentação de linha única
/// Segunda linha
/// Terceira linha
```

```dart
/**
 * Bloco de documentação multi-linha
 * Segunda linha
 * Terceira linha
 */
```

### Ignorados ❌

```dart
// Comentário de código simples
// Não é analisado

/* 
 * Comentário multi-linha simples
 * Também não é analisado
 */

String text = "Texto em string literal"; // Ignorado
```

---

## 🛠️ Setup em CI/CD

### Instalação Automática

O pacote `cld3-asm` é instalado automaticamente com o danger-bot:

```json
{
  "dependencies": {
    "cld3-asm": "^3.1.1"
  }
}
```

---

## 🎯 Casos de Uso

### 1. Equipes Internacionais

```dart
// ✅ Acessível para todos os membros
/// Fetches user data from the API
/// 
/// Throws [NetworkException] if connection fails
Future<User> fetchUser(String id) async { }
```

### 2. Projetos Open Source

```dart
// ✅ Permite contribuições globais
/// Widget that displays a loading spinner
/// 
/// Can be customized with [color] and [size] parameters
class LoadingSpinner extends StatelessWidget { }
```

### 3. Padrões Corporativos

```dart
// ✅ Segue padrões internacionais
/// Service for handling payment transactions
/// 
/// Supports multiple payment methods:
/// - Credit Card
/// - PayPal
/// - Bank Transfer
class PaymentService { }
```

---

## 💡 Boas Práticas

### ✅ Recomendado

1. **Escrever em Inglês**: Use inglês para toda documentação
2. **Inglês Claro**: Use inglês simples e direto
3. **Evitar Jargões**: Minimize idiomas locais ou referências culturais específicas
4. **Usar Exemplos**: Exemplos de código são universais
5. **Ferramentas**: Use ferramentas de tradução (DeepL, Google Translate) se necessário

### ❌ Evitar

- ❌ Documentação em idiomas locais em projetos internacionais
- ❌ Misturar idiomas na documentação
- ❌ Gírias ou expressões coloquiais
- ❌ Referências culturais específicas

---

## 🔧 Customização

### Desabilitar para Projetos Específicos

```typescript
portugueseDocumentationPlugin.config.enabled = false;
```

### Permitir Idiomas Específicos

Modifique o plugin para permitir certos idiomas se sua equipe é multilíngue:

```typescript
// Exemplo: Permitir português para projeto brasileiro
const allowedLanguages = ['en', 'pt'];
```

---

## 📚 Recursos Úteis

### Ferramentas de Tradução

- [DeepL](https://www.deepl.com/) - Traduções de alta qualidade
- [Google Translate](https://translate.google.com/) - Rápido e gratuito
- [Grammarly](https://www.grammarly.com/) - Correção de inglês

### Guias de Estilo

- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Microsoft Writing Style Guide](https://docs.microsoft.com/en-us/style-guide/welcome/)

---

## 🌐 Plataformas Suportadas

| Plataforma | Status |
|------------|--------|
| GitHub | ✅ |
| Bitbucket Cloud | ✅ |
| GitLab | ✅ |

---

## 📦 Dependências

- **cld3-asm** - Compact Language Detector 3 (incluído com danger-bot)

---

## 🔗 Plugins Relacionados

- [spell-checker](../spell-checker/README.md) - Verifica ortografia em identificadores
- [flutter-architecture](../flutter-architecture/README.md) - Padrões de documentação

---

<div align="center">

**Documentação universal, colaboração global! 🌍**

</div>
