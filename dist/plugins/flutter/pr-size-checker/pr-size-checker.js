"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * PR Size Checker Plugin
 * Verifica o tamanho do PR baseado em arquivos .dart (exclui gerados).
 * Se mais de 100 arquivos .dart alterados, bloqueia a PR.
 */
const _types_1 = require("../../../types");
const GENERATED_PATTERNS = [
  /\.g\.dart$/,
  /\.freezed\.dart$/,
  /\.mocks\.dart$/,
  /\.gen\.dart$/,
  /pubspec\.lock$/,
  /\.pod$/,
  /Pods\//,
  /\.pbxproj$/,
];
const MAX_DART_FILES = 100;
exports.default = (0, _types_1.createPlugin)(
  {
    name: "pr-size-checker",
    description: "Verifica tamanho do PR por arquivos .dart",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const allChanged = [...git.modified_files, ...git.created_files];
    const dartFiles = allChanged.filter(
      (f) => f.endsWith(".dart") && !GENERATED_PATTERNS.some((p) => p.test(f))
    );
    if (dartFiles.length === 0) return;
    if (dartFiles.length > MAX_DART_FILES) {
      (0, _types_1.sendFail)(
        `**PR muito grande** — ${dartFiles.length} arquivos .dart alterados (limite: ${MAX_DART_FILES}). Divida em PRs menores.`
      );
    } else if (dartFiles.length > 60) {
      (0, _types_1.sendWarn)(
        `**PR grande** — ${dartFiles.length} arquivos .dart alterados. Considere dividir em PRs menores.`
      );
    }
  }
);
