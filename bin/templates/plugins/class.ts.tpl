/**
 * __PLUGIN_TITLE__
 * __HEADER_DESCRIPTION__
 */
import { DartFile, DartLayerFolder, Presence, createPlugin, sendFormattedFail } from "@types";

// Leia o código pelo modelo Dart (docs/CRIANDO_PLUGINS.md): classes, campos e métodos
// já vêm prontos (inclusive com primary constructor), sem regex sobre o texto.
const TARGET_FOLDER = DartLayerFolder.Models;
const REQUIRED_MEMBER = "membroObrigatorio";

export default createPlugin(
  {
    name: "__PLUGIN_NAME__",
    description: __DESCRIPTION_JSON__,
    enabled: __ENABLED__,
  },
  async () => {
    // .dart criados/modificados no PR, sem testes e sem arquivos gerados
    for (const file of DartFile.changed()) {
      if (!file.path.inFolder(TARGET_FOLDER) || file.path.isBarrel) continue;

      for (const cls of file.classes) {
        if (cls.isAbstract || cls.isPrivate || cls.isIgnoredBy("__PLUGIN_NAME__")) continue;
        // Present ou Unknown (a classe tem trecho não reconhecido): não reporta
        if (cls.hasMember(REQUIRED_MEMBER) !== Presence.Absent) continue;

        const member = `  void ${REQUIRED_MEMBER}() {}`; // o membro que falta, pronto para copiar

        sendFormattedFail({
          title: "TITULO FIXO EM CAPS", // chave do resumo: sem dados variáveis
          description: `\`${cls.name}\` não tem \`${REQUIRED_MEMBER}\`: por que isso é um problema (1-2 linhas).`,
          problem: {
            wrong: `${cls.header}\n  // ...\n}`, // o cabeçalho REAL da classe, em uma linha
            correct: `${cls.header}\n${member}\n}`,
          },
          action: { text: "Adicione:", code: member.trim() },
          objective: "Benefício da correção em uma frase.",
          reference: { text: "Nome da doc oficial", url: "https://dart.dev/" },
          file: file.path.path,
          line: cls.nameLine,
        });
      }
    }
  }
);
