/**
 * README TEMPLATE
 * ===============
 * Template para documentação de plugins
 */

/**
 * Gerar README do plugin
 * @param {string} name - Nome do plugin
 * @param {string} description - Descrição do plugin
 * @param {string} kebabName - Nome em kebab-case
 * @param {string} camelName - Nome em camelCase
 * @returns {string} - Conteúdo do README
 */
export function generatePluginReadme(name, description, kebabName, camelName) {
  return `# ${name}

## Overview

${description}

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

\`\`\`typescript
import { ${camelName}Plugin } from "@diletta/danger-bot";

const plugins = [
  ${camelName}Plugin,  // Enabled by default
];
\`\`\`

## Example Output

**When issues are found:**
\`\`\`
[Warning message example]
\`\`\`

**When everything is OK:**
\`\`\`
✅ ${name}: All checks passed!
\`\`\`

## Best Practices

- Follow the plugin recommendations
- Keep code clean and maintainable
- Document your changes

## Customization

To disable this plugin:

\`\`\`typescript
${camelName}Plugin.config.enabled = false;
\`\`\`

## Platforms Supported

- ✅ GitHub
- ✅ Bitbucket Cloud
- ✅ GitLab

## Dependencies

None - uses Danger JS built-in APIs only.

## Related Plugins

- \`pr-size-checker\` - PR size validation
- \`changelog-checker\` - CHANGELOG validation

---

**Note:** Update this documentation with specific details about your plugin's functionality.
`;
}
