/**
 * Domain Entities Plugin
 * Valida arquivos dentro de /entities/ (sem barrel e sem `*entities.dart`):
 * - Subpastas extensions/, errors/, mixins/ e typedefs/ dentro de entities/: só a pasta é reportada
 * - Enums (arquivo em entities/enums/ ou com `enum`): pasta enums/, sufixo _enum.dart e Enum no nome
 * - Nome do arquivo deve terminar com _entity.dart (senão o arquivo para aqui)
 * - Somente uma entity por arquivo e classe com sufixo Entity
 * - Classe deve ser final class, exceto quando um Model já a estende ou tem todos os campos dela
 *   (o model-entity-inheritance pede o extends): nesse caso ela NÃO pode ser final
 * - Entity vazia (sem campos) e entity com apenas 1 campo (wrapper desnecessário)
 * Classes abstratas são ignoradas. Campos: `final` com tipo e nome minúsculo/`_`, do corpo ou do
 * primary constructor (`static` não conta).
 */
import {
  DartClass,
  DartField,
  DartFile,
  DartLayerFolder,
  DartText,
  createPlugin,
  sendFormattedFail,
} from "@types";
import * as fs from "fs";
import * as path from "path";

const NON_ENTITY_SUBFOLDERS = new Set(["extensions", "errors", "mixins", "typedefs"]);

const VALID_ENUM_PARENTS = new Set(["enums"]);

/** Pasta logo abaixo de `entities/` (`null` quando o arquivo está direto em `entities/`). */
function getSubfolderAfterEntities(file: DartFile): string | null {
  const { segments } = file.path;
  const entitiesIdx = segments.lastIndexOf("entities");
  if (entitiesIdx === -1 || entitiesIdx >= segments.length - 1) return null;
  return segments[entitiesIdx + 1];
}

function validateEnum(file: DartFile): void {
  const filePath = file.path.path;
  const fileName = file.path.fileName;

  if (file.enums.length === 0) return;

  if (getSubfolderAfterEntities(file) !== "enums") {
    sendFormattedFail({
      title: "ENUM FORA DA PASTA ENUMS",
      description: `Arquivo enum \`${fileName}\` está solto em \`entities/\`. Deve ficar em \`entities/enums/\`.`,
      problem: {
        wrong: filePath.split("/").slice(-3).join("/"),
        correct: filePath.split("/").slice(-3, -1).join("/") + "/enums/" + fileName,
        wrongLabel: "Solto em entities/",
        correctLabel: "Dentro de entities/enums/",
      },
      action: {
        text: "Mova o arquivo para a subpasta `enums/`:",
        code: `entities/\n  ├── enums/\n  │   └── ${fileName}   ← aqui\n  └── ...`,
        language: "text",
      },
      objective: "Manter enums **organizados** em sua subpasta dedicada.",
      file: filePath,
      line: 1,
    });
  }

  if (!fileName.endsWith("_enum.dart") && !fileName.endsWith("enums.dart")) {
    sendFormattedFail({
      title: "NOMENCLATURA DE ENUM INCORRETA",
      description: `Arquivo deve terminar com \`_enum.dart\`.`,
      problem: {
        wrong: fileName,
        correct: `${fileName.replace(".dart", "")}_enum.dart`,
        wrongLabel: "Nome atual",
        correctLabel: "Nome correto",
      },
      action: {
        code: `// Renomeie o arquivo:\n// ${fileName} → ${fileName.replace(".dart", "")}_enum.dart`,
      },
      objective: "Manter **consistência** na nomenclatura de enums.",
      file: filePath,
      line: 1,
    });
  }

  for (const e of file.enums) {
    if (!e.name.endsWith("Enum")) {
      sendFormattedFail({
        title: "ENUM SEM SUFIXO",
        description: `O enum \`${e.name}\` deve terminar com \`Enum\`.`,
        problem: {
          wrong: `enum ${e.name} { }`,
          correct: `enum ${e.name}Enum { }`,
        },
        action: {
          code: `enum ${e.name}Enum { }`,
        },
        objective: "Manter **consistência** na nomenclatura de enums.",
        file: filePath,
        line: e.line,
      });
    }
  }
}

/** Campos que contam: `final` com tipo e nome minúsculo/`_` (corpo ou primary constructor), sem `static`. */
function classFields(cls: DartClass): DartField[] {
  return cls.fields.filter(
    (f) => f.isFinal && f.type !== null && !f.isStatic && /^[a-z_]\w*$/.test(f.name)
  );
}

/** Chave de comparação entre entity e model: tipo + nome. */
function fieldKey(field: DartField): string {
  return `${field.type?.canonical ?? ""}|${field.name}`;
}

function findFileRecursive(dir: string, fileName: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === fileName) return fullPath;
    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, fileName);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Model da entity: `/domain/entities/x_entity.dart` → `/data/models/x_model.dart` ou, se não
 * existir, `<nome da classe sem Entity em snake_case>_model.dart` em qualquer subpasta de
 * `data/models/` da mesma feature. Só procura quando o caminho tem `domain/`.
 */
function findModelFile(entityFile: DartFile, entityClassName: string): string | null {
  const { segments } = entityFile.path;
  const domainIdx = segments.indexOf("domain");
  if (domainIdx === -1) return null;

  const directPath = entityFile.path.path
    .replace(/\/domain\/entities\//, "/data/models/")
    .replace(/_entity\.dart$/, "_model.dart");
  if (fs.existsSync(directPath)) return directPath;

  const modelsDir = path.join(segments.slice(0, domainIdx).join("/"), "data", "models");
  const baseName = entityClassName.replace(/Entity$/, "");
  return findFileRecursive(modelsDir, `${DartText.toSnakeCase(baseName)}_model.dart`);
}

/**
 * A entity é (ou deve ser) estendida pelo Model correspondente — então NÃO deve ser forçada a
 * `final class`. Vale quando a 1ª classe concreta `*Model` do model:
 * 1. já estende a entity; ou
 * 2. tem TODOS os campos da entity (tipo + nome): o model-entity-inheritance vai pedir o extends.
 */
function isEntityExtendedByModel(
  entityFile: DartFile,
  entityClassName: string,
  entityFields: DartField[]
): boolean {
  const modelPath = findModelFile(entityFile, entityClassName);
  if (!modelPath) return false;

  const model = DartFile.read(modelPath).classes.find(
    (c) => !c.isAbstract && c.name.endsWith("Model")
  );
  if (!model) return false;
  if (model.extendsAny(entityClassName)) return true;

  if (entityFields.length === 0) return false;
  const modelKeys = new Set(classFields(model).map(fieldKey));
  if (modelKeys.size === 0) return false;

  return entityFields.every((f) => modelKeys.has(fieldKey(f)));
}

export default createPlugin(
  {
    name: "domain-entities",
    description: "Valida Domain Entities e Enums",
    enabled: true,
  },
  async () => {
    const files = DartFile.changed({ createdFirst: true }).filter(
      (file) =>
        file.path.inFolder(DartLayerFolder.Entities) &&
        !file.path.fileName.endsWith("entities.dart") &&
        !file.path.isBarrel
    );

    for (const file of files) {
      const filePath = file.path.path;
      const fileName = file.path.fileName;

      const subfolder = getSubfolderAfterEntities(file);

      if (subfolder && NON_ENTITY_SUBFOLDERS.has(subfolder)) {
        const parts = filePath.split("/");
        const entitiesIdx = parts.lastIndexOf("entities");
        const domainPath = parts.slice(0, entitiesIdx).join("/");
        const correctPath = `${domainPath}/${subfolder}/${parts.slice(entitiesIdx + 2).join("/")}`;

        sendFormattedFail({
          title: `${subfolder.toUpperCase()} DENTRO DE ENTITIES`,
          description: `\`${subfolder}/\` não deve ficar dentro de \`entities/\`. Deve ficar diretamente em \`domain/\`.`,
          problem: {
            wrong: parts.slice(-4).join("/"),
            correct: correctPath.split("/").slice(-3).join("/"),
            wrongLabel: `Dentro de entities/${subfolder}/`,
            correctLabel: `Diretamente em domain/${subfolder}/`,
          },
          action: {
            text: `Mova a pasta \`${subfolder}/\` para \`domain/\`:`,
            code: `domain/\n  ├── entities/\n  ├── ${subfolder}/   ← aqui\n  ├── failures/\n  └── usecases/`,
            language: "text",
          },
          objective:
            "Manter a **estrutura Clean Architecture** organizada — cada conceito em sua pasta.",
          reference: {
            text: "Clean Architecture — Uncle Bob",
            url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
          },
          file: filePath,
          line: 1,
        });
        continue;
      }

      // Pasta enums/ ou arquivo com enum: só as regras de enum.
      if ((subfolder && VALID_ENUM_PARENTS.has(subfolder)) || file.enums.length > 0) {
        validateEnum(file);
        continue;
      }

      if (!fileName.endsWith("_entity.dart")) {
        sendFormattedFail({
          title: "NOMENCLATURA DE ENTITY INCORRETA",
          description: "Arquivo deve terminar com `_entity.dart`.",
          problem: {
            wrong: fileName,
            correct: `${fileName.replace(".dart", "")}_entity.dart`,
            wrongLabel: "Nome atual",
            correctLabel: "Nome correto",
          },
          action: {
            code: `// Renomeie o arquivo:\n// ${fileName} → ${fileName.replace(".dart", "")}_entity.dart`,
          },
          objective: "Manter **consistência** na nomenclatura da Domain Layer.",
          file: filePath,
          line: 1,
        });
        continue;
      }

      const classes = file.classes.filter((c) => !c.isAbstract);

      if (classes.length === 0) continue;

      if (classes.length > 1) {
        sendFormattedFail({
          title: "MÚLTIPLAS ENTITIES EM UM ARQUIVO",
          description: `Encontradas **${classes.length} classes**: ${classes.map((c) => `\`${c.name}\``).join(", ")}.`,
          problem: {
            wrong: classes.map((c) => `class ${c.name} { ... }`).join("\n"),
            correct: classes
              .map(
                (c) =>
                  `// ${c.name
                    .replace(/([A-Z])/g, "_$1")
                    .toLowerCase()
                    .slice(1)}_entity.dart\nfinal class ${c.name} { ... }`
              )
              .join("\n\n"),
            wrongLabel: `${classes.length} classes no mesmo arquivo`,
            correctLabel: "Uma classe por arquivo",
          },
          action: {
            code: classes
              .map(
                (c) =>
                  `// → ${c.name
                    .replace(/([A-Z])/g, "_$1")
                    .toLowerCase()
                    .slice(1)}.dart\nfinal class ${c.name} { }`
              )
              .join("\n"),
          },
          objective: "**Uma Entity por arquivo** — facilita navegação e manutenção.",
          file: filePath,
          line: classes[1].line,
        });
      }

      for (const cls of classes) {
        if (!cls.name.endsWith("Entity")) {
          sendFormattedFail({
            title: "ENTITY SEM SUFIXO",
            description: `A classe \`${cls.name}\` deve terminar com \`Entity\`.`,
            problem: {
              wrong: `class ${cls.name} { }`,
              correct: `final class ${cls.name}Entity { }`,
            },
            action: {
              code: `final class ${cls.name}Entity { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Entities.",
            file: filePath,
            line: cls.line,
          });
        }

        const fields = classFields(cls);

        const extendedByModel = isEntityExtendedByModel(file, cls.name, fields);

        if (!cls.isFinal && !extendedByModel) {
          sendFormattedFail({
            title: "ENTITY DEVE SER FINAL CLASS",
            description: `A classe \`${cls.name}\` deve usar \`final class\` para prevenir herança indevida.`,
            problem: {
              wrong: `class ${cls.name} {\n  final String name;\n}`,
              correct: `final class ${cls.name} {\n  final String name;\n  const ${cls.name}({required this.name});\n}`,
              wrongLabel: "Sem final",
              correctLabel: "Com final",
            },
            action: {
              code: `final class ${cls.name} {\n  // ...\n}`,
            },
            objective: "Garantir **imutabilidade** e design correto da Domain Layer.",
            file: filePath,
            line: cls.line,
          });
        }

        if (cls.isFinal && extendedByModel) {
          sendFormattedFail({
            title: "ENTITY NAO PODE SER FINAL",
            description: `\`${cls.name}\` é \`final class\`, mas existe um **Model** que precisa extender essa Entity. Remova o \`final\` para permitir herança.`,
            problem: {
              wrong: `final class ${cls.name} { ... }`,
              correct: `class ${cls.name} { ... }`,
              wrongLabel: "final impede herança",
              correctLabel: "Sem final — permite extends",
            },
            action: {
              text: `Remova \`final\` de \`${cls.name}\`:`,
              code: `class ${cls.name} {\n  // Model poderá fazer: extends ${cls.name}\n}`,
            },
            objective: "Permitir que o **Model** herde da Entity, evitando duplicação de campos.",
            reference: {
              text: "Dart — Class modifiers",
              url: "https://dart.dev/language/class-modifiers",
            },
            file: filePath,
            line: cls.line,
          });
        }
        if (fields.length === 0) {
          sendFormattedFail({
            title: "ENTITY VAZIA",
            description: `A classe \`${cls.name}\` não tem nenhuma propriedade. Não faz sentido ter uma Entity sem campos.`,
            problem: {
              wrong: `final class ${cls.name} {\n  const ${cls.name}();\n}`,
              correct: `// Remova a Entity e use NoParams ou o tipo diretamente`,
              wrongLabel: "Entity sem nenhum campo",
              correctLabel: "Remover Entity desnecessária",
            },
            action: {
              text: "Remova a Entity vazia. Se for usada como parâmetro sem dados, use `NoParams`:",
              code: `// Antes:\n// Future<...> call(${cls.name} params);\n\n// Depois:\n// Future<...> call(); // sem parâmetro\n// ou: Future<...> call(NoParams params);`,
            },
            objective:
              "Evitar **abstrações vazias** — uma Entity deve representar um conceito de domínio com dados.",
            file: filePath,
            line: cls.line,
          });
        }

        if (fields.length === 1) {
          const field = fields[0];
          const type = field.type?.canonical ?? "";
          sendFormattedFail({
            title: "ENTITY COM APENAS UMA PROPRIEDADE",
            description: `A classe \`${cls.name}\` tem apenas a propriedade \`${field.name}\` (\`${type}\`). Uma Entity com um único campo é um wrapper desnecessário — use o tipo \`${type}\` diretamente.`,
            problem: {
              wrong: `final class ${cls.name} {\n  final ${type} ${field.name};\n}`,
              correct: `// Use ${type} diretamente como parâmetro\nFuture<Result<Failure, Entity>> call(${type} ${field.name});`,
              wrongLabel: "Entity com 1 campo (wrapper desnecessário)",
              correctLabel: "Tipo usado diretamente",
            },
            action: {
              text: `Remova a Entity e use \`${type}\` diretamente onde ela é referenciada:`,
              code: `// Antes:\n// Future<...> call(${cls.name} params) => ...params.${field.name}...\n\n// Depois:\n// Future<...> call(${type} ${field.name}) => ...${field.name}...`,
            },
            objective:
              "Evitar **abstrações desnecessárias** — uma Entity deve encapsular **múltiplas propriedades** relacionadas.",
            file: filePath,
            line: cls.line,
          });
        }
      }
    }
  }
);
