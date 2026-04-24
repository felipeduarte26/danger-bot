/**
 * Barrel Files Enforcer Plugin
 * 1. Sugere barrel files quando múltiplos imports vêm da mesma pasta.
 * 2. Verifica se barrel files existentes exportam TODOS os arquivos da pasta.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";
import * as path from "path";

const IMPORT_RE = /^import\s+['"]package:([^'"]+)['"];/;
const DART_CORE_RE = /^import\s+['"]dart:/;
const RELATIVE_RE = /^import\s+['"]\.\./;

const EXPORT_RE = /^export\s+['"]([^'"]+)['"]/;

interface ImportGroup {
  folder: string;
  imports: string[];
  lines: number[];
}

function getProjectPackageName(): string | null {
  try {
    const pubspec = fs.readFileSync("pubspec.yaml", "utf-8");
    const match = pubspec.match(/^name:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function isBarrelFile(filePath: string): boolean {
  const fileName = path.basename(filePath, ".dart");
  const parentDir = path.basename(path.dirname(filePath));
  return fileName === parentDir;
}

function isIgnoredFile(fileName: string): boolean {
  return (
    fileName.endsWith(".g.dart") ||
    fileName.endsWith(".freezed.dart") ||
    fileName.endsWith("_test.dart") ||
    fileName.startsWith(".")
  );
}

function isPartFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return /^\s*part\s+of\s+/m.test(content);
  } catch {
    return false;
  }
}

function getBarrelExports(barrelPath: string): Set<string> {
  const exports = new Set<string>();
  try {
    const content = fs.readFileSync(barrelPath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.trim().match(EXPORT_RE);
      if (match) {
        exports.add(match[1]);
      }
    }
  } catch {
    // barrel file unreadable
  }
  return exports;
}

function checkBarrelCompleteness(barrelPath: string, dir: string): void {
  const barrelFileName = path.basename(barrelPath);
  const exportedPaths = getBarrelExports(barrelPath);

  // Normalize: keep only local exports (ignore relative ../../, absolute /, and package: exports)
  const exportedLocalFiles = new Set<string>();
  for (const exp of exportedPaths) {
    if (exp.startsWith(".") || exp.startsWith("/") || exp.startsWith("package:")) continue;
    exportedLocalFiles.add(exp);
  }

  let dirEntries: fs.Dirent[];
  try {
    dirEntries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const dartFiles = dirEntries.filter(
    (e) =>
      e.isFile() && e.name.endsWith(".dart") && e.name !== barrelFileName && !isIgnoredFile(e.name)
  );

  const missingFiles: string[] = [];

  for (const entry of dartFiles) {
    if (exportedLocalFiles.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (isPartFile(fullPath)) continue;

    missingFiles.push(entry.name);
  }

  // Check subdirectories that have their own barrel file
  const subDirs = dirEntries.filter((e) => e.isDirectory());
  for (const subDir of subDirs) {
    const subBarrelName = `${subDir.name}.dart`;
    const subBarrelPath = path.join(dir, subDir.name, subBarrelName);
    const subBarrelRef = `${subDir.name}/${subBarrelName}`;
    if (fs.existsSync(subBarrelPath) && !exportedLocalFiles.has(subBarrelRef)) {
      missingFiles.push(subBarrelRef);
    }
  }

  if (missingFiles.length === 0) return;

  const folderName = path.basename(dir);
  const relBarrelPath = path.relative(process.cwd(), barrelPath);

  const missingExports = missingFiles.map((f) => `export '${f}';`).join("\n");

  const localExports = Array.from(exportedLocalFiles);
  const currentExports = localExports
    .slice(0, 3)
    .map((f) => `export '${f}';`)
    .join("\n");
  const currentExtra = localExports.length > 3 ? `\n// ... e mais ${localExports.length - 3}` : "";

  sendFormattedFail({
    title: "BARREL FILE INCOMPLETO",
    description: `O barrel file \`${barrelFileName}\` não exporta **${missingFiles.length} arquivo(s)** da pasta \`${folderName}/\`.`,
    problem: {
      wrong: `// ${barrelFileName}\n${currentExports}${currentExtra}\n// Faltam: ${missingFiles.join(", ")}`,
      correct: `// ${barrelFileName}\n${currentExports}${currentExtra}\n${missingExports}`,
      wrongLabel: `${missingFiles.length} arquivo(s) não exportado(s)`,
      correctLabel: "Todos os arquivos exportados",
    },
    action: {
      text: `Adicione ao \`${barrelFileName}\`:`,
      code: missingExports,
    },
    objective:
      "Barrel file deve exportar **todos** os arquivos da pasta — evita imports diretos inconsistentes.",
    reference: {
      text: "Guia completo sobre Barrel Files",
      url: "https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter-a-guide-to-simplifying-imports-9b245dbe516a",
    },
    file: relBarrelPath.startsWith("lib/") ? relBarrelPath : barrelPath,
    line: 1,
  });
}

export default createPlugin(
  {
    name: "barrel-files-enforcer",
    description: "Valida barrel files: sugere criação e verifica completude",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();
    const projectPackage = getProjectPackageName();

    if (!projectPackage) return;

    const allChangedFiles = [...git.modified_files, ...git.created_files];

    const dartFiles = allChangedFiles.filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );

    // ── Rule 1: Suggest barrel files for multiple imports from same folder ──
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      const packageImports: { path: string; line: number }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (DART_CORE_RE.test(line)) continue;
        if (RELATIVE_RE.test(line)) continue;

        const match = line.match(IMPORT_RE);
        if (match) {
          if (!match[1].startsWith(`${projectPackage}/`)) continue;

          packageImports.push({ path: match[1], line: i + 1 });
        }
      }

      if (packageImports.length < 2) continue;

      const groups = groupByFolder(packageImports);

      for (const group of groups) {
        if (group.imports.length < 2) continue;

        const folderName = group.folder.split("/").pop() || group.folder;
        const barrelName = `${folderName}.dart`;

        const alreadyUsesBarrel = group.imports.some(
          (imp) =>
            imp.endsWith(`/${barrelName}`) || imp.endsWith(`/${folderName}/${folderName}.dart`)
        );
        if (alreadyUsesBarrel) continue;

        const importLines = group.imports.map((imp) => `import 'package:${imp}';`).join("\n");
        const packagePrefix = group.imports[0].split("/").slice(0, -1).join("/");
        const exportLines = group.imports
          .map((imp) => `export '${imp.split("/").pop()}';`)
          .join("\n");

        sendFormattedFail({
          title: "BARREL FILE RECOMENDADO",
          description: `**${group.imports.length} imports** da mesma pasta \`${folderName}/\` poderiam usar um barrel file.`,
          problem: {
            wrong: importLines,
            correct: `import 'package:${packagePrefix}/${barrelName}';`,
            wrongLabel: `Atual — ${group.imports.length} imports separados`,
            correctLabel: "Com barrel file — 1 import",
          },
          action: {
            text: `Crie \`${barrelName}\` na pasta \`${folderName}/\`:`,
            code: exportLines,
          },
          objective: "Simplificar **imports** e melhorar **organização**.",
          reference: {
            text: "Guia completo sobre Barrel Files",
            url: "https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter-a-guide-to-simplifying-imports-9b245dbe516a",
          },
          file,
          line: group.lines[0],
        });
      }
    }

    // ── Rule 3: Detect direct imports when a barrel file exists ──
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      const directImports: { importPath: string; folder: string; line: number }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (DART_CORE_RE.test(line)) continue;
        if (RELATIVE_RE.test(line)) continue;

        const match = line.match(IMPORT_RE);
        if (!match) continue;
        if (!match[1].startsWith(`${projectPackage}/`)) continue;

        const importPath = match[1];
        const relativePath = importPath.slice(projectPackage.length + 1);
        const folderParts = relativePath.split("/");
        if (folderParts.length < 2) continue;

        const fileName = folderParts.pop()!;
        const folderPath = folderParts.join("/");
        const folderName = folderParts[folderParts.length - 1];

        if (fileName === `${folderName}.dart`) continue;

        directImports.push({ importPath, folder: folderPath, line: i + 1 });
      }

      for (const imp of directImports) {
        const folderParts = imp.folder.split("/");
        const folderName = folderParts[folderParts.length - 1];
        const barrelFileName = `${folderName}.dart`;
        const barrelRelPath = `${imp.folder}/${barrelFileName}`;

        const barrelDiskPath = path.join("lib", barrelRelPath);
        if (!fs.existsSync(barrelDiskPath)) continue;

        // Verify the file is actually exported by the barrel
        const barrelExports = getBarrelExports(barrelDiskPath);
        const importedFileName = imp.importPath.split("/").pop() || "";
        const isExportedDirectly = Array.from(barrelExports).some(
          (exp) => exp === importedFileName || exp.endsWith(`/${importedFileName}`)
        );
        if (!isExportedDirectly) continue;

        const barrelImportPath = `${projectPackage}/${barrelRelPath}`;

        const alreadyImportsBarrel = lines.some(
          (l: string) => l.trim().match(IMPORT_RE)?.[1] === barrelImportPath
        );
        if (alreadyImportsBarrel) continue;

        sendFormattedFail({
          title: "USE O BARREL FILE",
          description: `Import direto de arquivo quando o barrel file \`${barrelFileName}\` existe. Use o barrel para manter **consistência**.`,
          problem: {
            wrong: `import 'package:${imp.importPath}';`,
            correct: `import 'package:${barrelImportPath}';`,
            wrongLabel: "Import direto do arquivo",
            correctLabel: "Import via barrel file",
          },
          action: {
            text: `Substitua pelo barrel file:`,
            code: `import 'package:${barrelImportPath}';`,
          },
          objective:
            "Barrel files **centralizam exports** — imports diretos quebram essa organização.",
          reference: {
            text: "Guia completo sobre Barrel Files",
            url: "https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter-a-guide-to-simplifying-imports-9b245dbe516a",
          },
          file,
          line: imp.line,
        });
      }
    }

    // ── Rule 2: Check barrel file completeness ──
    const checkedDirs = new Set<string>();

    for (const file of dartFiles) {
      const dir = path.dirname(file);

      if (checkedDirs.has(dir)) continue;
      checkedDirs.add(dir);

      if (isBarrelFile(file)) {
        checkBarrelCompleteness(file, dir);
        continue;
      }

      const folderName = path.basename(dir);
      const barrelPath = path.join(dir, `${folderName}.dart`);

      if (fs.existsSync(barrelPath)) {
        checkBarrelCompleteness(barrelPath, dir);
      }
    }
  }
);

function groupByFolder(imports: { path: string; line: number }[]): ImportGroup[] {
  const map = new Map<string, ImportGroup>();

  for (const imp of imports) {
    const parts = imp.path.split("/");
    if (parts.length < 2) continue;

    const folder = parts.slice(0, -1).join("/");

    let group = map.get(folder);
    if (!group) {
      group = { folder, imports: [], lines: [] };
      map.set(folder, group);
    }
    group.imports.push(imp.path);
    group.lines.push(imp.line);
  }

  return Array.from(map.values());
}
