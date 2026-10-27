/**
 * Avoid God Class Plugin
 * Detecta classes muito grandes que violam o princípio de responsabilidade única.
 * Verifica número de métodos públicos e total de linhas da classe.
 *
 * Thresholds:
 * - Mais de 300 linhas → warning (padrão)
 * - Mais de 400 linhas → warning (ViewModels: *_viewmodel.dart que extends ViewModelBase;
 *   as linhas dos construtores do corpo não contam)
 * - Mais de 600 linhas → warning (arquivos em presentation/)
 * - Mais de 15 métodos públicos → warning (não contam `_privados`, `@override`, `static`,
 *   getters, setters, operadores e construtores)
 * - Exclui: `_test.dart`, arquivos gerados, arquivos de módulo (`_module.dart`,
 *   `_module_binding.dart`, `_module_routing.dart`), enums, mixins (inclusive `mixin class`)
 *   e extensions
 */
import {
  DartClass,
  DartFile,
  DartLayer,
  DartMemberKind,
  createPlugin,
  sendFormattedFail,
} from "@types";

const MAX_CLASS_LINES = 300;
const MAX_CLASS_LINES_PRESENTATION = 600;
const MAX_CLASS_LINES_VIEWMODEL = 400;
const MAX_PUBLIC_METHODS = 15;

const MODULE_CONFIG_SUFFIXES = ["_module_binding.dart", "_module_routing.dart", "_module.dart"];

/** Nome de método público no formato verificado (`_privado` e `Maiusculo` ficam de fora). */
const PUBLIC_METHOD_NAME_RE = /^[a-z]\w*$/;

function isViewModel(file: DartFile, cls: DartClass): boolean {
  return file.path.fileName.endsWith("_viewmodel.dart") && cls.superclass?.name === "ViewModelBase";
}

function getMaxClassLines(file: DartFile, cls: DartClass): number {
  if (isViewModel(file, cls)) return MAX_CLASS_LINES_VIEWMODEL;
  if (file.path.inLayer(DartLayer.Presentation)) return MAX_CLASS_LINES_PRESENTATION;
  return MAX_CLASS_LINES;
}

/** Linhas dos construtores escritos no corpo (o primary constructor fica no cabeçalho). */
function constructorLineCount(cls: DartClass): number {
  return cls.constructors.filter((c) => !c.isPrimary).reduce((sum, c) => sum + c.lineCount, 0);
}

/** Métodos públicos, na ordem do arquivo. */
function publicMethodsOf(cls: DartClass): string[] {
  return cls.methods
    .filter(
      (m) =>
        m.memberKind === DartMemberKind.Method &&
        PUBLIC_METHOD_NAME_RE.test(m.name) &&
        !m.isStatic &&
        !m.isOverride
    )
    .map((m) => m.name);
}

export default createPlugin(
  {
    name: "avoid-god-class",
    description: "Detecta classes muito grandes que violam o princípio de responsabilidade única",
    enabled: true,
  },
  async () => {
    const dartFiles = DartFile.changed({ includeTests: true }).filter(
      (f) =>
        !f.path.fileName.endsWith("_test.dart") &&
        !MODULE_CONFIG_SUFFIXES.some((suffix) => f.path.fileName.endsWith(suffix))
    );

    for (const file of dartFiles) {
      const filePath = file.path.path;

      for (const cls of file.classes.filter((c) => !c.isMixinClass)) {
        const maxLines = getMaxClassLines(file, cls);
        const viewModel = isViewModel(file, cls);
        const ctorLines = viewModel ? constructorLineCount(cls) : 0;
        const effectiveLineCount = cls.lineCount - ctorLines;

        if (effectiveLineCount > maxLines) {
          const lineDetail =
            ctorLines > 0
              ? `**${effectiveLineCount} linhas** (${cls.lineCount} total, ${ctorLines} de construtor ignoradas)`
              : `**${effectiveLineCount} linhas**`;

          sendFormattedFail({
            title: "CLASSE MUITO GRANDE",
            description: `A classe \`${cls.name}\` tem ${lineDetail} (máximo recomendado: ${maxLines}).`,
            problem: {
              wrong: `class ${cls.name} { // ${effectiveLineCount} linhas }`,
              correct: `class ${cls.name}A { // responsabilidade A }\nclass ${cls.name}B { // responsabilidade B }`,
              wrongLabel: `${effectiveLineCount} linhas — difícil de manter`,
              correctLabel: "Dividida por responsabilidade",
            },
            action: {
              text: "Considere extrair responsabilidades para classes menores:",
              code: `// Identifique grupos de métodos relacionados\n// e extraia para classes dedicadas.\n// Ex: métodos de validação → ${cls.name}Validator\n// Ex: métodos de formatação → ${cls.name}Formatter`,
            },
            objective:
              "Seguir o **Princípio de Responsabilidade Única** (SRP) — cada classe deve ter um único motivo para mudar.",
            reference: {
              text: "SOLID: Single Responsibility Principle",
              url: "https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html",
            },
            file: filePath,
            line: cls.line,
          });
        }

        const publicMethods = publicMethodsOf(cls);
        if (publicMethods.length > MAX_PUBLIC_METHODS) {
          sendFormattedFail({
            title: "CLASSE COM MUITOS MÉTODOS PÚBLICOS",
            description: `A classe \`${cls.name}\` tem **${publicMethods.length} métodos públicos** (máximo recomendado: ${MAX_PUBLIC_METHODS}).`,
            problem: {
              wrong: `class ${cls.name} {\n${publicMethods
                .slice(0, 5)
                .map((m) => `  void ${m}() { }`)
                .join("\n")}\n  // ... +${publicMethods.length - 5} métodos\n}`,
              correct: `class ${cls.name} {\n  // Apenas métodos da responsabilidade principal\n}`,
              wrongLabel: `${publicMethods.length} métodos públicos`,
              correctLabel: "Responsabilidade focada",
            },
            action: {
              text: "Agrupe métodos por responsabilidade e extraia para classes dedicadas.",
              code: `// Muitos métodos públicos indicam múltiplas responsabilidades.\n// Considere padrões como:\n// - Strategy para comportamentos variáveis\n// - Facade para simplificar interfaces complexas\n// - Delegation para distribuir responsabilidades`,
            },
            objective: "Manter classes **coesas** e com **baixo acoplamento**.",
            reference: {
              text: "SOLID: Single Responsibility Principle",
              url: "https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html",
            },
            file: filePath,
            line: cls.line,
          });
        }
      }
    }
  }
);
