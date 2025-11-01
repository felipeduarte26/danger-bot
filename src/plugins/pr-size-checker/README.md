# PR Size Checker

## Overview

Validates the size of Pull Requests and alerts when they are too large, helping maintain code review quality.

## Purpose

Large Pull Requests are difficult to review and more prone to bugs. This plugin:
- Warns when PRs exceed recommended size limits
- Encourages smaller, more focused PRs
- Improves code review efficiency

## How It Works

The plugin analyzes the number of additions and deletions in a PR and provides warnings based on configurable thresholds:

- **Large PR** (500+ lines): Warning message
- **Very Large PR** (1000+ lines): Strong warning with recommendations

## Configuration

```typescript
import { prSizeCheckerPlugin } from "danger-bot";

const plugins = [
  prSizeCheckerPlugin,  // Enabled by default
];
```

## Customization

To disable this plugin:

```typescript
prSizeCheckerPlugin.config.enabled = false;
```

## Thresholds

| Threshold | Lines Changed | Action |
|-----------|---------------|--------|
| Normal | < 500 | Success message |
| Large | 500-1000 | Warning |
| Very Large | > 1000 | Strong warning |

## Example Output

**Normal PR (< 500 lines):**
```
✅ PR Size: 234 lines (OK)
```

**Large PR (500-1000 lines):**
```
⚠️ Large PR (678 lines)

This PR has 456 additions and 222 deletions.

Consider reviewing if it can be split into smaller parts.
```

**Very Large PR (> 1000 lines):**
```
🚨 VERY LARGE PR (1,245 lines)

This PR has 980 additions and 265 deletions.

Recommendation: Consider splitting into smaller PRs for easier review.

Smaller PRs are:
- ✅ Easier to review
- ✅ Less prone to bugs
- ✅ Faster to merge
```

## Best Practices

- Keep PRs under 500 lines when possible
- Split large features into multiple PRs
- Focus each PR on a single concern
- Use feature flags for incremental releases

## Platforms Supported

- ✅ GitHub
- ✅ Bitbucket Cloud
- ✅ GitLab

## Dependencies

None - uses Danger JS built-in APIs only.

