/**
 * Presentation Encapsulation Plugin
 *
 * Detecta variáveis, métodos, getters e setters públicos em classes State<>
 * na camada presentation que deveriam ser privados (prefixados com _).
 *
 * Escopo:
 * - Arquivos .dart na pasta presentation/ (ou subpastas), sem gerados e sem testes
 *   (`_test.dart` e qualquer pasta `test/`, `test_driver/` ou `integration_test/` no caminho)
 * - Apenas classes que estendem `*State<...>` (State<>, ConsumerState<> e variantes)
 * - NÃO verifica a classe StatefulWidget em si (seus campos são a API pública do widget)
 *
 * Exceções (NÃO reportados):
 * - Classe com `// ignore: presentation-encapsulation` ou que se expõe por builder
 *   (`widget.builder(this)`, `widget.builder(context, this)`, `widget.builder(state: this)`)
 * - Membros com @override, @protected, @visibleForTesting, @visibleForOverriding, @mustCallSuper
 *   ou com `// ignore: presentation-encapsulation`
 * - Membros static, construtores e operadores
 * - Membros já privados (prefixados com _) ou que não começam com letra minúscula
 */
import {
  DartCall,
  DartClass,
  DartFile,
  DartLayer,
  DartMemberKind,
  createPlugin,
  sendFormattedFail,
  sendMessage,
} from "@types";

const PLUGIN_NAME = "presentation-encapsulation";

/** Pastas de teste: qualquer uma no caminho (inclusive dentro de `lib/`) exclui o arquivo. */
const TEST_FOLDERS = ["test", "test_driver", "integration_test"];

const SKIP_ANNOTATIONS = [
  "override",
  "protected",
  "visibleForTesting",
  "visibleForOverriding",
  "mustCallSuper",
];

/** Nome público no formato verificado (`_privado` e `Maiusculo` ficam de fora). */
const PUBLIC_NAME_RE = /^[a-z]\w*$/;

type MemberKind = "variable" | "method" | "getter" | "setter";

const MEMBER_KINDS = new Map<DartMemberKind, MemberKind>([
  [DartMemberKind.Field, "variable"],
  [DartMemberKind.Method, "method"],
  [DartMemberKind.Getter, "getter"],
  [DartMemberKind.Setter, "setter"],
]);

const KIND_LABELS: Record<MemberKind, string> = {
  variable: "Variável",
  method: "Método",
  getter: "Getter",
  setter: "Setter",
};

interface PublicMember {
  name: string;
  kind: MemberKind;
  line: number;
}

/** Classe `extends XState<...>` (State, ConsumerState, HookState...). */
function isStateClass(cls: DartClass): boolean {
  const superclass = cls.superclass;
  return (
    superclass !== null &&
    (superclass.name?.endsWith("State") ?? false) &&
    superclass.typeArguments.length > 0
  );
}

/** Algum argumento é o próprio `this`. */
function passesThis(call: DartCall): boolean {
  return call.arguments.some((arg) => arg.value.compact === "this");
}

/**
 * O State se expõe ao widget: `widget.xxx(this)`, `widget.xxx(context, this)`,
 * `widget.xxx(state: this)` ou `this` dentro de uma chamada no argumento (`widget.xxx(Foo(this))`).
 */
function isBuilderPattern(file: DartFile, cls: DartClass): boolean {
  return file
    .calls()
    .some(
      (call) =>
        cls.containsLine(call.line) &&
        call.receiver === "widget" &&
        (passesThis(call) || call.arguments.some((arg) => arg.value.calls.some(passesThis)))
    );
}

/** Campos, métodos, getters e setters públicos da classe, na ordem do arquivo. */
function findPublicMembers(cls: DartClass): PublicMember[] {
  const members: PublicMember[] = [];
  for (const member of cls.members) {
    if (
      member.memberKind === DartMemberKind.Constructor ||
      member.memberKind === DartMemberKind.Unknown
    )
      continue;
    const kind = MEMBER_KINDS.get(member.memberKind);
    if (kind === undefined) continue; // operador
    if (member.isStatic || !PUBLIC_NAME_RE.test(member.name)) continue;
    if (SKIP_ANNOTATIONS.some((a) => member.hasAnnotation(a))) continue;
    if (member.isIgnoredBy(PLUGIN_NAME)) continue;
    members.push({ name: member.name, kind, line: member.nameLine });
  }
  return members;
}

export default createPlugin(
  {
    name: PLUGIN_NAME,
    description:
      "Detecta membros públicos em State classes da presentation que deveriam ser privados",
    enabled: true,
  },
  async () => {
    const dartFiles = DartFile.changed({ createdFirst: true, includeTests: true }).filter(
      (f) =>
        f.path.inLayer(DartLayer.Presentation) &&
        !f.path.fileName.endsWith("_test.dart") &&
        !TEST_FOLDERS.some((folder) => f.path.inFolder(folder))
    );

    console.log(`[${PLUGIN_NAME}] Arquivos: presentation=${dartFiles.length}`);

    if (dartFiles.length === 0) return;

    let totalViolations = 0;
    let totalStateClasses = 0;
    let skippedBuilder = 0;
    let skippedIgnore = 0;

    for (const file of dartFiles) {
      const filePath = file.path.path;

      for (const stateClass of file.classes.filter(isStateClass)) {
        totalStateClasses++;
        if (stateClass.isIgnoredBy(PLUGIN_NAME)) {
          skippedIgnore++;
          continue;
        }
        if (isBuilderPattern(file, stateClass)) {
          skippedBuilder++;
          console.log(
            `[${PLUGIN_NAME}] Builder pattern detectado em ${stateClass.name} (${filePath})`
          );
          continue;
        }

        const publicMembers = findPublicMembers(stateClass);
        if (publicMembers.length === 0) continue;

        console.log(
          `[${PLUGIN_NAME}] ${stateClass.name}: ${publicMembers.length} membro(s) público(s) em ${filePath}`
        );

        for (const member of publicMembers) {
          totalViolations++;
          const kindLabel = KIND_LABELS[member.kind];
          const privateName = `_${member.name}`;

          sendFormattedFail({
            title: `${kindLabel.toUpperCase()} PÚBLICO EM STATE — DEVERIA SER PRIVADO`,
            description: `${kindLabel} **\`${member.name}\`** em \`${stateClass.name}\` é público mas deveria ser privado (\`${privateName}\`).`,
            problem: {
              wrong:
                member.kind === "getter"
                  ? `Type get ${member.name} => ...;`
                  : member.kind === "setter"
                    ? `set ${member.name}(Type value) { ... }`
                    : member.kind === "method"
                      ? `void ${member.name}() { ... }`
                      : `late Type ${member.name};`,
              correct:
                member.kind === "getter"
                  ? `Type get ${privateName} => ...;`
                  : member.kind === "setter"
                    ? `set ${privateName}(Type value) { ... }`
                    : member.kind === "method"
                      ? `void ${privateName}() { ... }`
                      : `late Type ${privateName};`,
              wrongLabel: `${kindLabel} público`,
              correctLabel: `${kindLabel} privado`,
            },
            action: {
              text: `Renomeie \`${member.name}\` para \`${privateName}\`:`,
              code: `// ${member.name} → ${privateName}`,
            },
            objective:
              "Membros de **State** devem ser **privados** (`_`). O State é um detalhe de implementação — sua API não deve vazar para fora do widget.",
            file: filePath,
            line: member.line,
          });
        }
      }
    }

    console.log(
      `[${PLUGIN_NAME}] Resultado: stateClasses=${totalStateClasses} builder=${skippedBuilder} ignore=${skippedIgnore} violações=${totalViolations}`
    );

    if (totalViolations > 0) {
      sendMessage(
        `**Presentation Encapsulation**: ${totalViolations} membro(s) público(s) em State classes que deveria(m) ser privado(s)`
      );
    }
  }
);
