# Flutter Analyze

## Overview

Executes `flutter analyze` on modified Dart files and reports issues with translated messages and documentation links.

## Purpose

Automated static analysis of Dart code to:
- Catch errors before code review
- Enforce Dart/Flutter best practices
- Provide helpful, translated error messages
- Link to official documentation for each issue

## How It Works

1. Identifies modified/created `.dart` files (excluding generated files)
2. Runs `flutter analyze` on those specific files
3. Parses the output and extracts issues
4. Translates error messages to Portuguese
5. Adds documentation links
6. Reports inline in the PR

## Configuration

```typescript
import { flutterAnalyzePlugin } from "danger-bot";

const plugins = [
  flutterAnalyzePlugin,  // Enabled by default
];
```

## Requirements

- Flutter SDK must be installed in the CI environment
- `flutter` command must be in PATH

## Files Analyzed

✅ **Included:**
- `.dart` files

❌ **Excluded:**
- `.g.dart` (generated files)
- `.freezed.dart` (freezed generated)
- `.mocks.dart` (mock files)

## Example Output

**When issues are found:**
```
🔍 Flutter Analyze (warning)

Use isEmpty ao invés de length == 0

Rule: prefer_is_empty

📖 Official Documentation
```

**When no issues:**
```
✅ Flutter Analyze: No problems found in modified files!
```

## Translated Rules

The plugin translates 50+ Flutter/Dart lint rules to Portuguese, including:

### Common Rules:
- `unused_local_variable` → "Variável local não utilizada"
- `prefer_const_constructors` → "Prefira construtores const"
- `avoid_print` → "Evite usar print() em produção"
- `public_member_api_docs` → "Documentação ausente em API pública"

### Performance:
- `avoid_function_literals_in_foreach_calls`
- `prefer_iterable_whereType`

### Null Safety:
- `unnecessary_null_checks`
- `unnecessary_null_in_if_null_operators`

## CI/CD Setup

### GitHub Actions

```yaml
- name: Setup Flutter
  uses: subosito/flutter-action@v2
  with:
    flutter-version: '3.x'

- name: Run Danger
  run: npm run danger:ci
```

### Bitbucket Pipelines

```yaml
- step:
    image: ghcr.io/cirruslabs/flutter:stable
    script:
      - flutter --version
      - npm install
      - npm run danger:ci
```

## Customization

Disable if Flutter is not installed:

```typescript
if (!isFlutterInstalled()) {
  flutterAnalyzePlugin.config.enabled = false;
}
```

## Best Practices

- Run `flutter analyze` locally before pushing
- Fix critical issues before opening PR
- Use `// ignore:` comments sparingly and with justification

## Platforms Supported

- ✅ GitHub
- ✅ Bitbucket Cloud
- ✅ GitLab

## Dependencies

- Flutter SDK (must be installed in CI)
- Node.js `child_process` module

