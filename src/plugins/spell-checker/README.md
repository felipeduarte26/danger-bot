# Spell Checker

## Overview

Validates spelling in Dart identifiers (class names, method names, variables) to ensure code clarity and professionalism.

## Purpose

Proper spelling in code is essential for:

- Code readability
- Professional appearance
- Avoiding confusion in team collaboration
- Easier code search and navigation
- Consistent terminology

## How It Works

1. Extracts Dart identifiers from modified files
2. Splits camelCase/PascalCase into individual words
3. Runs spell check using CSpell
4. Reports misspelled words with suggestions
5. Supports custom dictionaries

## Configuration

```typescript
import { spellCheckerPlugin } from "danger-bot";

const plugins = [
  spellCheckerPlugin, // Enabled by default
];
```

## Requirements

This plugin requires:

- `cspell` package (included with danger-bot)
- Setup script (automatically included)

## Setup

The plugin automatically runs the setup script on first use:

```bash
scripts/setup_spell_check.sh
```

This creates:

- `cspell.json` - Configuration file
- `.cspell-words.txt` - Custom dictionary

## Files Analyzed

✅ **Included:**

- `.dart` files
- Class names, method names, variables
- Function names, parameter names

❌ **Excluded:**

- String literals
- Comments
- Import paths
- Generated files (`.g.dart`, `.freezed.dart`)

## Example Output

**When spelling errors are found:**

```
Spelling errors found in lib/features/payment/paymnt_service.dart:

Line 15: "paymnt" (should be "payment")
Line 23: "usrName" (should be "userName")
Line 45: "proccess" (should be "process")

Suggestions:
- payment
- userName
- process
```

**When no errors:**

```
✅ No spelling errors found in Dart identifiers
```

## Common Issues Detected

### Typos in Class Names

❌ **Bad:**

```dart
class UserContoller { }  // "Contoller" → "Controller"
class PaymntService { }  // "Paymnt" → "Payment"
```

✅ **Good:**

```dart
class UserController { }
class PaymentService { }
```

### Typos in Methods

❌ **Bad:**

```dart
void fetchUsrData() { }    // "Usr" → "User"
void calclateTotl() { }    // "calclate" → "calculate", "Totl" → "Total"
```

✅ **Good:**

```dart
void fetchUserData() { }
void calculateTotal() { }
```

### Typos in Variables

❌ **Bad:**

```dart
final usrName = 'John';       // "usr" → "user"
final totlAmount = 100.0;     // "totl" → "total"
final isProccessing = false;  // "Proccessing" → "Processing"
```

✅ **Good:**

```dart
final userName = 'John';
final totalAmount = 100.0;
final isProcessing = false;
```

## Custom Dictionary

Add project-specific terms to `.cspell-words.txt`:

```txt
# Project-specific terms
UserDto
ProductEntity
```

These words will not be flagged as errors.

## CSpell Configuration

The plugin creates a `cspell.json` file:

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
  "ignorePaths": ["**/*.g.dart", "**/*.freezed.dart", "**/*.mocks.dart"]
}
```

## Identifier Extraction

The plugin extracts identifiers from various Dart constructs:

```dart
// Classes
class MyClass { }  // Extracts: "My", "Class"

// Methods
void fetchUserData() { }  // Extracts: "fetch", "User", "Data"

// Variables
final userName = '';  // Extracts: "user", "Name"

// Parameters
void login(String userEmail) { }  // Extracts: "user", "Email"

// Enums
enum PaymentStatus { }  // Extracts: "Payment", "Status"
```

## Technical Terms Supported

CSpell includes dictionaries for:

- Programming terms (async, await, const, etc.)
- Flutter/Dart terms (widget, stateful, etc.)
- Common abbreviations (dto, api, url, etc.)
- Technical jargon

## Best Practices

1. **Use Full Words**: Prefer `userName` over `usrNm`
2. **Consistent Naming**: Use consistent terminology across codebase
3. **Add to Dictionary**: Add legitimate technical terms to custom dictionary
4. **Review Suggestions**: Plugin provides spelling suggestions
5. **Abbreviations**: Use standard abbreviations (DTO, API, HTTP)

## CI/CD Setup

### GitHub Actions

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: "18"

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

## Customization

### Disable Plugin

```typescript
spellCheckerPlugin.config.enabled = false;
```

### Add Custom Words

Edit `.cspell-words.txt`:

```txt
YourProjectName
CustomTerm
SpecificAcronym
```

## Performance

- Analyzes only modified files
- Caches dictionary for speed
- Typically adds < 5 seconds to CI runtime

## Platforms Supported

- ✅ GitHub
- ✅ Bitbucket Cloud
- ✅ GitLab

## Dependencies

- `cspell` - Spell checker (included with danger-bot)
- `scripts/setup_spell_check.sh` - Setup script (included)
- `scripts/extract_dart_identifiers.js` - Extractor (included)

## Related Plugins

- `flutter-analyze` - Dart static analysis
- `portuguese-documentation` - Language detection
- `flutter-architecture` - Code quality checks
