/**
 * __PLUGIN_TITLE__
 * __HEADER_DESCRIPTION__
 */
import { DartFile, createPlugin, sendFormattedFail } from "@types";

// Leia o código pelo modelo Dart (docs/CRIANDO_PLUGINS.md): chamadas, classes, campos,
// strings e comentários já vêm prontos, sem regex sobre o texto.
const WRONG_CALL = "padraoProblematico";
const RIGHT_CALL = "padraoCorreto";

export default createPlugin(
  {
    name: "__PLUGIN_NAME__",
    description: __DESCRIPTION_JSON__,
    enabled: __ENABLED__,
  },
  async () => {
    // .dart criados/modificados no PR, sem testes e sem arquivos gerados
    for (const file of DartFile.changed()) {
      for (const call of file.calls()) {
        // `call.receiver === null`: só a chamada solta, não `obj.padraoProblematico()`
        if (call.name !== WRONG_CALL || call.receiver !== null) continue;

        const wrong = call.compact; // a chamada REAL, em uma linha (igual com quebra de linha)
        const fixed = wrong.replace(`${WRONG_CALL}(`, `${RIGHT_CALL}(`); // a mesma chamada, corrigida

        sendFormattedFail({
          title: "TITULO FIXO EM CAPS", // chave do resumo: sem dados variáveis
          description:
            "Por que `padraoProblematico()` é um problema (1-2 linhas, **negrito** no essencial).",
          problem: {
            wrong,
            correct: fixed,
            wrongLabel: "Efeito do código atual",
            correctLabel: "O que muda com a correção",
          },
          action: { text: "Substitua por:", code: fixed },
          objective: "Benefício da correção em uma frase.",
          reference: { text: "Nome da doc oficial", url: "https://api.flutter.dev/" },
          file: file.path.path,
          line: call.line,
        });
      }
    }
  }
);
