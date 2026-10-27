/**
 * README TEMPLATE
 * ===============
 * Template para documentação de plugins em PT-BR, na estrutura dos READMEs existentes
 */

/** Severidade e exemplo ❌/✅ de cada tipo de regra (`PLUGIN_KINDS` do plugin-template). */
const EXAMPLES = {
  call: {
    severity: "fail",
    example: `// ❌ Errado
padraoProblematico();

// ✅ Correto
padraoCorreto();`,
  },
  class: {
    severity: "fail",
    example: `// ❌ Errado
class ExemploModel {
  // ...
}

// ✅ Correto
class ExemploModel {
  void membroObrigatorio() {}
}`,
  },
  diff: {
    severity: "warn",
    example: `// ❌ Errado
Text('texto fixo');

// ✅ Correto
Text(valorCorreto);`,
  },
  path: {
    severity: "fail",
    example: `// ❌ Errado
lib/features/order/domain/usecases/get_order.dart

// ✅ Correto
lib/features/order/domain/usecases/get_order_usecase.dart`,
  },
};

/**
 * Gerar README do plugin em PT-BR
 * @param {string} name - Nome do plugin
 * @param {string} description - Descrição do plugin
 * @param {string} [kind] - Tipo de regra (`PLUGIN_KINDS[].id`); padrão: `call`
 * @returns {string} - Conteúdo do README
 */
export function generatePluginReadme(name, description, kind = "call") {
  const { severity, example } = EXAMPLES[kind] ?? EXAMPLES.call;
  return `# ${name}

${description}

## O que verifica

- Cada caso reportado, com o trecho de código que o dispara
- Exceções que evitam falso positivo (testes, arquivos gerados, barrel files…)

## Severidade

- **Tipo:** \`${severity}\`

## Exemplo

\`\`\`dart
${example}
\`\`\`

## Referências

- [Nome da doc oficial](https://api.flutter.dev/)
`;
}
