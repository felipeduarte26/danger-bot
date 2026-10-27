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
 * Model Entity Inheritance Plugin
 * Valida se Models que possuem Entity correspondente fazem extends da Entity,
 * evitando duplicação de campos entre as duas classes.
 *
 * Analisa arquivos `*_model.dart` em /data/.../models/ (sem barrel). Em cada arquivo vale a
 * 1ª classe concreta `*Model`; na Entity correspondente, a 1ª classe concreta `*Entity`.
 *
 * Regras:
 * 1. Model sem `extends` e com campos → procura a Entity correspondente
 *    (`/domain/entities/x_entity.dart` ou `<nome>_entity.dart` em domain/entities/)
 * 2. Entity encontrada e com campos → compara TODOS os campos (nome + tipo)
 * 3. Se todos os campos da Entity existem no Model → Model deve extender Entity
 * 4. Model `final class` deve remover `final` para permitir herança
 * 5. Model que já extends `*Entity`, com `toEntity()` retornando a própria classe estendida
 *    e sem campos fora da Entity → toEntity() é desnecessário (Liskov Substitution Principle)
 *
 * Campos: `final` com tipo e nome minúsculo/`_`, do corpo ou do primary constructor; `static`
 * e campos inicializados com uma chamada (`= DateTime.now()`) não contam.
 */
const _types_1 = require("../../../types.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Campos comparados entre Model e Entity. */
function classFields(cls) {
  return cls.fields.filter(
    (f) =>
      f.isFinal &&
      f.type !== null &&
      !f.isStatic &&
      /^[a-z_]\w*$/.test(f.name) &&
      (f.initializer?.calls.length ?? 0) === 0
  );
}
/** Chave de comparação: tipo + nome. */
function fieldKey(field) {
  return `${field.type?.canonical ?? ""}|${field.name}`;
}
/** 1ª classe concreta (não `abstract`) cujo nome termina com `suffix`. */
function firstClassWithSuffix(file, suffix) {
  return file.classes.find((c) => !c.isAbstract && c.name.endsWith(suffix)) ?? null;
}
function findFileRecursive(dir, fileName) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === fileName) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, fileName);
      if (found) return found;
    }
  }
  return null;
}
function findEntityFile(modelFile, snakeBaseName) {
  // Estratégia 1: mesmo caminho (/data/models/ → /domain/entities/)
  const directPath = modelFile.path.path
    .replace(/\/data\/models\//, "/domain/entities/")
    .replace(/_model\.dart$/, "_entity.dart");
  if (fs.existsSync(directPath)) return directPath;
  // Estratégia 2: busca recursiva em domain/entities/ da mesma feature
  const { segments } = modelFile.path;
  const dataIdx = segments.indexOf("data");
  if (dataIdx === -1) return null;
  const entitiesDir = path.join(segments.slice(0, dataIdx).join("/"), "domain", "entities");
  return findFileRecursive(entitiesDir, `${snakeBaseName}_entity.dart`);
}
function checkMissingInheritance(modelClass, modelFields, entityClass, entityFields, filePath) {
  const modelKeys = new Set(modelFields.map(fieldKey));
  if (!entityFields.every((f) => modelKeys.has(fieldKey(f)))) return;
  const matchedFields = entityFields;
  const entityName = entityClass.name;
  const fieldsSample = matchedFields
    .slice(0, 4)
    .map((f) => `final ${f.type?.canonical ?? ""} ${f.name};`)
    .join("\n  ");
  const extraFields =
    matchedFields.length > 4 ? `\n  // ... e mais ${matchedFields.length - 4} campo(s)` : "";
  const classModifier = modelClass.isFinal ? "final class" : "class";
  const finalEntityWarning = entityClass.isFinal
    ? `\n\n> **Atenção:** \`${entityName}\` é \`final class\` — remova o \`final\` da Entity para permitir herança.`
    : "";
  const entityFixNote = entityClass.isFinal
    ? `\n// Na Entity: altere 'final class ${entityName}' para 'class ${entityName}'`
    : "";
  (0, _types_1.sendFormattedFail)({
    title: "MODEL DEVE EXTENDER ENTITY",
    description: `\`${modelClass.name}\` tem **${matchedFields.length} campo(s)** idêntico(s) a \`${entityName}\`. Use herança para evitar duplicação.${finalEntityWarning}`,
    problem: {
      wrong: `${classModifier} ${modelClass.name} {\n  ${fieldsSample}${extraFields}\n}`,
      correct: `class ${modelClass.name} extends ${entityName} {\n  const ${modelClass.name}({${matchedFields
        .slice(0, 3)
        .map((f) => `super.${f.name}`)
        .join(", ")}${matchedFields.length > 3 ? ", ..." : ""}});\n}`,
      wrongLabel: `${matchedFields.length} campo(s) duplicado(s)`,
      correctLabel: `Herda de ${entityName}`,
    },
    action: {
      text: `Faça \`${modelClass.name}\` extender \`${entityName}\`:`,
      code: `class ${modelClass.name} extends ${entityName} {\n  const ${modelClass.name}({${matchedFields
        .slice(0, 3)
        .map((f) => `super.${f.name}`)
        .join(", ")}${matchedFields.length > 3 ? ", ..." : ""}});${entityFixNote}\n}`,
    },
    objective: `Evitar **duplicação de campos** — \`${entityName}\` já define os mesmos ${matchedFields.length} campo(s).`,
    reference: {
      text: "Dart — Extend a class",
      url: "https://dart.dev/language/extend",
    },
    file: filePath,
    line: modelClass.line,
  });
}
function checkRedundantToEntity(modelClass, modelFields, entityClass, entityFields, filePath) {
  const toEntity = modelClass.findMethod("toEntity", _types_1.DartMemberKind.Method);
  if (!toEntity) return;
  // toEntity() retorna outra Entity que não a estendida → conversão válida, não redundante
  const returnType = toEntity.returnType?.name ?? null;
  if (returnType && returnType !== modelClass.superclass?.name) return;
  // Campos próprios do Model que não estão na Entity → toEntity() pode estar removendo extras
  const entityKeys = new Set(entityFields.map(fieldKey));
  if (!modelFields.every((f) => entityKeys.has(fieldKey(f)))) return;
  const entityName = entityClass.name;
  (0, _types_1.sendFormattedFail)({
    title: "toEntity() DESNECESSÁRIO",
    description: `\`${modelClass.name}\` já extende \`${entityName}\` e não tem campos adicionais. O método \`toEntity()\` é redundante — o próprio Model já **é** uma Entity.`,
    problem: {
      wrong: `${entityName} toEntity() => ${entityName}(...);\n// Cria objeto desnecessário`,
      correct: `// Remova toEntity() — use o Model diretamente\n// ${modelClass.name} já é um ${entityName} (herança)`,
      wrongLabel: "Conversão redundante",
      correctLabel: "Herança direta (Liskov)",
    },
    action: {
      text: `Remova \`toEntity()\` de \`${modelClass.name}\`:`,
      code: `// Antes:\nfinal entity = model.toEntity();\nrepository.save(entity);\n\n// Depois:\nrepository.save(model); // Model já é ${entityName}`,
    },
    objective: `**Liskov Substitution Principle** — \`${modelClass.name}\` já é um subtipo de \`${entityName}\`, pode ser usado diretamente onde \`${entityName}\` é esperado.`,
    reference: {
      text: "Dart — Extend a class",
      url: "https://dart.dev/language/extend",
    },
    file: filePath,
    line: toEntity.nameLine,
  });
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "model-entity-inheritance",
    description: "Valida herança de Model → Entity",
    enabled: true,
  },
  async () => {
    const files = _types_1.DartFile.changed({ createdFirst: true }).filter(
      (file) =>
        file.path.inLayer(_types_1.DartLayer.Data) &&
        file.path.inFolder(_types_1.DartLayerFolder.Models) &&
        file.path.fileName.endsWith("_model.dart") &&
        !file.path.isBarrel
    );
    for (const file of files) {
      const modelClass = firstClassWithSuffix(file, "Model");
      if (!modelClass) continue;
      const snakeBase = _types_1.DartText.toSnakeCase(modelClass.name.replace(/Model$/, ""));
      const entityPath = findEntityFile(file, snakeBase);
      if (!entityPath) continue;
      const entityClass = firstClassWithSuffix(_types_1.DartFile.read(entityPath), "Entity");
      if (!entityClass) continue;
      const entityFields = classFields(entityClass);
      if (entityFields.length === 0) continue;
      const modelFields = classFields(modelClass);
      const { superclass } = modelClass;
      if (superclass?.name?.endsWith("Entity")) {
        checkRedundantToEntity(modelClass, modelFields, entityClass, entityFields, file.path.path);
      } else if (superclass === null && modelFields.length > 0) {
        checkMissingInheritance(modelClass, modelFields, entityClass, entityFields, file.path.path);
      }
    }
  }
);
