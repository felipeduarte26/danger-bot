/**
 * Barrel Files Enforcer Plugin
 * 1. Sugere barrel files quando 2+ imports do próprio pacote vêm da mesma pasta
 *    (pula o grupo que já importa o barrel).
 * 3. Aponta import direto de um arquivo que o barrel da pasta já exporta (pula o
 *    import do próprio barrel, arquivos direto em `lib/` e quem já importa o barrel).
 * 2. Verifica se o barrel de cada pasta alterada exporta TODOS os arquivos da pasta
 *    (uma vez por pasta). Conta só exports locais; ignora `.g.dart`, `.freezed.dart`,
 *    `_test.dart`, dotfiles, o próprio barrel e arquivos `part of`; subpasta só
 *    entra se tiver barrel próprio.
 *
 * Só analisa imports simples do pacote do `pubspec.yaml` (`import 'package:app/x.dart';`);
 * `dart:`, relativos e imports com `as`/`show`/`hide` ficam de fora. Sem `name:` no
 * pubspec, não roda.
 */
import { DartFile, DartPackage, DartPath, createPlugin, sendFormattedFail } from "@types";
import * as fs from "fs";
import * as path from "path";

interface PackageImport {
  /** URI sem `package:` (`app/features/x/x.dart`) */
  path: string;
  line: number;
}

interface ImportGroup {
  folder: string;
  imports: string[];
  lines: number[];
}

const BARREL_GUIDE = {
  text: "Guia completo sobre Barrel Files",
  url: "https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter-a-guide-to-simplifying-imports-9b245dbe516a",
};

/**
 * Imports `package:<pacote do projeto>/...` do arquivo. Só a forma simples, sem
 * `as`, `show`, `hide`, `deferred` nem import condicional: o plugin sempre
 * ignorou esses (a regra pedia o `;` logo depois da URI).
 */
function projectImports(file: DartFile, projectPackage: string): PackageImport[] {
  return file.imports
    .filter(
      (imp) =>
        imp.packageName === projectPackage &&
        imp.prefix === null &&
        imp.show.length === 0 &&
        imp.hide.length === 0 &&
        !imp.isDeferred &&
        !imp.hasConfigurations
    )
    .map((imp) => ({ path: imp.uri.slice("package:".length), line: imp.line }));
}

/** Arquivos da pasta que o barrel não precisa exportar. */
function isIgnoredFile(fileName: string): boolean {
  return (
    fileName.endsWith(".g.dart") ||
    fileName.endsWith(".freezed.dart") ||
    fileName.endsWith("_test.dart") ||
    fileName.startsWith(".")
  );
}

/** URIs exportadas pelo barrel (lido do disco), sem repetição. */
function getBarrelExports(barrelPath: string): Set<string> {
  return new Set(DartFile.read(barrelPath).exports.map((exp) => exp.uri));
}

function checkBarrelCompleteness(barrelPath: string): void {
  const barrel = DartPath.of(barrelPath);
  const barrelFileName = barrel.fileName;
  const dir = barrel.directory;

  // Só exports locais (ignora relativos ../, absolutos / e package:)
  const exportedLocalFiles = new Set<string>();
  for (const exp of getBarrelExports(barrelPath)) {
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
    if (DartFile.read(path.join(dir, entry.name)).partOf !== null) continue;
    missingFiles.push(entry.name);
  }

  // Subpastas com barrel próprio também devem ser exportadas
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

  const folderName = barrel.folderName;

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
    reference: BARREL_GUIDE,
    file: barrel.path,
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
    const projectPackage = DartPackage.current()?.name;

    if (!projectPackage) return;

    const dartFiles = DartFile.changed({ includeTests: true, includeGenerated: true }).filter(
      (file) =>
        !file.path.fileName.endsWith("_test.dart") &&
        !file.path.fileName.endsWith(".g.dart") &&
        !file.path.fileName.endsWith(".freezed.dart")
    );

    // ── Rule 1: Suggest barrel files for multiple imports from same folder ──
    for (const file of dartFiles) {
      const packageImports = projectImports(file, projectPackage);

      if (packageImports.length < 2) continue;

      const groups = groupByFolder(packageImports);

      for (const group of groups) {
        if (group.imports.length < 2) continue;

        const folderName = group.folder.split("/").pop() || group.folder;
        const barrelName = `${folderName}.dart`;

        const alreadyUsesBarrel = group.imports.some((imp) => imp.endsWith(`/${barrelName}`));
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
          reference: BARREL_GUIDE,
          file: file.path.path,
          line: group.lines[0],
        });
      }
    }

    // ── Rule 3: Detect direct imports when a barrel file exists ──
    for (const file of dartFiles) {
      const packageImports = projectImports(file, projectPackage);

      for (const imp of packageImports) {
        // `app/features/x/x_page.dart` → pasta `features/x`, arquivo `x_page.dart`
        const folderParts = imp.path.slice(projectPackage.length + 1).split("/");
        if (folderParts.length < 2) continue;

        const importedFileName = folderParts.pop()!;
        const folder = folderParts.join("/");
        const folderName = folderParts[folderParts.length - 1];
        const barrelFileName = `${folderName}.dart`;

        // o import já é o barrel
        if (importedFileName === barrelFileName) continue;

        const barrelRelPath = `${folder}/${barrelFileName}`;
        const barrelDiskPath = path.join("lib", barrelRelPath);
        if (!fs.existsSync(barrelDiskPath)) continue;

        // Verify the file is actually exported by the barrel
        const isExportedDirectly = Array.from(getBarrelExports(barrelDiskPath)).some(
          (exp) => exp === importedFileName || exp.endsWith(`/${importedFileName}`)
        );
        if (!isExportedDirectly) continue;

        const barrelImportPath = `${projectPackage}/${barrelRelPath}`;

        const alreadyImportsBarrel = packageImports.some(
          (other) => other.path === barrelImportPath
        );
        if (alreadyImportsBarrel) continue;

        sendFormattedFail({
          title: "USE O BARREL FILE",
          description: `Import direto de arquivo quando o barrel file \`${barrelFileName}\` existe. Use o barrel para manter **consistência**.`,
          problem: {
            wrong: `import 'package:${imp.path}';`,
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
          reference: BARREL_GUIDE,
          file: file.path.path,
          line: imp.line,
        });
      }
    }

    // ── Rule 2: Check barrel file completeness ──
    const checkedDirs = new Set<string>();

    for (const file of dartFiles) {
      const dir = file.path.directory;

      if (checkedDirs.has(dir)) continue;
      checkedDirs.add(dir);

      if (file.path.isBarrel) {
        checkBarrelCompleteness(file.path.path);
        continue;
      }

      const barrelPath = path.join(dir, `${file.path.folderName}.dart`);

      if (fs.existsSync(barrelPath)) {
        checkBarrelCompleteness(barrelPath);
      }
    }
  }
);

/** Agrupa os imports pela pasta (URI sem o nome do arquivo), na ordem do arquivo. */
function groupByFolder(imports: PackageImport[]): ImportGroup[] {
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
