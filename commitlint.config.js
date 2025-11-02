export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Tipos permitidos (personalizados para o projeto)
    "type-enum": [
      2,
      "always",
      [
        "feat", // Nova funcionalidade
        "fix", // Correção de bug
        "docs", // Apenas documentação
        "style", // Formatação, ponto e vírgula, etc (sem mudança de código)
        "refactor", // Refatoração (sem nova feature ou fix)
        "perf", // Melhoria de performance
        "test", // Adicionar/corrigir testes
        "build", // Mudanças no build ou dependências
        "ci", // Mudanças em CI/CD
        "chore", // Outras mudanças que não modificam src ou test
        "revert", // Reverter commit anterior
      ],
    ],
    // Scope opcional mas recomendado
    "scope-empty": [1, "never"],
    // Subject obrigatório
    "subject-empty": [2, "never"],
    // Subject em minúscula
    "subject-case": [2, "always", "lower-case"],
    // Corpo com linha em branco antes
    "body-leading-blank": [2, "always"],
    // Footer com linha em branco antes
    "footer-leading-blank": [2, "always"],
    // Tamanho máximo do header (type + scope + subject)
    "header-max-length": [2, "always", 100],
    // Subject não pode terminar com ponto
    "subject-full-stop": [2, "never", "."],
  },
};
