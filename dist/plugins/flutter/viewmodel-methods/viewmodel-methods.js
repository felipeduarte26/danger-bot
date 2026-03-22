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
 * ViewModel Methods Plugin
 * Verifica que métodos públicos em ViewModels retornem apenas void/Future<void>.
 * Baseado na boa prática do Bloc: prefer_void_public_cubit_methods.
 *
 * ViewModels devem comunicar mudanças via State (emit), nunca retornando valores.
 *
 * Detecta ViewModels por:
 * - Arquivo: *_view_model.dart ou *_viewmodel.dart
 * - Classe: extends ViewModelBase
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const ALLOWED_RETURN_TYPES = new Set(["void", "Future<void>"]);
const LIFECYCLE_METHODS = new Set([
  "initViewModel",
  "dispose",
  "close",
  "toString",
  "hashCode",
  "noSuchMethod",
  "build",
]);
exports.default = (0, _types_1.createPlugin)(
  {
    name: "viewmodel-methods",
    description: "Verifica que métodos públicos de ViewModel retornem void",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) => (f.endsWith("_view_model.dart") || f.endsWith("_viewmodel.dart")) && fs.existsSync(f)
    );
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("extends ViewModelBase")) continue;
      const lines = content.split("\n");
      let insideClass = false;
      let braceDepth = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/class\s+\w+\s+extends\s+ViewModelBase/)) {
          insideClass = true;
          braceDepth = 0;
        }
        if (!insideClass) continue;
        for (const ch of line) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }
        if (insideClass && braceDepth <= 0 && line.includes("}")) {
          insideClass = false;
          continue;
        }
        if (braceDepth !== 1) continue;
        const methodMatch = line.match(/^\s+([\w<>,\s]+?)\s+([a-zA-Z_]\w*)\s*\(/);
        if (!methodMatch) continue;
        const returnType = methodMatch[1].trim();
        const methodName = methodMatch[2];
        if (methodName.startsWith("_")) continue;
        if (line.includes("@override")) continue;
        if (i > 0 && lines[i - 1].trim() === "@override") continue;
        if (LIFECYCLE_METHODS.has(methodName)) continue;
        if (returnType === "const" || returnType === "final" || returnType === "static") continue;
        if (line.includes("factory") || line.includes("operator")) continue;
        if (!ALLOWED_RETURN_TYPES.has(returnType)) {
          (0, _types_1.sendFail)(
            `MÉTODO PÚBLICO COM RETORNO EM VIEWMODEL

Método \`${methodName}\` retorna \`${returnType}\` — deveria retornar \`void\` ou \`Future<void>\`.

### Problema Identificado

ViewModels usam **State** para comunicar mudanças. Métodos públicos não devem retornar valores diretamente.

\`\`\`dart
// ❌ Retorna valor
${returnType} ${methodName}(...) {
  ...
  return value;
}

// ✅ Usa emit para comunicar via State
Future<void> ${methodName}(...) async {
  ...
  emit(NewState(value));
}
\`\`\`

### 🎯 AÇÃO NECESSÁRIA

Altere o retorno para \`void\` ou \`Future<void>\` e use \`emit()\` para comunicar o resultado via State.

### 🚀 Objetivo

Seguir padrão **Bloc/Cubit** — ViewModels comunicam via State, não via retorno.

📖 [prefer_void_public_cubit_methods](https://bloclibrary.dev/lint-rules/prefer_void_public_cubit_methods/)`,
            file,
            i + 1
          );
        }
      }
    }
  }
);
