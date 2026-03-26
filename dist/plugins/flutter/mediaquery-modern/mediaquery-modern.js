"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * MediaQuery Modern Plugin
 * Detecta uso de MediaQuery.of(context) e sugere APIs modernas do Flutter 3.10+.
 *
 * MediaQuery.of(context) faz o widget rebuildar quando QUALQUER propriedade
 * do MediaQuery muda. As APIs novas (sizeOf, paddingOf, etc.) fazem rebuild
 * apenas quando a propriedade específica muda — melhor performance.
 *
 * Também detecta o padrão intermediário:
 *   final mq = MediaQuery.of(context);
 *   mq.size / mq.padding / etc.
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const PROPERTY_ALTERNATIVES = {
  size: "MediaQuery.sizeOf(context)",
  padding: "MediaQuery.paddingOf(context)",
  viewInsets: "MediaQuery.viewInsetsOf(context)",
  viewPadding: "MediaQuery.viewPaddingOf(context)",
  orientation: "MediaQuery.orientationOf(context)",
  textScaleFactor: "MediaQuery.textScaleFactorOf(context)",
  textScaler: "MediaQuery.textScalerOf(context)",
  platformBrightness: "MediaQuery.platformBrightnessOf(context)",
  devicePixelRatio: "MediaQuery.devicePixelRatioOf(context)",
  alwaysUse24HourFormat: "MediaQuery.alwaysUse24HourFormatOf(context)",
  accessibleNavigation: "MediaQuery.accessibleNavigationOf(context)",
  invertColors: "MediaQuery.invertColorsOf(context)",
  highContrast: "MediaQuery.highContrastOf(context)",
  boldText: "MediaQuery.boldTextOf(context)",
};
const MQ_OF_RE = /MediaQuery\.of\(\s*(\w+)\s*\)\.(\w+)/;
const MQ_ASSIGN_RE = /(?:final|var|MediaQueryData)\s+(\w+)\s*=\s*MediaQuery\.of\(\s*\w+\s*\)/;
exports.default = (0, _types_1.createPlugin)(
  {
    name: "mediaquery-modern",
    description: "Sugere APIs modernas do MediaQuery (Flutter 3.10+)",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const mqVarNames = new Set();
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const assignMatch = line.match(MQ_ASSIGN_RE);
        if (assignMatch) {
          mqVarNames.add(assignMatch[1]);
          (0, _types_1.sendFormattedFail)({
            title: "MEDIAQUERY.OF() — USE API MODERNA",
            description:
              "Atribuição de `MediaQuery.of()` a variável causa rebuilds desnecessários quando **qualquer** propriedade muda.",
            problem: {
              wrong: line.trim(),
              correct: `final size = MediaQuery.sizeOf(context);\nfinal padding = MediaQuery.paddingOf(context);`,
              wrongLabel: "Rebuild quando QUALQUER propriedade muda",
              correctLabel: "APIs específicas — rebuild seletivo",
            },
            action: {
              text: "Substitua por APIs específicas conforme a propriedade usada:",
              code: `final size = MediaQuery.sizeOf(context);\nfinal padding = MediaQuery.paddingOf(context);\nfinal orientation = MediaQuery.orientationOf(context);`,
            },
            objective: "APIs específicas fazem rebuild **apenas quando a propriedade usada muda**.",
            reference: {
              text: "Flutter MediaQuery",
              url: "https://api.flutter.dev/flutter/widgets/MediaQuery-class.html",
            },
            file,
            line: i + 1,
          });
          continue;
        }
        const directMatch = line.match(MQ_OF_RE);
        if (directMatch) {
          const property = directMatch[2];
          const alternative = PROPERTY_ALTERNATIVES[property];
          if (alternative) {
            (0, _types_1.sendFormattedFail)({
              title: "MEDIAQUERY.OF() — USE API MODERNA",
              description: `\`MediaQuery.of(...).${property}\` causa rebuilds desnecessários.`,
              problem: {
                wrong: line.trim(),
                correct: line.trim().replace(MQ_OF_RE, alternative),
                wrongLabel: "Rebuild quando QUALQUER propriedade muda",
                correctLabel: `Rebuild apenas quando ${property} muda`,
              },
              action: {
                text: `Substitua por \`${alternative}\`:`,
                code: line.trim().replace(MQ_OF_RE, alternative),
              },
              objective: "Melhor **performance** com rebuilds mais eficientes.",
              reference: {
                text: "Flutter MediaQuery",
                url: "https://api.flutter.dev/flutter/widgets/MediaQuery-class.html",
              },
              file,
              line: i + 1,
            });
          }
          continue;
        }
        if (mqVarNames.size > 0) {
          for (const varName of mqVarNames) {
            const varUseRe = new RegExp(`${varName}\\.(\\w+)`);
            const varMatch = line.match(varUseRe);
            if (varMatch) {
              const property = varMatch[1];
              const alternative = PROPERTY_ALTERNATIVES[property];
              if (alternative) {
                (0, _types_1.sendFormattedFail)({
                  title: "MEDIAQUERY.OF() — USE API MODERNA",
                  description: `\`${varName}.${property}\` vem de \`MediaQuery.of()\` — causa rebuilds desnecessários.`,
                  problem: {
                    wrong: `final ${varName} = MediaQuery.of(context);\n... ${varName}.${property} ...`,
                    correct: `final ${property} = ${alternative};`,
                    wrongLabel: "Via variável intermediária",
                    correctLabel: "API específica diretamente",
                  },
                  action: {
                    text: `Substitua por \`${alternative}\`:`,
                    code: `final ${property} = ${alternative};`,
                  },
                  objective: "Melhor **performance** com rebuilds mais eficientes.",
                  reference: {
                    text: "Flutter MediaQuery",
                    url: "https://api.flutter.dev/flutter/widgets/MediaQuery-class.html",
                  },
                  file,
                  line: i + 1,
                });
              }
            }
          }
        }
      }
    }
  }
);
