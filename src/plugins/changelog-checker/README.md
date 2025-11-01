# Changelog Checker

## Overview

Ensures that the CHANGELOG.md file is updated whenever significant code changes are made to the project.

## Purpose

Maintaining an updated CHANGELOG is crucial for:
- Tracking project changes over time
- Communicating updates to users and developers
- Documenting breaking changes
- Facilitating version management

## How It Works

The plugin checks if:
1. Significant code files were modified or created
2. The CHANGELOG.md file was also updated

If code changes are detected without CHANGELOG updates, a warning is issued.

## Configuration

```typescript
import { changelogCheckerPlugin } from "danger-bot";

const plugins = [
  changelogCheckerPlugin,  // Enabled by default
];
```

## Files Considered Significant

The plugin considers these file types as requiring CHANGELOG updates:
- `.dart` files
- `.ts` / `.js` / `.tsx` / `.jsx` files

## Files Ignored

- Test files (`.test.`, `.spec.`, `_test.dart`)
- Documentation (`.md`, `.txt`)
- Configuration files (`.json`, `.yaml`, `.yml`)
- Test directories (`test/`, `tests/`, `__tests__/`)

## Example Output

**When CHANGELOG needs updating:**
```
📝 CHANGELOG not updated

This PR modifies 5 code file(s).

Please update CHANGELOG.md with:
- Summary of changes
- Impact for users/developers
- Breaking changes (if any)

Modified files:
- lib/features/auth/login.dart
- lib/core/services/api_service.dart
- lib/utils/validators.dart
```

## CHANGELOG Format Recommendations

```markdown
## [Unreleased]

### Added
- New feature X
- New feature Y

### Changed
- Modified behavior of Z

### Fixed
- Bug fix for issue #123

### Breaking Changes
- API endpoint /old renamed to /new
```

## Best Practices

- Update CHANGELOG with every significant code change
- Use clear, descriptive entries
- Include issue/PR numbers when relevant
- Separate entries by type (Added, Changed, Fixed, etc.)
- Document breaking changes prominently

## Customization

To disable:
```typescript
changelogCheckerPlugin.config.enabled = false;
```

## Platforms Supported

- ✅ GitHub
- ✅ Bitbucket Cloud
- ✅ GitLab

## Dependencies

None - uses Danger JS built-in APIs only.

