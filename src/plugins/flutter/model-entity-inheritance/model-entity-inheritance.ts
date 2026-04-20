/**
 * Model Entity Inheritance Plugin
 * Valida se Models que possuem Entity correspondente fazem extends da Entity,
 * evitando duplicação de campos entre as duas classes.
 *
 * Regras:
 * 1. Model sem `extends` → verifica se existe Entity correspondente
 * 2. Entity encontrada → compara TODOS os campos (nome + tipo)
 * 3. Se todos os campos da Entity existem no Model → Model deve extender Entity
 * 4. Model `final class` deve remover `final` para permitir herança
 * 5. Model que já extends Entity, sem campos extras e com toEntity() →
 *    toEntity() é desnecessário (Liskov Substitution Principle)
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";
import * as path from "path";

function isBarrelFile(filePath: string): boolean {
  const fileName = path.basename(filePath, ".dart");
  const parentDir = path.basename(path.dirname(filePath));
  return fileName === parentDir;
}

function isGeneratedFile(filePath: string): boolean {
  return filePath.endsWith(".g.dart") || filePath.endsWith(".freezed.dart");
}

interface ClassField {
  name: string;
  type: string;
  line: number;
}

interface ModelClassInfo {
  name: string;
  line: number;
  isFinal: boolean;
  hasExtends: boolean;
  extendsClass: string | null;
  fields: ClassField[];
  hasToEntity: boolean;
  toEntityLine: number;
}

function parseFields(lines: string[], classStartLine: number): ClassField[] {
  const fields: ClassField[] = [];
  let braceDepth = 0;
  let foundOpen = false;

  for (let j = classStartLine; j < lines.length; j++) {
    const cl = lines[j];

    for (const ch of cl) {
      if (ch === "{") {
        braceDepth++;
        foundOpen = true;
      }
      if (ch === "}") braceDepth--;
    }

    if (foundOpen && braceDepth === 1) {
      const trimmed = cl.trim();

      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("///") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("const ") ||
        trimmed.startsWith("factory ") ||
        trimmed.includes("static ") ||
        trimmed.startsWith("@")
      ) {
        continue;
      }

      // Skip lines with parentheses (methods, constructors, function calls)
      if (trimmed.includes("(") && !trimmed.match(/^(?:late\s+)?final\s+.+\(.+\)\s+\w+\s*;$/)) {
        continue;
      }

      const fieldMatch = trimmed.match(/^(?:late\s+)?final\s+(.+?)\s+([a-z_]\w*)\s*(?:=.*)?;$/);
      if (fieldMatch) {
        fields.push({ type: fieldMatch[1], name: fieldMatch[2], line: j + 1 });
      }
    }

    if (foundOpen && braceDepth <= 0) break;
  }

  return fields;
}

/**
 * Collects the full class declaration from the `class` keyword until `{`.
 * Handles multi-line declarations like:
 *   final class FooModel
 *       extends FooEntity
 *       implements IDecorator {
 */
function collectClassDeclaration(lines: string[], startLine: number): string {
  let declaration = "";
  for (let j = startLine; j < lines.length; j++) {
    declaration += " " + lines[j].trim();
    if (declaration.includes("{")) break;
  }
  return declaration;
}

function parseModelClass(content: string): ModelClassInfo | null {
  const lines = content.split("\n");
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();

    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      inBlockComment = true;
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith("//") || trimmed.startsWith("///")) continue;

    const classMatch = trimmed.match(/^(?:abstract\s+)?(final\s+)?class\s+([A-Za-z_]\w*)/);

    if (classMatch?.[2]?.endsWith("Model")) {
      if (trimmed.startsWith("abstract")) continue;

      const isFinal = !!classMatch[1];
      const className = classMatch[2];

      // Collect full declaration (may span multiple lines)
      const fullDeclaration = collectClassDeclaration(lines, i);

      const extendsMatch = fullDeclaration.match(/\bextends\s+([A-Za-z_]\w*)/);
      const hasExtends = !!extendsMatch;
      const extendsClass = extendsMatch ? extendsMatch[1] : null;
      const fields = parseFields(lines, i);

      let hasToEntity = false;
      let toEntityLine = 0;
      for (let k = 0; k < lines.length; k++) {
        if (/\btoEntity\s*\(/.test(lines[k])) {
          hasToEntity = true;
          toEntityLine = k + 1;
          break;
        }
      }

      return {
        name: className,
        line: i + 1,
        isFinal,
        hasExtends,
        extendsClass,
        fields,
        hasToEntity,
        toEntityLine,
      };
    }
  }
  return null;
}

function parseEntityClass(
  content: string
): { name: string; fields: ClassField[]; isFinal: boolean } | null {
  const lines = content.split("\n");
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();

    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      inBlockComment = true;
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith("//") || trimmed.startsWith("///")) continue;

    const classMatch = trimmed.match(/^(?:abstract\s+)?(final\s+)?class\s+([A-Za-z_]\w*)/);

    if (classMatch?.[2]?.endsWith("Entity")) {
      if (trimmed.startsWith("abstract")) continue;

      const isFinal = !!classMatch[1];
      // Collect full declaration for multi-line support (not needed now but future-proof)
      const fields = parseFields(lines, i);
      return { name: classMatch[2], fields, isFinal };
    }
  }
  return null;
}

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function findFileRecursive(dir: string, fileName: string): string | null {
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

function findEntityFile(modelPath: string, snakeBaseName: string): string | null {
  const entityFileName = `${snakeBaseName}_entity.dart`;

  // Strategy 1: direct path mapping (/data/models/ → /domain/entities/)
  const directPath = modelPath
    .replace(/\/data\/models\//, "/domain/entities/")
    .replace(/_model\.dart$/, "_entity.dart");

  if (fs.existsSync(directPath)) return directPath;

  // Strategy 2: search recursively in domain/entities/
  const parts = modelPath.split("/");
  const dataIdx = parts.indexOf("data");
  if (dataIdx === -1) return null;

  const featurePath = parts.slice(0, dataIdx).join("/");
  const entitiesDir = path.join(featurePath, "domain", "entities");

  return findFileRecursive(entitiesDir, entityFileName);
}

function resolveFilePath(file: string): string {
  const rel = path.relative(process.cwd(), file);
  return rel.startsWith("lib/") ? rel : file;
}

function buildFieldMap(fields: ClassField[]): Map<string, ClassField> {
  const map = new Map<string, ClassField>();
  for (const f of fields) {
    map.set(`${f.type}|${f.name}`, f);
  }
  return map;
}

function checkMissingInheritance(
  modelClass: ModelClassInfo,
  entityClass: { name: string; fields: ClassField[]; isFinal: boolean },
  filePath: string
): void {
  const modelFieldMap = buildFieldMap(modelClass.fields);

  let allFieldsMatch = true;
  const matchedFields: ClassField[] = [];

  for (const entityField of entityClass.fields) {
    const key = `${entityField.type}|${entityField.name}`;
    if (modelFieldMap.has(key)) {
      matchedFields.push(entityField);
    } else {
      allFieldsMatch = false;
      break;
    }
  }

  if (!allFieldsMatch || matchedFields.length === 0) return;

  const entityName = entityClass.name;

  const fieldsSample = matchedFields
    .slice(0, 4)
    .map((f) => `final ${f.type} ${f.name};`)
    .join("\n  ");
  const extraFields =
    matchedFields.length > 4 ? `\n  // ... e mais ${matchedFields.length - 4} campo(s)` : "";

  const classModifier = modelClass.isFinal ? "final class" : "class";

  sendFormattedFail({
    title: "MODEL DEVE EXTENDER ENTITY",
    description: `\`${modelClass.name}\` tem **${matchedFields.length} campo(s)** idêntico(s) a \`${entityName}\`. Use herança para evitar duplicação.`,
    problem: {
      wrong: `${classModifier} ${modelClass.name} {\n  ${fieldsSample}${extraFields}\n}`,
      correct: `class ${modelClass.name} extends ${entityName} {\n  // ${matchedFields.length} campo(s) herdados de ${entityName}\n}`,
      wrongLabel: `${matchedFields.length} campo(s) duplicado(s)`,
      correctLabel: `Herda de ${entityName}`,
    },
    action: {
      text: `Faça \`${modelClass.name}\` extender \`${entityName}\`:`,
      code: `class ${modelClass.name} extends ${entityName} {\n  const ${modelClass.name}({...}) : super(...);\n  // Mantenha apenas campos específicos do Model\n}`,
    },
    objective: `Evitar **duplicação de campos** — \`${entityName}\` já define os mesmos ${matchedFields.length} campo(s).`,
    file: filePath,
    line: modelClass.line,
  });
}

function checkRedundantToEntity(
  modelClass: ModelClassInfo,
  entityClass: { name: string; fields: ClassField[]; isFinal: boolean },
  filePath: string
): void {
  if (!modelClass.hasToEntity) return;

  const modelOwnFields = modelClass.fields;

  if (modelOwnFields.length === 0) {
    // Model uses super for all fields — perfectly inherited, toEntity() is redundant
    emitRedundantToEntity(modelClass, entityClass, filePath);
    return;
  }

  // Model has own declared fields — check if they're ALL also in Entity (re-declaration)
  const entityFieldMap = buildFieldMap(entityClass.fields);

  for (const modelField of modelOwnFields) {
    const key = `${modelField.type}|${modelField.name}`;
    if (!entityFieldMap.has(key)) {
      // Model has a field not in Entity → toEntity() might strip extras → not redundant
      return;
    }
  }

  // All model own fields are in Entity — check reverse too (entity has no extras model doesn't)
  const modelFieldMap = buildFieldMap(modelOwnFields);
  for (const entityField of entityClass.fields) {
    const key = `${entityField.type}|${entityField.name}`;
    if (!modelFieldMap.has(key)) {
      // Entity has a field the model doesn't re-declare, but it's inherited via extends,
      // so the Model still has it. This is fine — toEntity() is still redundant.
    }
  }

  emitRedundantToEntity(modelClass, entityClass, filePath);
}

function emitRedundantToEntity(
  modelClass: ModelClassInfo,
  entityClass: { name: string; fields: ClassField[]; isFinal: boolean },
  filePath: string
): void {
  const entityName = entityClass.name;

  sendFormattedFail({
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
    file: filePath,
    line: modelClass.toEntityLine,
  });
}

export default createPlugin(
  {
    name: "model-entity-inheritance",
    description: "Valida herança de Model → Entity",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const files = [...git.created_files, ...git.modified_files].filter(
      (f: string) =>
        f.includes("/data/") &&
        f.includes("/models/") &&
        f.endsWith("_model.dart") &&
        !f.endsWith("_test.dart") &&
        !isBarrelFile(f) &&
        !isGeneratedFile(f) &&
        fs.existsSync(f)
    );

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const modelClass = parseModelClass(content);

      if (!modelClass) continue;

      const baseName = modelClass.name.replace(/Model$/, "");
      const snakeBase = toSnakeCase(baseName);

      const entityPath = findEntityFile(file, snakeBase);
      if (!entityPath) continue;

      const entityContent = fs.readFileSync(entityPath, "utf-8");
      const entityClass = parseEntityClass(entityContent);

      if (!entityClass) continue;
      if (entityClass.fields.length === 0) continue;

      const filePath = resolveFilePath(file);

      if (modelClass.hasExtends && modelClass.extendsClass?.endsWith("Entity")) {
        checkRedundantToEntity(modelClass, entityClass, filePath);
      } else if (!modelClass.hasExtends && modelClass.fields.length > 0) {
        checkMissingInheritance(modelClass, entityClass, filePath);
      }
    }
  }
);
