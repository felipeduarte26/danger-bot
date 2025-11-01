# Portuguese Documentation

## Overview

Detects documentation written in Portuguese (or other non-English languages) and encourages English documentation for international collaboration.

## Purpose

Maintaining English documentation is important for:
- International team collaboration
- Open source contributions
- Global developer accessibility
- Industry standard compliance

## How It Works

1. Analyzes modified `.dart` files
2. Extracts documentation comments (`///` and `/** */`)
3. Uses language detection (cld3-asm library)
4. Reports non-English documentation with warnings

## Configuration

```typescript
import { portugueseDocumentationPlugin } from "danger-bot";

const plugins = [
  portugueseDocumentationPlugin,  // Enabled by default
];
```

## Language Detection

Uses Google's Compact Language Detector v3 (CLD3) to identify:
- Portuguese (pt)
- Spanish (es)
- French (fr)
- German (de)
- And 100+ other languages

## Files Analyzed

✅ **Included:**
- `.dart` files with documentation comments

❌ **Excluded:**
- Code comments (non-doc comments)
- Generated files (`.g.dart`, `.freezed.dart`)
- String literals in code

## Example Output

**When Portuguese documentation is found:**
```
Documentação em português detectada

lib/features/auth/login_service.dart (lines 23-25):

/// Faz o login do usuário no sistema
/// Retorna true se o login foi bem-sucedido
class LoginService { ... }

Recomendação: Use inglês para documentação para facilitar colaboração internacional.

Sugestão:
/// Logs the user into the system
/// Returns true if login was successful
```

## Documentation Examples

❌ **Portuguese (Detected):**
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
}
```

✅ **English (Recommended):**
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
}
```

## Comment Types Detected

### Documentation Comments (Analyzed)
```dart
/// Single-line doc comment ✅
/**
 * Multi-line doc comment ✅
 */
```

### Code Comments (Ignored)
```dart
// Single-line comment ❌ (not analyzed)
/* Multi-line comment ❌ (not analyzed) */
```

## CI/CD Setup

This plugin requires the `cld3-asm` package:

```json
{
  "dependencies": {
    "cld3-asm": "^3.1.1"
  }
}
```

The package is automatically installed with `danger-bot`.

## Use Cases

### International Teams
- Ensure documentation is accessible to all team members
- Maintain consistency across global projects

### Open Source Projects
- Enable contributions from worldwide developers
- Follow industry standards

### Company Standards
- Comply with company-wide English documentation policies
- Prepare code for potential open sourcing

## Best Practices

1. **Write in English**: Use English for all documentation
2. **Clear and Simple**: Use clear, simple English
3. **Avoid Jargon**: Minimize local idioms or culture-specific references
4. **Use Examples**: Code examples are universal
5. **Tools**: Use translation tools if needed (DeepL, Google Translate)

## Customization

### Disable for Specific Projects

```typescript
portugueseDocumentationPlugin.config.enabled = false;
```

### Allow Specific Languages

Modify the plugin to whitelist certain languages if your team is multilingual.

## Language Support

Detects 100+ languages including:
- Portuguese (pt)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Russian (ru)
- Japanese (ja)
- Chinese (zh)
- Korean (ko)
- Arabic (ar)

## Platforms Supported

- ✅ GitHub
- ✅ Bitbucket Cloud
- ✅ GitLab

## Dependencies

- `cld3-asm` - Compact Language Detector 3 (included with danger-bot)

## Related Plugins

- `spell-checker` - Checks spelling in identifiers
- `flutter-architecture` - Enforces documentation standards

