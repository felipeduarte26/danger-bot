/**
 * Barrel Files Enforcer Plugin
 * Analisa imports dos arquivos Dart e sugere barrel files quando
 * multiplos imports vem da mesma pasta.
 */
import { createPlugin, getDanger, sendFail } from "@types";
import * as fs from "fs";

const IMPORT_RE = /^import\s+['"]package:([^'"]+)['"];/;
const DART_CORE_RE = /^import\s+['"]dart:/;
const RELATIVE_RE = /^import\s+['"]\.\./;

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

export default createPlugin(
  {
    name: "barrel-files-enforcer",
    description: "Sugere barrel files quando múltiplos imports vêm da mesma pasta",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();
    const projectPackage = getProjectPackageName();

    if (!projectPackage) return;

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );

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

        sendFail(
          `BARREL FILE RECOMENDADO

**${group.imports.length} imports** da mesma pasta \`${folderName}/\` poderiam usar um barrel file.

### Problema Identificado

Imports verbosos da mesma pasta:

\`\`\`dart
// ❌ Atual — ${group.imports.length} imports separados
${importLines}

// ✅ Com barrel file — 1 import
import 'package:${packagePrefix}/${barrelName}';
\`\`\`

### 🎯 AÇÃO NECESSÁRIA

Crie \`${barrelName}\` na pasta \`${folderName}/\`:

\`\`\`dart
${group.imports.map((imp) => `export '${imp.split("/").pop()}';`).join("\n")}
\`\`\`

### 🚀 Objetivo

Simplificar **imports** e melhorar **organização**.

📖 [Guia completo sobre Barrel Files](https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter-a-guide-to-simplifying-imports-9b245dbe516a)`,
          file,
          group.lines[0]
        );
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
