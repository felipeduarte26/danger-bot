/**
 * README TEMPLATE
 * ===============
 * Template para documentação de plugins em PT-BR, na estrutura dos READMEs existentes
 */

/**
 * Gerar README do plugin em PT-BR
 * @param {string} name - Nome do plugin
 * @param {string} description - Descrição do plugin
 * @returns {string} - Conteúdo do README
 */
export function generatePluginReadme(name, description) {
  return `# ${name}

${description}

## O que verifica

- Cada caso reportado, com o trecho de código que o dispara
- Exceções que evitam falso positivo (testes, arquivos gerados, barrel files…)

## Severidade

- **Tipo:** \`fail\`

## Exemplo

\`\`\`dart
// ❌ Errado
padraoProblematico();

// ✅ Correto
padraoCorreto();
\`\`\`

## Referências

- [Nome da doc oficial](https://api.flutter.dev/)
`;
}
