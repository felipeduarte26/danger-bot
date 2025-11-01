# Plugin Test

## Overview

Plugin para teste

## Purpose

This plugin helps maintain:
- Code quality
- Best practices
- Consistency across the project

## How It Works

1. Analyzes modified/created files
2. Runs validation checks
3. Reports findings in the PR

## Configuration

```typescript
import { pluginTestPlugin } from "danger-bot";

const plugins = [
  pluginTestPlugin,  // Enabled by default
];
```

## Example Output

**When issues are found:**
```
[Warning message example]
```

**When everything is OK:**
```
✅ Plugin Test: All checks passed!
```

## Best Practices

- Follow the plugin recommendations
- Keep code clean and maintainable
- Document your changes

## Customization

To disable this plugin:

```typescript
pluginTestPlugin.config.enabled = false;
```

## Platforms Supported

- ✅ GitHub
- ✅ Bitbucket Cloud
- ✅ GitLab

## Dependencies

None - uses Danger JS built-in APIs only.

## Related Plugins

- `pr-size-checker` - PR size validation
- `changelog-checker` - CHANGELOG validation

---

**Note:** Update this documentation with specific details about your plugin's functionality.
