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
      "scripts/**/*.cjs",
      "bin/**/*.js",
      "tests/**/*.cjs", // testes em node:test (CommonJS, fora do projeto TypeScript)
      ".parity/**", // dados da paridade (tools/parity)
      "tools/**", // scripts de manutenção (paridade), fora do pacote
      ".github/**", // scripts do CI (CommonJS, fora do projeto TypeScript)
      "**/*.d.ts",
      "eslint.config.js", // Ignorar o próprio arquivo de config
      "commitlint.config.js", // Ignorar config do commitlint
      "dangerfile.example.ts", // Arquivo de exemplo gerado pela CLI
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

  // Plugins leem o código Dart pelo modelo (src/dart), não com parser próprio.
  // Guia: docs/CRIANDO_PLUGINS.md. O primary-constructors fica de fora: ele
  // reescreve o código (gera o cabeçalho novo) e por isso trabalha com os tokens.
  {
    files: ["src/plugins/**/*.ts"],
    ignores: ["src/plugins/flutter/primary-constructors/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@types",
              importNames: [
                "getDartFiles",
                "getDartFilesInDirectory",
                "getDomainDartFiles",
                "getDataDartFiles",
                "getPresentationDartFiles",
                "isInLayer",
                "normalizePrimaryConstructorHeaders",
                "findPrimaryConstructors",
                "primaryConstructorFieldsByLine",
              ],
              message:
                "Helper legado: use o modelo Dart (DartFile.changed(), file.path.inLayer(), cls.fields, cls.header). Veja docs/CRIANDO_PLUGINS.md.",
            },
          ],
          patterns: [
            {
              group: ["**/dart/internal", "**/dart/internal/**"],
              message:
                "Internos do modelo: use a API pública (DartFile, DartClass, DartCall...). O que faltar vai para o src/dart, com teste.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.property.name=/^(source|text)$/]",
          message:
            "Não varra o texto do arquivo linha a linha: use o modelo Dart (file.classes, file.calls(), file.strings...). Veja docs/CRIANDO_PLUGINS.md.",
        },
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.callee.property.name='readFileSync']",
          message:
            "Não varra o texto do arquivo linha a linha: use DartFile.read(caminho) e o modelo Dart.",
        },
        {
          selector:
            "CallExpression[callee.property.name='readFileSync'][arguments.0.type!='Literal']",
          message:
            "Leia .dart com DartFile.read(caminho) / DartFile.changed() (cache compartilhado). readFileSync só para arquivo de caminho fixo (.gitignore, pubspec.yaml).",
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(test|exec)$/][arguments.0.property.name=/^(source|text|lineText)$/]",
          message:
            "Regex sobre o texto do código: use o fato do modelo (call.name, field.type, s.role...). Regex só no conteúdo da regra (field.name, string.value, comment.content).",
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(match|matchAll|search)$/][callee.object.property.name=/^(source|text|lineText)$/]",
          message:
            "Regex sobre o texto do código: use o fato do modelo (call.name, field.type, s.role...). Regex só no conteúdo da regra (field.name, string.value, comment.content).",
        },
        {
          selector: "BinaryExpression[operator=/^[!=]==?$/][right.value=/^[{}]$/]",
          message:
            "Não conte chaves: use o modelo (method.body, cls.endLine, node.contains(outro)).",
        },
        {
          selector:
            "MemberExpression[property.name=/^(lexed|raw|rawInfo|rawMember|tokenIndex|variableTokens|stringAtToken|lineAtOffset|columnAtOffset|expressionRanges)$|Tok(Index)?$/]",
          message:
            "Membro @internal do modelo Dart: use a propriedade pública (line, nameLine, compact, text...) ou acrescente uma no src/dart, com teste.",
        },
      ],
    },
  },

  // Prettier deve ser o último para sobrescrever formatação
  prettier
);
