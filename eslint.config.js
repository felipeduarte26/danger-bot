import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // Ignorar arquivos
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "scripts/**/*.js",
      "bin/**/*.js",
      "**/*.d.ts",
      "eslint.config.js", // Ignorar o próprio arquivo de config
      "commitlint.config.js", // Ignorar config do commitlint
    ],
  },

  // Configuração base do ESLint
  js.configs.recommended,

  // Configurações recomendadas do TypeScript
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Configuração específica para TypeScript
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Regras customizadas
  {
    rules: {
      // TypeScript - Regras desabilitadas para o contexto do projeto
      "@typescript-eslint/no-explicit-any": "off", // Permitir any (necessário para Danger JS)
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off", // || é mais legível em alguns casos
      "@typescript-eslint/require-await": "off", // Permitir async sem await (para consistência de interface)
      "@typescript-eslint/prefer-regexp-exec": "off",
      "@typescript-eslint/no-require-imports": "off", // Alguns plugins precisam de require

      // TypeScript - Regras habilitadas
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // Geral
      "no-console": "off", // Permitir console.log em plugins e scripts
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-throw-literal": "error",
    },
  },

  // Prettier deve ser o último para sobrescrever formatação
  prettier
);
