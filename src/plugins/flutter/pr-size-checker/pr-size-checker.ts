/**
 * PR Size Checker Plugin
 * Verifica o tamanho do PR baseado em arquivos .dart (exclui gerados).
 * Se mais de 100 arquivos .dart alterados, bloqueia a PR.
 */
import { createPlugin, getDanger, sendFail, sendWarn } from "@types";

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

export default createPlugin(
  {
    name: "pr-size-checker",
    description: "Verifica tamanho do PR por arquivos .dart",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const allChanged = [...git.modified_files, ...git.created_files];

    const dartFiles = allChanged.filter(
      (f: string) => f.endsWith(".dart") && !GENERATED_PATTERNS.some((p) => p.test(f))
    );

    if (dartFiles.length === 0) return;

    if (dartFiles.length > MAX_DART_FILES) {
      sendFail(
        `PR COM MUITOS ARQUIVOS

Esta PR altera **${dartFiles.length} arquivos .dart** (limite: ${MAX_DART_FILES}).

### Problema Identificado

PRs com mais de ${MAX_DART_FILES} arquivos são extremamente difíceis de revisar e aumentam o risco de bugs passarem despercebidos.

### 🎯 AÇÃO NECESSÁRIA

Divida em PRs menores agrupando por:
- Feature ou módulo
- Camada (domain, data, presentation)
- Tipo de mudança (refactor, feature, fix)

### 🚀 Objetivo

PRs menores = revisões melhores = menos bugs em produção.

📖 [Google Engineering: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)`
      );
    } else if (dartFiles.length > 60) {
      sendWarn(
        `**PR grande** — ${dartFiles.length} arquivos .dart alterados. Considere dividir em PRs menores.`
      );
    }
  }
);
