"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * PR Summary Plugin
 * Gera um sumário rico da PR com métricas, camadas, risco e checklist.
 * Usa apenas Markdown puro (sem HTML) para compatibilidade com Bitbucket Cloud.
 *
 * Os arquivos são agrupados por `DartPath.category` (Dart, testes, gerados, config,
 * assets, docs, outros); deletados entram na contagem. Gerados e `.lock` ficam fora
 * dos arquivos em destaque.
 */
const _types_1 = require("../../../types.js");
/** Rótulo de cada categoria, na ordem do breakdown. */
const CATEGORY_LABELS = [
  { category: _types_1.FileCategory.Dart, label: "Dart" },
  { category: _types_1.FileCategory.Test, label: "Testes" },
  { category: _types_1.FileCategory.Generated, label: "Gerados" },
  { category: _types_1.FileCategory.Config, label: "Config" },
  { category: _types_1.FileCategory.Asset, label: "Assets" },
  { category: _types_1.FileCategory.Docs, label: "Docs" },
  { category: _types_1.FileCategory.Other, label: "Outros" },
];
/**
 * Camadas do resumo, pela primeira pasta que aparece no caminho. Além das pastas
 * da Clean Architecture, views/pages/screens contam como Presentation e
 * shared/common como Core.
 */
const SUMMARY_LAYERS = [
  { label: "Domain", folders: [_types_1.DartLayer.Domain] },
  { label: "Data", folders: [_types_1.DartLayer.Data] },
  {
    label: "Presentation",
    folders: [_types_1.DartLayer.Presentation, "views", "pages", "screens"],
  },
  { label: "Core", folders: [_types_1.DartLayer.Core, "shared", "common"] },
];
exports.default = (0, _types_1.createPlugin)(
  {
    name: "pr-summary",
    description: "Gera sumário rico da PR",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const created = git.created_files ?? [];
    const modified = git.modified_files ?? [];
    const deleted = git.deleted_files ?? [];
    const all = [...created, ...modified, ...deleted].map((f) => _types_1.DartPath.of(f));
    if (all.length === 0) {
      (0, _types_1.sendMarkdown)("**PR vazia** — nenhum arquivo alterado.");
      return;
    }
    // git.insertions/deletions só existem no dry-run: no CI as linhas vêm do diff
    const { added, removed } = await (0, _types_1.getLineStats)();
    const lines = added + removed;
    const categories = categorizeFiles(all);
    const filesOf = (category) => categories.find((c) => c.category === category)?.files ?? [];
    const dartSource = filesOf(_types_1.FileCategory.Dart);
    const testFiles = filesOf(_types_1.FileCategory.Test);
    const generatedFiles = filesOf(_types_1.FileCategory.Generated);
    const layers = detectLayers(dartSource);
    const size = getSizeInfo(dartSource.length);
    const risk = assessRisk(dartSource, testFiles, layers, categories);
    let md = `${size.emoji} Resumo da PR — ${size.label}\n\n`;
    // ── Visão geral ──
    const fileDetails = [
      created.length > 0 ? `**+${created.length}** novo(s)` : null,
      modified.length > 0 ? `**${modified.length}** modificado(s)` : null,
      deleted.length > 0 ? `**-${deleted.length}** removido(s)` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    md += "| Métrica | Valor |\n";
    md += "| :-- | :-- |\n";
    md += `| Arquivos | ${all.length} (${fileDetails}) |\n`;
    if (dartSource.length > 0) {
      md += `| Dart | **${dartSource.length}** arquivo(s) |\n`;
    }
    if (lines > 0) {
      md += `| Linhas | **+${added}** / **-${removed}** |\n`;
    }
    if (layers.length > 0) {
      const layerStr = layers.map((l) => `**${l.label}** (${l.files.length})`).join(" · ");
      md += `| Camadas | ${layerStr} |\n`;
    }
    if (testFiles.length > 0) {
      md += `| Testes | ✅ ${testFiles.length} arquivo(s) |\n`;
    } else if (dartSource.length > 0) {
      md += `| Testes | ⚠️ Nenhum teste alterado |\n`;
    }
    if (generatedFiles.length > 0) {
      md += `| Gerados | ${generatedFiles.length} arquivo(s) |\n`;
    }
    md += `| Risco | ${risk.emoji} **${risk.level}** |\n`;
    // ── Breakdown por tipo ──
    if (categories.length > 1) {
      md += "\n---\n\n";
      md += "**Breakdown por tipo**\n\n";
      md += "| Tipo | Qtd |\n";
      md += "| :-- | :--: |\n";
      for (const cat of categories) {
        md += `| ${cat.label} | ${cat.files.length} |\n`;
      }
    }
    // ── Arquivos em destaque ──
    const topFiles = getTopFiles(new Set(created), all);
    if (topFiles.length > 0) {
      md += "\n---\n\n";
      md += "**Arquivos em destaque**\n\n";
      for (const { short, isNew } of topFiles) {
        const tag = isNew ? " `novo`" : "";
        md += `- \`${short}\`${tag}\n`;
      }
    }
    // ── Fatores de risco ──
    const detectedRisks = risk.factors.filter((f) => f.detected);
    if (detectedRisks.length > 0) {
      md += "\n---\n\n";
      md += "⚠️ **Pontos de atenção**\n\n";
      for (const f of detectedRisks) {
        md += `- ${f.label}\n`;
      }
    }
    (0, _types_1.sendMarkdown)(md);
  }
);
/** Até `limit` arquivos (sem gerados e `.lock`): novos primeiro, depois os Dart. */
function getTopFiles(createdSet, all, limit = 5) {
  return all
    .filter((f) => f.category !== _types_1.FileCategory.Generated && !f.fileName.endsWith(".lock"))
    .sort((a, b) => {
      const aNew = createdSet.has(a.path) ? 1 : 0;
      const bNew = createdSet.has(b.path) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      const aDart = a.isDart ? 1 : 0;
      const bDart = b.isDart ? 1 : 0;
      return bDart - aDart;
    })
    .slice(0, limit)
    .map((f) => ({
      short: f.folderName ? `${f.folderName}/${f.fileName}` : f.fileName,
      isNew: createdSet.has(f.path),
    }));
}
/** Categorias com pelo menos um arquivo, na ordem de CATEGORY_LABELS. */
function categorizeFiles(files) {
  return CATEGORY_LABELS.map(({ category, label }) => ({
    category,
    label,
    files: files.filter((f) => f.category === category),
  })).filter((c) => c.files.length > 0);
}
function detectLayers(dartFiles) {
  const layers = SUMMARY_LAYERS.map((l) => ({ label: l.label, files: [] }));
  for (const f of dartFiles) {
    const index = SUMMARY_LAYERS.findIndex((l) => l.folders.some((folder) => f.inFolder(folder)));
    if (index >= 0) layers[index].files.push(f);
  }
  return layers.filter((l) => l.files.length > 0);
}
function getSizeInfo(dartCount) {
  if (dartCount === 0) return { label: "Sem Dart", emoji: "⚪" };
  if (dartCount <= 5) return { label: "Pequena", emoji: "🟢" };
  if (dartCount <= 15) return { label: "Média", emoji: "🟡" };
  if (dartCount <= 40) return { label: "Grande", emoji: "🟠" };
  return { label: "Muito grande", emoji: "🔴" };
}
function assessRisk(dartSource, testFiles, layers, categories) {
  const factors = [
    {
      label: "Altera camada Data (repositories, datasources)",
      detected: layers.some((l) => l.label === "Data"),
    },
    {
      label: "Arquivos de configuração modificados",
      detected: categories.some((c) => c.category === _types_1.FileCategory.Config),
    },
    {
      label: "Nenhum teste adicionado/modificado",
      detected: dartSource.length > 0 && testFiles.length === 0,
    },
    { label: "Muitos arquivos Dart alterados (>15)", detected: dartSource.length > 15 },
    { label: "Múltiplas camadas afetadas", detected: layers.length > 2 },
  ];
  const count = factors.filter((f) => f.detected).length;
  if (count >= 3) return { level: "Alto", emoji: "🔴", factors };
  if (count >= 2) return { level: "Médio", emoji: "🟡", factors };
  return { level: "Baixo", emoji: "🟢", factors };
}
