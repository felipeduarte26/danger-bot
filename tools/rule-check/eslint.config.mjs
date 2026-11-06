// As proibições que o eslint.config.js do pacote aplica em src/plugins/, para uma regra local de
// um projeto (que importa de "@felipeduarte26/danger-bot"). O check.cjs usa com --lint; à mão:
//   <danger-bot>/node_modules/.bin/eslint -c <danger-bot>/tools/rule-check/eslint.config.mjs \
//     --no-config-lookup <arquivo.ts>   (rodando na pasta do arquivo)
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const tseslint = require("typescript-eslint");

const LEGACY = [
  "getDartFiles",
  "getDartFilesInDirectory",
  "getDomainDartFiles",
  "getDataDartFiles",
  "getPresentationDartFiles",
  "isInLayer",
  "normalizePrimaryConstructorHeaders",
  "findPrimaryConstructors",
  "primaryConstructorFieldsByLine",
];
const LEGACY_MESSAGE =
  "Helper legado: use o modelo Dart (DartFile.changed(), file.path.inLayer(), cls.fields, cls.header).";
const TEXT_REGEX =
  "Regex sobre o texto do código: use o fato do modelo (call.name, field.type, s.role...). Regex só no conteúdo da regra.";

export default [
  {
    files: ["**/*.ts", "**/*.js"],
    languageOptions: { parser: tseslint.parser },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@felipeduarte26/danger-bot", importNames: LEGACY, message: LEGACY_MESSAGE },
            { name: "@types", importNames: LEGACY, message: LEGACY_MESSAGE },
          ],
          patterns: [
            {
              group: ["**/dart/internal", "**/dart/internal/**"],
              message: "Internos do modelo: use a API pública (DartFile, DartClass, DartCall...).",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.property.name=/^(source|text)$/]",
          message: "Não varra o texto do arquivo linha a linha: use o modelo Dart.",
        },
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.callee.property.name='readFileSync']",
          message:
            "Não varra o arquivo linha a linha: use DartFile.read(caminho). Arquivo que não é Dart: comente o motivo.",
        },
        {
          selector:
            "CallExpression[callee.property.name='readFileSync'][arguments.0.type!='Literal']",
          message:
            "Leia .dart com DartFile.read(caminho) / DartFile.changed(). Arquivo que não é Dart: comente o motivo.",
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(test|exec)$/][arguments.0.property.name=/^(source|text|lineText)$/]",
          message: TEXT_REGEX,
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(match|matchAll|search)$/][callee.object.property.name=/^(source|text|lineText)$/]",
          message: TEXT_REGEX,
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
            "Membro @internal do modelo Dart: use a propriedade pública ou acrescente uma no pacote.",
        },
      ],
    },
  },
];
