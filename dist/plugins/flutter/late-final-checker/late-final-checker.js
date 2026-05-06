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
 * Late Final Checker Plugin
 * Detecta uso desnecessário de late final com valor atribuído na declaração.
 *
 * late final só faz sentido quando o valor é atribuído DEPOIS (ex: initState).
 * Se já tem valor na declaração, deve ser apenas final ou const.
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const LATE_FINAL_WITH_VALUE = /late\s+final\s+(?:[\w<>,?\s]+\s+)?(\w+)\s*=\s*.+;/;
exports.default = (0, _types_1.createPlugin)(
  {
    name: "late-final-checker",
    description: "Detecta late final desnecessário com valor atribuído",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(LATE_FINAL_WITH_VALUE);
        if (!match) continue;
        const trimmed = line.trim();
        (0, _types_1.sendFormattedFail)({
          title: "LATE FINAL DESNECESSÁRIO",
          description:
            "`late final` com valor atribuído na declaração não faz sentido. O `late` só é necessário quando a atribuição acontece **depois** (ex: `initState`, `didChangeDependencies`).",
          problem: {
            wrong: trimmed,
            correct: trimmed.replace(/late\s+/, ""),
            wrongLabel: "late final com valor imediato",
            correctLabel: "Apenas final (sem late)",
          },
          action: {
            text: "Remova o `late` — o valor já é atribuído na declaração:",
            code: trimmed.replace(/late\s+/, ""),
          },
          objective: "Usar `late` apenas quando necessário — código mais claro e previsível.",
          reference: {
            text: "Effective Dart: Usage",
            url: "https://dart.dev/effective-dart/usage#dont-use-late-when-a-constructor-initializer-will-do",
          },
          file,
          line: i + 1,
        });
      }
    }
  }
);
