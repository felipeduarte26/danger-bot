/**
 * __PLUGIN_TITLE__
 * __HEADER_DESCRIPTION__
 */
import { DartFile, DartLayerFolder, createPlugin, sendFormattedFail } from "@types";

// Só o caminho do arquivo (docs/CRIANDO_PLUGINS.md): `file.path` dá camada, pasta de papel,
// feature, nome e barrel sem ler o conteúdo.
const TARGET_FOLDER = DartLayerFolder.UseCases;
const REQUIRED_SUFFIX = "_usecase.dart";

export default createPlugin(
  {
    name: "__PLUGIN_NAME__",
    description: __DESCRIPTION_JSON__,
    enabled: __ENABLED__,
  },
  async () => {
    // .dart criados/modificados no PR, sem testes e sem arquivos gerados
    for (const { path } of DartFile.changed()) {
      if (!path.inFolder(TARGET_FOLDER) || path.isBarrel) continue;
      if (path.fileName.endsWith(REQUIRED_SUFFIX)) continue;

      const fixed = `${path.baseName}${REQUIRED_SUFFIX}`; // o nome REAL do arquivo, corrigido

      sendFormattedFail({
        title: "TITULO FIXO EM CAPS", // chave do resumo: sem dados variáveis
        description: `\`${path.fileName}\` está em \`${path.folderName}/\` sem o sufixo \`${REQUIRED_SUFFIX}\`.`,
        problem: { wrong: path.fileName, correct: fixed, language: "text" },
        action: { text: "Renomeie o arquivo:", code: fixed, language: "text" },
        objective: "Benefício da correção em uma frase.",
        reference: { text: "Nome da doc oficial", url: "https://dart.dev/effective-dart/style" },
        file: path.path,
        line: 1,
      });
    }
  }
);
