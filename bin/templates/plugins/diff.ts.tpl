/**
 * __PLUGIN_TITLE__
 * __HEADER_DESCRIPTION__
 * Heurística (warn): olha só as strings das linhas que o PR adicionou.
 */
import { DartFile, DartStringRole, createPlugin, sendFormattedWarn } from "@types";

// Leia o código pelo modelo Dart (docs/CRIANDO_PLUGINS.md): strings e comentários já vêm
// com o papel (role), a chamada em volta (enclosingCallee) e a linha, sem regex sobre o texto.
const TARGET_CALLEE = "Text";

export default createPlugin(
  {
    name: "__PLUGIN_NAME__",
    description: __DESCRIPTION_JSON__,
    enabled: __ENABLED__,
  },
  async () => {
    // .dart criados/modificados no PR, sem testes e sem arquivos gerados
    for (const changed of DartFile.changed()) {
      const file = await DartFile.readWithDiff(changed.path.path);

      for (const s of file.strings) {
        if (!file.isAdded(s.line)) continue; // só o que o PR adicionou
        if (s.role !== DartStringRole.CallArgument || s.enclosingCallee !== TARGET_CALLEE) continue;
        if (s.argumentLabel !== null || s.hasInterpolation) continue;

        const wrong = s.lineText; // a linha REAL do arquivo
        const fixed = wrong.replace(s.text, "valorCorreto"); // a mesma linha, corrigida

        sendFormattedWarn({
          title: "TITULO FIXO EM CAPS", // chave do resumo: sem dados variáveis
          description: `\`${s.text}\`: por que isso é um problema (1-2 linhas, **negrito** no essencial).`,
          problem: { wrong, correct: fixed },
          action: { text: "Substitua por:", code: fixed },
          objective: "Benefício da correção em uma frase.",
          reference: { text: "Nome da doc oficial", url: "https://docs.flutter.dev/" },
          file: file.path.path,
          line: s.line,
        });
      }
    }
  }
);
