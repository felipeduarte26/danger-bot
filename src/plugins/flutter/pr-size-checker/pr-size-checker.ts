/**
 * PR Size Checker Plugin
 * Verifica o tamanho do PR pela quantidade de arquivos .dart criados/modificados
 * (deletados não contam). Acima de 60 avisa; acima de 100 bloqueia a PR.
 *
 * Ignora os arquivos de GENERATED_PATTERNS (.g, .freezed, .mocks, .gen e os de
 * ferramentas nativas).
 */
import { DartPath, createPlugin, getDanger, sendFail, sendWarn } from "@types";

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

const WARN_DART_FILES = 60;
const MAX_DART_FILES = 100;

export default createPlugin(
  {
    name: "pr-size-checker",
    description: "Verifica tamanho do PR por arquivos .dart",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files]
      .map((f: string) => DartPath.of(f))
      .filter((file) => file.isDart && !GENERATED_PATTERNS.some((p) => p.test(file.path)));

    if (dartFiles.length === 0) return;

    if (dartFiles.length > MAX_DART_FILES) {
      sendFail(
        `**PR muito grande** — ${dartFiles.length} arquivos .dart alterados (limite: ${MAX_DART_FILES}). Divida em PRs menores.`
      );
    } else if (dartFiles.length > WARN_DART_FILES) {
      sendWarn(
        `**PR grande** — ${dartFiles.length} arquivos .dart alterados. Considere dividir em PRs menores.`
      );
    }
  }
);
