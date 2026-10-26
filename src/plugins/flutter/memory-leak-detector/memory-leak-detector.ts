/**
 * Memory Leak Detector Plugin
 * Detecta disposables (Controllers, FocusNodes, Timers, Streams) em classes
 * State<> que não têm dispose/cancel correspondente.
 *
 * Para cada disposable encontrado como campo da classe, verifica se existe
 * uma chamada .dispose(), .cancel() (Timer, StreamSubscription) ou .close()
 * (StreamController) com o mesmo nome no método dispose() da própria classe.
 */
import {
  DartCall,
  DartClass,
  DartField,
  DartFile,
  DartMemberKind,
  createPlugin,
  sendFormattedFail,
} from "@types";

type CleanupMethod = "dispose" | "cancel" | "close";

interface Disposable {
  field: DartField;
  type: string;
  cleanup: CleanupMethod;
}

const DISPOSE_TYPES = [
  "TextEditingController",
  "AnimationController",
  "ScrollController",
  "PageController",
  "TabController",
  "DraggableScrollableController",
  "SearchController",
  "ExpansionTileController",
  "FocusNode",
  "FocusScopeNode",
  "ChangeNotifier",
  "ValueNotifier",
  "TransformationController",
  "UndoHistoryController",
  "OverlayPortalController",
];

const CANCEL_TYPES = ["Timer", "StreamSubscription"];

const CLOSE_TYPES = ["StreamController"];

const CLEANUP_METHODS = new Set<string>(["dispose", "cancel", "close"]);

export default createPlugin(
  {
    name: "memory-leak-detector",
    description: "Detecta possíveis memory leaks em States",
    enabled: true,
  },
  async () => {
    for (const file of DartFile.changed()) {
      for (const state of file.classes.filter((c) => c.extendsAny("State", "ViewState"))) {
        const disposables = findDisposables(state);
        if (disposables.length === 0) continue;

        const cleanupCalls = cleanupCallsOf(state);

        for (const d of disposables) {
          const action = d.cleanup;
          const name = d.field.name;
          const cleanupCall = action === "cancel" ? `${name}?.cancel()` : `${name}.${action}()`;

          if (cleanupCalls.some((call) => releases(call, name))) continue;

          sendFormattedFail({
            title: `VAZAMENTO DE MEMÓRIA — ${d.type} SEM ${action.toUpperCase()}()`,
            description: `\`${name}\` (${d.type}) não tem \`${action}()\` no método \`dispose()\`.`,
            problem: {
              wrong: `${d.type} ${name} = ...;\n// Sem ${action}() no dispose()`,
              correct: `@override\nvoid dispose() {\n  ${cleanupCall};\n  super.dispose();\n}`,
              wrongLabel: `Sem ${action}() — vazamento de memória`,
              correctLabel: `Com ${action}() no dispose()`,
            },
            action: {
              code: `@override\nvoid dispose() {\n  ${cleanupCall};\n  super.dispose();\n}`,
            },
            objective: `Todo **${d.type}** deve ter \`${action}()\` no método \`dispose()\`.`,
            reference: {
              text: "Flutter: State.dispose()",
              url: "https://api.flutter.dev/flutter/widgets/State/dispose.html",
            },
            file: file.path.path,
            line: d.field.nameLine,
          });
        }
      }
    }
  }
);

/** Campos do State cujo tipo (ou inicializador) é um disposable conhecido. */
function findDisposables(state: DartClass): Disposable[] {
  const result: Disposable[] = [];
  for (const field of state.fields) {
    const explicitType = field.type?.text ?? "";
    const initializer = field.initializer?.text ?? "";

    const disposeType = DISPOSE_TYPES.find(
      (t) => explicitType.includes(t) || initializer.includes(`${t}(`)
    );
    if (disposeType) result.push({ field, type: disposeType, cleanup: "dispose" });

    const streamOrTimerTypes: [string[], CleanupMethod][] = [
      [CANCEL_TYPES, "cancel"],
      [CLOSE_TYPES, "close"],
    ];
    for (const [types, cleanup] of streamOrTimerTypes) {
      const type = types.find(
        (t) =>
          explicitType.includes(t) || initializer.includes(`${t}(`) || initializer.includes(`${t}.`)
      );
      if (type) {
        result.push({ field, type, cleanup });
        break;
      }
    }
  }
  return result;
}

/**
 * Chamadas `.dispose()`, `.cancel()` e `.close()` sem argumentos no `dispose()`
 * da classe e nos métodos da própria classe que ele chama (`_unsubscribe()`).
 */
function cleanupCallsOf(state: DartClass): DartCall[] {
  const calls: DartCall[] = [];
  const visited = new Set<string>();
  const visit = (methodName: string): void => {
    if (visited.has(methodName)) return;
    visited.add(methodName);
    const method = state.findMethod(methodName, DartMemberKind.Method);
    for (const call of method?.body?.calls ?? []) {
      if (CLEANUP_METHODS.has(call.name) && call.arguments.length === 0) calls.push(call);
      if (call.receiver === null || call.receiver === "this") visit(call.name);
    }
  };
  visit("dispose");
  return calls;
}

/** A chamada libera o campo `name`: `name.dispose()`, `name?.cancel()`, `this.name.close()`, `name..dispose()`. */
function releases(call: DartCall, name: string): boolean {
  const target = (call.isCascade ? call.cascadeTarget : call.receiver)?.replace(/!$/, "");
  return target?.endsWith(name) ?? false;
}
