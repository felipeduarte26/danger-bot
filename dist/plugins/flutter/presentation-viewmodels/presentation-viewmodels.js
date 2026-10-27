"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Presentation ViewModels Plugin
 * Verifica que ViewModels dependam apenas de UseCases e trabalhem com state.
 *
 * Analisa:
 * 1. Imports — detecta imports diretos da camada Data (models, datasources, repositories, barrel)
 * 2. Campos `final` (inclusive `late final` e os do primary constructor) com tipo simples
 *    (sem prefixo, função ou record) — detecta Repository, Datasource ou Model como dependência direta
 * 3. Métodos públicos (lowerCamelCase) com tipo de retorno simples — devem retornar void,
 *    Future<void> ou FutureOr<void> (forçar trabalhar com state). Não valem: `@override`, `static`,
 *    getters, setters, operadores e os métodos do próprio state (`emit`, `setState`, `notifyListeners`...)
 *
 * Detecta ViewModels por:
 * - Arquivo: *_viewmodel.dart ou *_view_model.dart
 * - Classe: extends ViewModelBase (as outras classes do arquivo são ignoradas)
 */
const _types_1 = require("../../../types.js");
const FORBIDDEN_FIELD_TYPES = [
  { pattern: /Repository/, label: "Repository" },
  { pattern: /Datasource|DataSource/, label: "Datasource" },
  { pattern: /Model(?!Base|State)/, label: "Model" },
];
const FORBIDDEN_IMPORTS = [
  { pattern: /\/data\/repositories\//, label: "Repository (Data Layer)" },
  { pattern: /\/data\/datasources\//, label: "Datasource (Data Layer)" },
  { pattern: /\/data\/models\//, label: "Model (Data Layer)" },
  { pattern: /\/data\/data\.dart/, label: "Data Layer (barrel file)" },
];
const ALLOWED_RETURN_TYPES = new Set(["void", "Future<void>", "FutureOr<void>"]);
/** Métodos do mecanismo de state, que não entram na regra de retorno. */
const SKIP_METHOD_NAMES = new Set(["emit", "state", "setState", "notify", "notifyListeners"]);
/** Métodos públicos em lowerCamelCase (`_privado`, `Maiusculo` e `com_underscore` ficam de fora). */
const PUBLIC_METHOD_NAME_RE = /^[a-z][a-zA-Z0-9]*$/;
/** Tipo nomeado sem prefixo, com argumentos também simples (`Foo<Bar, int>?`). */
function isSimpleType(type) {
  return !type.some((t) => t.kind !== _types_1.DartTypeKind.Named || t.prefix !== null);
}
function checkForbiddenField(file, field) {
  const fieldType = field.type?.canonical ?? "";
  const fieldName = field.name;
  for (const { pattern, label } of FORBIDDEN_FIELD_TYPES) {
    if (!pattern.test(fieldType)) continue;
    (0, _types_1.sendFormattedFail)({
      title: `VIEWMODEL DEPENDE DE ${label.toUpperCase()} DIRETAMENTE`,
      description: `Campo \`${fieldName}\` é do tipo \`${fieldType}\` — ViewModel deve depender apenas de **UseCases**.`,
      problem: {
        wrong: `final ${fieldType} ${fieldName};`,
        correct: `final IGetDataUseCase _getDataUseCase;`,
        wrongLabel: `Dependência direta de ${label}`,
        correctLabel: "Dependência via UseCase",
      },
      action: {
        text: "Substitua a dependência direta por um UseCase:",
        code: `final class MyViewModel extends ViewModelBase<MyState> {\n  final IGetDataUseCase _getDataUseCase;\n}`,
      },
      objective: "ViewModel → **UseCase** → Repository → Datasource. Nunca pular camadas.",
      file,
      // campo do primary constructor: a linha do nome do parâmetro
      line:
        field.origin === _types_1.DartFieldOrigin.PrimaryConstructor ? field.nameLine : field.line,
    });
    return;
  }
}
function checkPublicMethods(file, cls) {
  for (const method of cls.methods) {
    const returnType = method.returnType;
    if (
      method.memberKind !== _types_1.DartMemberKind.Method ||
      !PUBLIC_METHOD_NAME_RE.test(method.name) ||
      method.isStatic ||
      method.isOverride ||
      SKIP_METHOD_NAMES.has(method.name) ||
      returnType === null ||
      !isSimpleType(returnType) ||
      ALLOWED_RETURN_TYPES.has(returnType.canonical)
    ) {
      continue;
    }
    const name = method.name;
    const type = returnType.canonical;
    (0, _types_1.sendFormattedFail)({
      title: "VIEWMODEL: MÉTODO PÚBLICO RETORNA VALOR",
      description: `Método \`${name}()\` retorna \`${type}\` — métodos públicos de ViewModel devem retornar **void** ou **Future<void>** para forçar o uso de **state**.`,
      problem: {
        wrong: `${type} ${name}() {\n  // retorna valor diretamente\n  return resultado;\n}`,
        correct: `Future<void> ${name}() async {\n  final resultado = await _useCase();\n  state = state.copyWith(data: resultado);\n}`,
        wrongLabel: `Retorna ${type}`,
        correctLabel: "Retorna void — atualiza state",
      },
      action: {
        text: "Altere o método para retornar void/Future<void> e atualize o state:",
        code: `Future<void> ${name}() async {\n  final result = await _useCase();\n  state = state.copyWith(/* ... */);\n}\n\n// Quem precisa do valor acessa via state:\n// viewModel.state.data`,
      },
      objective:
        "Métodos públicos de ViewModel devem apenas **disparar mudanças de estado**. Quem precisa do resultado acessa via `state`.",
      reference: {
        text: "Bloc: prefer_void_public_cubit_methods",
        url: "https://bloclibrary.dev/lint-rules/prefer_void_public_cubit_methods/",
      },
      file,
      line: method.line,
    });
  }
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "presentation-viewmodels",
    description: "Valida que ViewModels dependam apenas de UseCases e trabalhem com state",
    enabled: true,
  },
  async () => {
    const files = _types_1.DartFile.changed({
      createdFirst: true,
      includeTests: true,
      includeGenerated: true,
    }).filter(
      (f) =>
        f.path.fileName.endsWith("_viewmodel.dart") || f.path.fileName.endsWith("_view_model.dart")
    );
    for (const file of files) {
      const viewModels = file.classes.filter((c) => c.extendsAny("ViewModelBase"));
      if (viewModels.length === 0) continue;
      const filePath = file.path.path;
      // ── 1. Verificar imports proibidos ──
      for (const imp of file.imports) {
        const forbidden = FORBIDDEN_IMPORTS.find(({ pattern }) => pattern.test(imp.uri));
        if (!forbidden) continue;
        const label = forbidden.label;
        (0, _types_1.sendFormattedFail)({
          title: `VIEWMODEL IMPORTA ${label.toUpperCase()}`,
          description: `Import \`${imp.uri}\` traz dependência direta da **camada Data**. ViewModel deve importar apenas da **camada Domain**.`,
          problem: {
            wrong: `import 'package:app/.../data/models/user_model.dart';`,
            correct: `import 'package:app/.../domain/usecases/get_user_usecase.dart';\nimport 'package:app/.../domain/entities/user_entity.dart';`,
            wrongLabel: "Import direto da Data Layer",
            correctLabel: "Import apenas da Domain Layer",
          },
          action: {
            text: "Substitua imports de Data por imports de Domain:",
            code: `import 'package:app/.../domain/usecases/get_user_usecase.dart';\nimport 'package:app/.../domain/entities/user_entity.dart';`,
          },
          objective: "ViewModel → **UseCase** → Repository → Datasource. Nunca pular camadas.",
          file: filePath,
          line: imp.line,
        });
      }
      for (const cls of viewModels) {
        // ── 2. Verificar campos proibidos (primary constructor e corpo) ──
        for (const field of cls.fields) {
          if (!field.isFinal || field.isStatic || field.type === null || !isSimpleType(field.type))
            continue;
          checkForbiddenField(filePath, field);
        }
        // ── 3. Verificar métodos públicos com retorno não-void ──
        checkPublicMethods(filePath, cls);
      }
    }
  }
);
