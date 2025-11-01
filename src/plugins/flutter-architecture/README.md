# Flutter Architecture

## Overview

Enforces Flutter/Dart architectural best practices and coding standards to maintain code quality and consistency across the project.

## Purpose

This plugin helps maintain:
- Clean architecture patterns
- Proper layer separation
- Consistent code organization
- Flutter best practices
- Type safety
- Error handling standards

## How It Works

Analyzes modified `.dart` files and checks for:

### 1. **Hardcoded Strings**
- Detects strings that should be in localization files
- Ignores URLs, regex patterns, and common technical strings

### 2. **Business Logic in UI**
- Warns when business logic appears in Widget files
- Encourages separation of concerns

### 3. **Missing Error Handling**
- Identifies async operations without try-catch
- Ensures robust error management

### 4. **Large Files**
- Flags files exceeding 300 lines
- Suggests refactoring into smaller components

### 5. **Missing Documentation**
- Checks for public API documentation
- Ensures code maintainability

## Configuration

```typescript
import { flutterArchitecturePlugin } from "danger-bot";

const plugins = [
  flutterArchitecturePlugin,  // Enabled by default
];
```

## Rules

### Hardcoded Strings

❌ **Bad:**
```dart
Text('Welcome to the app')
AppBar(title: Text('Settings'))
```

✅ **Good:**
```dart
Text(AppLocalizations.of(context).welcome)
AppBar(title: Text(context.l10n.settings))
```

### Business Logic in UI

❌ **Bad:**
```dart
class MyWidget extends StatelessWidget {
  Widget build(BuildContext context) {
    final result = calculateComplexLogic();  // ❌ Logic in UI
    return Text('$result');
  }
}
```

✅ **Good:**
```dart
class MyWidget extends StatelessWidget {
  final String result;  // ✅ Receive computed data
  
  MyWidget({required this.result});
  
  Widget build(BuildContext context) {
    return Text(result);
  }
}
```

### Error Handling

❌ **Bad:**
```dart
Future<void> fetchData() async {
  final response = await api.getData();  // ❌ No error handling
  return response;
}
```

✅ **Good:**
```dart
Future<void> fetchData() async {
  try {
    final response = await api.getData();
    return response;
  } catch (e) {
    logger.error('Failed to fetch data', e);
    rethrow;
  }
}
```

### File Size

❌ **Avoid:**
- Files with 300+ lines
- Mixing multiple concerns
- Large, monolithic widgets

✅ **Prefer:**
- Small, focused files
- Extract reusable widgets
- Separate concerns

## Example Output

**Hardcoded Strings:**
```
Hardcoded strings found in lib/features/home/home_page.dart (line 45)

Consider moving to localization files:
"Welcome to the app"

Use: AppLocalizations.of(context) or context.l10n
```

**Business Logic in Widget:**
```
Possible business logic in Widget file

File: lib/features/product/product_widget.dart (line 67)
Found: calculateDiscount

Consider moving to:
- ViewModel/Controller
- UseCase/Service
- Repository
```

**Missing Error Handling:**
```
Async operation without error handling

File: lib/core/services/api_service.dart (line 123)
Method: fetchUserProfile

Add try-catch block for robust error handling.
```

**Large File Warning:**
```
File is too large: 456 lines

File: lib/features/inventory/inventory_page.dart

Consider refactoring:
- Extract widgets to separate files
- Split into multiple smaller components
- Use composition over large files
```

## Architecture Patterns Supported

### Clean Architecture
```
lib/
├── core/           # Shared utilities
├── features/       # Feature modules
│   └── feature_name/
│       ├── data/       # Data layer
│       ├── domain/     # Business logic
│       └── presentation/  # UI layer
```

### BLoC Pattern
- Business logic in BLoC/Cubit
- UI only renders state
- Clear separation of concerns

### MVVM Pattern
- ViewModels handle logic
- Views are passive
- Models represent data

## Best Practices

1. **Localization**: Use `AppLocalizations` for all user-facing strings
2. **Separation**: Keep business logic out of UI layer
3. **Error Handling**: Always handle async errors
4. **File Size**: Keep files under 300 lines
5. **Documentation**: Document public APIs

## Customization

Adjust thresholds:

```typescript
// In the plugin file, modify:
const MAX_FILE_LINES = 300;  // Change as needed
```

Disable specific checks by modifying the plugin logic.

## Platforms Supported

- ✅ GitHub
- ✅ Bitbucket Cloud
- ✅ GitLab

## Dependencies

None - uses Danger JS built-in APIs only.

## Related Plugins

- `flutter-analyze` - Static analysis
- `spell-checker` - Identifier spelling
- `pr-size-checker` - PR size validation

