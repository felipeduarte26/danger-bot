"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Flutter Widgets Plugin
 * Verifica ordem dos membros em classes de widgets/states seguindo
 * Vertical Ordering (Clean Code, Cap. 5):
 *
 * 1. Construtores (inclusive os nomeados e `const`)
 * 2. Factory constructors
 * 3. @override methods (lifecycle: initState, didChangeDependencies, build, dispose, etc.)
 * 4. Métodos públicos
 * 5. Métodos privados (_prefixo)
 *
 * Analisa cada classe `extends State<X>` ou `extends StatelessWidget` separadamente.
 * Não entram na ordem: campos (inclusive os de tipo função), getters, setters,
 * operadores, métodos `static` e o primary constructor. Classes com menos de 2
 * membros na lista são ignoradas.
 */
const _types_1 = require("../../../types.js");
const KIND_ORDER = {
  constructor: 0,
  factory: 1,
  override: 2,
  public: 3,
  private: 4,
};
/** `extends State<X>` (X sem argumentos de tipo) ou `extends StatelessWidget`, sem parâmetros de tipo na classe. */
function isWidgetClass(cls) {
  const superclass = cls.superclass;
  if (superclass?.prefix !== null || cls.typeParameters.length > 0) return false;
  if (superclass.name === "StatelessWidget") return superclass.typeArguments.length === 0;
  if (superclass.name !== "State" || superclass.typeArguments.length !== 1) return false;
  const widget = superclass.typeArguments[0];
  return widget.prefix === null && widget.typeArguments.length === 0 && !widget.isNullable;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "flutter-widgets",
    description: "Verifica ordem dos métodos em widgets Flutter",
    enabled: true,
  },
  async () => {
    const dartFiles = _types_1.DartFile.changed({ includeTests: true }).filter(
      (f) => !f.path.fileName.endsWith("_test.dart")
    );
    for (const file of dartFiles) {
      for (const cls of file.classes.filter(isWidgetClass)) {
        const methods = extractMethods(cls);
        if (methods.length < 2) continue;
        const violators = findViolators(methods);
        if (violators.length === 0) continue;
        const sorted = [...methods].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
        for (const violator of violators) {
          (0, _types_1.sendFormattedFail)({
            title: "ORDEM DE MÉTODOS INCORRETA",
            description: `Classe \`${cls.name}\`: método \`${violator.name}\` (${kindLabel(violator.kind)}) está fora da ordem Vertical Ordering.`,
            problem: {
              wrong: formatMethodList(cls.name, methods),
              correct: formatMethodList(cls.name, sorted),
              wrongLabel: "Ordem atual",
              correctLabel: "Ordem correta (Vertical Ordering)",
            },
            action: {
              text: "Reorganize os membros seguindo Vertical Ordering:",
              code: buildActionCode(sorted),
            },
            objective:
              "O conceito de **Vertical Ordering** (Clean Code, Cap. 5 — Robert C. Martin) diz que o código deve parecer um jornal: o leitor entende o contexto geral antes de se aprofundar nos detalhes técnicos.",
            reference: {
              text: "Clean Code (Robert C. Martin) — Capítulo 5: Formatação › Vertical Ordering",
              url: "https://drive.google.com/file/d/0B9eZlIWAs3-sN3NRbktQNVFUN3l2cTBBcXN4Y3FaUQ/view?resourcekey=0-ZafqCRtyIP8Zw0CKviW5Gw",
            },
            file: file.path.path,
            line: violator.line,
          });
        }
      }
    }
  }
);
/** Construtores e métodos da classe, na ordem do arquivo, com o grupo de cada um. */
function extractMethods(cls) {
  const methods = [];
  for (const member of cls.members) {
    if (member.memberKind === _types_1.DartMemberKind.Constructor) {
      methods.push({
        name: member.name,
        kind: member.isFactory ? "factory" : "constructor",
        line: member.nameLine,
      });
    } else if (member.memberKind === _types_1.DartMemberKind.Method && !member.isStatic) {
      const kind = member.isOverride ? "override" : member.isPrivate ? "private" : "public";
      methods.push({ name: member.name, kind, line: member.nameLine });
    }
  }
  return methods;
}
/**
 * Retorna todos os métodos que estão fora de ordem.
 * Um método é "violador" se existe algum método posterior com KIND_ORDER menor.
 */
function findViolators(methods) {
  const violators = [];
  for (let i = 0; i < methods.length; i++) {
    for (let j = i + 1; j < methods.length; j++) {
      if (KIND_ORDER[methods[j].kind] < KIND_ORDER[methods[i].kind]) {
        violators.push(methods[i]);
        break;
      }
    }
  }
  return violators;
}
/**
 * Formata a lista de métodos para o bloco de código wrong/correct.
 */
function formatMethodList(className, methods) {
  const maxLen = Math.max(...methods.map((m) => m.name.length + 2));
  const lines = methods.map((m) => {
    const call = `${m.name}()`;
    const pad = " ".repeat(Math.max(1, maxLen - call.length + 2));
    return `  ${call}${pad}// ${kindLabel(m.kind)}`;
  });
  return `class ${className} {\n${lines.join("\n")}\n}`;
}
/**
 * Gera o bloco de ação com os métodos reais agrupados por kind.
 */
function buildActionCode(sorted) {
  const groups = [];
  let currentKind = null;
  for (const m of sorted) {
    if (m.kind !== currentKind) {
      if (groups.length > 0) groups.push("");
      groups.push(`// ${kindLabel(m.kind)}`);
      currentKind = m.kind;
    }
    groups.push(`${m.name}()`);
  }
  return groups.join("\n");
}
function kindLabel(kind) {
  switch (kind) {
    case "constructor":
      return "construtor";
    case "factory":
      return "factory/named constructor";
    case "override":
      return "@override";
    case "public":
      return "público";
    case "private":
      return "privado";
  }
}
