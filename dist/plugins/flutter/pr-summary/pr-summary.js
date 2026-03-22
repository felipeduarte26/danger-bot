"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * PR Summary Plugin
 * Gera um sumário rico da PR com métricas, camadas, risco e checklist.
 * Usa apenas Markdown puro (sem HTML) para compatibilidade com Bitbucket Cloud.
 */
const _types_1 = require("../../../types");
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
    const all = [...created, ...modified, ...deleted];
    if (all.length === 0) {
      (0, _types_1.sendMarkdown)("**PR vazia** — nenhum arquivo alterado.");
      return;
    }
    const added = git.insertions || 0;
    const removed = git.deletions || 0;
    const lines = added + removed;
    const categories = categorizeFiles(all);
    const dartSource = categories.find((c) => c.label === "Dart")?.files ?? [];
    const testFiles = categories.find((c) => c.label === "Testes")?.files ?? [];
    const generatedFiles = categories.find((c) => c.label === "Gerados")?.files ?? [];
    const layers = detectLayers(dartSource);
    const size = getSizeInfo(dartSource.length);
    const risk = assessRisk(dartSource, testFiles, layers, categories);
    let md = `## ${size.emoji} Resumo da PR — ${size.label}\n\n`;
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
    const relevantCategories = categories.filter((c) => c.files.length > 0);
    if (relevantCategories.length > 1) {
      md += "\n---\n\n";
      md += "**Breakdown por tipo**\n\n";
      md += "| Tipo | Qtd |\n";
      md += "| :-- | :--: |\n";
      for (const cat of relevantCategories) {
        md += `| ${cat.label} | ${cat.files.length} |\n`;
      }
    }
    // ── Arquivos em destaque ──
    const topFiles = getTopFiles(created, modified, all);
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
    // ── Checklist ──
    if (dartSource.length > 0) {
      md += "\n---\n\n";
      md += "**Checklist**\n\n";
      md += "| | Item |\n";
      md += "| :--: | :-- |\n";
      md += "| ⬜ | Testado em dispositivo Android |\n";
      md += "| ⬜ | Testado em dispositivo iOS |\n";
      md += "| ⬜ | Testado em Plataforma WEB (Servidor) |\n";
      md += "| ⬜ | UI responsiva em diferentes tamanhos de tela |\n";
    }
    (0, _types_1.sendMarkdown)(md);
  }
);
function getTopFiles(created, modified, all, limit = 5) {
  const createdSet = new Set(created);
  return all
    .filter((f) => !f.match(/\.(g|freezed|mocks?)\.dart$/) && !f.match(/\.lock$/))
    .sort((a, b) => {
      const aNew = createdSet.has(a) ? 1 : 0;
      const bNew = createdSet.has(b) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      const aDart = a.endsWith(".dart") ? 1 : 0;
      const bDart = b.endsWith(".dart") ? 1 : 0;
      return bDart - aDart;
    })
    .slice(0, limit)
    .map((f) => ({
      short: f.split("/").slice(-2).join("/"),
      isNew: createdSet.has(f),
    }));
}
function categorizeFiles(files) {
  const cats = [
    { label: "Dart", files: [] },
    { label: "Testes", files: [] },
    { label: "Gerados", files: [] },
    { label: "Config", files: [] },
    { label: "Assets", files: [] },
    { label: "Docs", files: [] },
    { label: "Outros", files: [] },
  ];
  for (const f of files) {
    if (f.match(/\.(g|freezed|mocks?)\.dart$/)) {
      cats[2].files.push(f);
    } else if (f.match(/_test\.dart$/)) {
      cats[1].files.push(f);
    } else if (f.endsWith(".dart")) {
      cats[0].files.push(f);
    } else if (
      f.match(/pubspec\.(yaml|lock)$|\.gradle|Podfile|analysis_options|\.env|\.properties/)
    ) {
      cats[3].files.push(f);
    } else if (f.match(/\.(png|jpg|jpeg|gif|svg|webp|ttf|otf|json)$/) || f.includes("/assets/")) {
      cats[4].files.push(f);
    } else if (f.match(/\.(md|txt)$/i) || f.match(/README|CHANGELOG|LICENSE/i)) {
      cats[5].files.push(f);
    } else {
      cats[6].files.push(f);
    }
  }
  return cats.filter((c) => c.files.length > 0);
}
function detectLayers(dartFiles) {
  const layers = [
    { label: "Domain", pattern: /\/domain\//, files: [] },
    { label: "Data", pattern: /\/data\//, files: [] },
    {
      label: "Presentation",
      pattern: /\/presentation\/|\/views\/|\/pages\/|\/screens\//,
      files: [],
    },
    { label: "Core", pattern: /\/core\/|\/shared\/|\/common\//, files: [] },
  ];
  for (const f of dartFiles) {
    for (const layer of layers) {
      if (layer.pattern.test(f)) {
        layer.files.push(f);
        break;
      }
    }
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
      detected: categories.some((c) => c.label === "Config"),
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
