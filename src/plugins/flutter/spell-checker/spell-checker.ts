/**
 * Spell Checker Plugin
 * Verifica ortografia em identificadores Dart usando cspell.
 *
 * Analisa apenas linhas adicionadas no diff (não o arquivo inteiro).
 * Extrai classes, métodos, variáveis e parâmetros, quebra camelCase/PascalCase
 * em palavras individuais, e verifica cada uma com cspell.
 *
 * Agrupa erros por arquivo para evitar ruído excessivo.
 */
import { createPlugin, getDanger, sendFormattedFail, sendMessage } from "@types";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const TECH_WORDS = [
  "viewmodel",
  "usecase",
  "datasource",
  "dto",
  "auth",
  "config",
  "admin",
  "navbar",
  "sidebar",
  "dropdown",
  "popup",
  "integrator",
  "dashboard",
  "analytics",
  "workflow",
  "notification",
  "realtime",
  "offline",
  "sync",
  "async",
  "api",
  "endpoint",
  "serializable",
  "bloc",
  "cubit",
  "riverpod",
  "getx",
  "hive",
  "isar",
  "freezed",
  "equatable",
  "dartz",
  "fpdart",
  "sliver",
  "scaffold",
  "appbar",
  "snackbar",
  "bottomsheet",
  "pageview",
  "tabbar",
  "listview",
  "gridview",
  "textfield",
  "checkbox",
  "radiobutton",
  "inkwell",
  "gesturedetector",
  "stateful",
  "stateless",
  "mixin",
  "typedef",
  "enum",
  "impl",
  "repo",
  "infra",
  "params",
  "args",
  "ctx",
  "btn",
  "img",
  "nav",
  "util",
  "utils",
  "validator",
  "formatter",
  "mapper",
  "adapter",
  "middleware",
  "interceptor",
  "injectable",
  "singleton",
  "multiton",
  "debounce",
  "throttle",
  "paginator",
  "pagination",
  "serializer",
  "deserializer",
  "locator",
  "localization",
  "i18n",
  "l10n",
  "dio",
  "retrofit",
  "chopper",
  "http",
  "grpc",
  "graphql",
  "websocket",
  "mqtt",
  "firebase",
  "supabase",
  "appwrite",
  "amplify",
  "crashlytics",
  "pubspec",
  "yaml",
  "json",
  "xml",
  "csv",
  "sqlite",
  "hivedb",
  "objectbox",
  "sharedpreferences",
  "securestorage",
  "keychain",
  "biometric",
  "onboarding",
  "signup",
  "signin",
  "logout",
  "otp",
  "oauth",
  "jwt",
  "uuid",
  "regex",
  "cron",
  "webhook",
  "sdk",
  "cli",
  "env",
  "devtools",
  "lottie",
  "rive",
  "svg",
  "png",
  "webp",
  "rgba",
  "argb",
  "hex",
  "datetime",
  "timestamp",
  "timezone",
  "utc",
  "nullable",
  "nonnull",
  "iterable",
  "streamable",
  "disposable",
  "cancelable",
  "listenable",
  "notifier",
  "changenotifier",
  "valuenotifier",
  "statenotifier",
  "asyncnotifier",
  "futurebuilder",
  "streambuilder",
  "valuelistenablebuilder",
  "animationcontroller",
  "tweenanimation",
  "pagecontroller",
  "scrollcontroller",
  "tabcontroller",
  "textcontroller",
  "focusnode",
  "formkey",
  "globalkey",
  "navigatorkey",
  "scaffoldkey",
  "mediaquery",
  "layoutbuilder",
  "orientationbuilder",
  "sliverappbar",
  "sliverlist",
  "slivergrid",
  "customscrollview",
  "nestedscrollview",
  "reorderablelist",
  "dismissible",
  "draggable",
  "interactivviewer",
  "repaintboundary",
  "cliprrect",
  "clipoval",
  "clippath",
  "backdropfilter",
  "colorfiltered",
  "imagefiltered",
  "shadermask",
  "custompaint",
  "custompainter",
  "renderobject",
  "renderbox",
  "widgetspan",
  "textspan",
  "richtext",
  "selectabletext",
  "editabletext",
  "autocomplete",
  "typeahead",
  "searchbar",
  "filterchip",
  "choicechip",
  "actionchip",
  "inputchip",
  "datatable",
  "paginateddatatable",
  "expansiontile",
  "expansionpanel",
  "stepper",
  "timeline",
  "carousel",
  "parallax",
  "shimmer",
  "skeleton",
  "placeholder",
  "errorwidget",
  "fallback",
  "initializer",
  "bootstrapper",
  "usecase",
  "interactor",
  "presenter",
  "viewstate",
  "uistate",
  "baserepository",
  "basedatasource",
  "baseviewmodel",
  "baseentity",
  "basefailure",
  "basemodel",
  "basestate",
  "basewidget",
  "basepage",
];

const PT_COMMON = new Set([
  "pessoa",
  "pessoas",
  "usuario",
  "usuarios",
  "cliente",
  "clientes",
  "produto",
  "produtos",
  "pedido",
  "pedidos",
  "compra",
  "compras",
  "venda",
  "vendas",
  "pagamento",
  "pagamentos",
  "endereco",
  "enderecos",
  "cidade",
  "cidades",
  "estado",
  "estados",
  "empresa",
  "empresas",
  "funcionario",
  "funcionarios",
  "conta",
  "contas",
  "banco",
  "senha",
  "senhas",
  "mensagem",
  "mensagens",
  "notificacao",
  "notificacoes",
  "configuracao",
  "configuracoes",
  "categoria",
  "categorias",
  "comentario",
  "comentarios",
  "arquivo",
  "arquivos",
  "documento",
  "documentos",
  "imagem",
  "imagens",
  "foto",
  "fotos",
  "tarefa",
  "tarefas",
  "projeto",
  "projetos",
  "equipe",
  "equipes",
  "relatorio",
  "relatorios",
  "resultado",
  "resultados",
  "cadastro",
  "cadastros",
  "registro",
  "registros",
  "carrinho",
  "estoque",
  "fatura",
  "faturas",
  "boleto",
  "boletos",
  "parcela",
  "parcelas",
  "desconto",
  "descontos",
  "cupom",
  "cupons",
  "entrega",
  "entregas",
  "frete",
  "motorista",
  "aluno",
  "alunos",
  "professor",
  "professores",
  "escola",
  "escolas",
  "curso",
  "cursos",
  "aula",
  "aulas",
  "prova",
  "provas",
  "nota",
  "notas",
  "medico",
  "medicos",
  "paciente",
  "pacientes",
  "consulta",
  "consultas",
  "receita",
  "receitas",
  "exame",
  "exames",
  "remedio",
  "carro",
  "carros",
  "casa",
  "casas",
  "livro",
  "livros",
  "jogo",
  "jogos",
  "loja",
  "lojas",
  "nome",
  "nomes",
  "idade",
  "tipo",
  "tipos",
  "valor",
  "valores",
  "preco",
  "precos",
  "numero",
  "numeros",
  "quantidade",
  "tamanho",
  "peso",
  "altura",
  "cor",
  "cores",
  "hora",
  "horas",
  "tempo",
  "titulo",
  "titulos",
  "descricao",
  "texto",
  "textos",
  "campo",
  "campos",
  "lista",
  "listas",
  "grupo",
  "grupos",
  "perfil",
  "nivel",
  "erro",
  "erros",
  "aviso",
  "avisos",
  "sucesso",
  "falha",
  "falhas",
  "resposta",
  "respostas",
  "requisicao",
  "servico",
  "servicos",
  "repositorio",
  "tela",
  "telas",
  "pagina",
  "paginas",
  "botao",
  "formulario",
  "tabela",
  "tabelas",
  "filial",
  "filiais",
  "orcamento",
  "contrato",
  "contratos",
  "fornecedor",
  "fornecedores",
  "lote",
  "lotes",
  "calcular",
  "buscar",
  "salvar",
  "deletar",
  "remover",
  "atualizar",
  "criar",
  "listar",
  "obter",
  "pegar",
  "enviar",
  "receber",
  "validar",
  "verificar",
  "processar",
  "executar",
  "carregar",
  "exibir",
  "mostrar",
  "esconder",
  "ocultar",
  "abrir",
  "fechar",
  "iniciar",
  "finalizar",
  "cancelar",
  "confirmar",
  "aprovar",
  "rejeitar",
  "filtrar",
  "ordenar",
  "pesquisar",
  "cadastrar",
  "autenticar",
  "formatar",
  "converter",
  "gerar",
  "imprimir",
  "copiar",
  "mover",
  "adicionar",
  "inserir",
  "editar",
  "alterar",
  "modificar",
  "excluir",
  "apagar",
  "limpar",
  "conectar",
  "desconectar",
  "sincronizar",
  "notificar",
  "selecionar",
  "marcar",
  "desmarcar",
  "habilitar",
  "desabilitar",
  "ativar",
  "desativar",
  "bloquear",
  "desbloquear",
  "preencher",
  "completar",
  "ativo",
  "ativa",
  "inativo",
  "inativa",
  "novo",
  "nova",
  "antigo",
  "antiga",
  "atual",
  "principal",
  "secundario",
  "publico",
  "privado",
  "aberto",
  "fechado",
  "disponivel",
  "obrigatorio",
  "opcional",
  "valido",
  "invalido",
  "vazio",
  "grande",
  "pequeno",
  "maximo",
  "minimo",
  "primeiro",
  "ultimo",
  "proximo",
  "anterior",
  "padrao",
  "temporario",
  "favorito",
  "selecionado",
  "logado",
  "autenticado",
  "pendente",
  "aprovado",
  "rejeitado",
  "concluido",
  "cancelado",
  "por",
  "para",
  "com",
  "sem",
  "entre",
  "sobre",
  "desde",
  "ate",
  "dentro",
  "fora",
  "antes",
  "depois",
  "durante",
]);

interface IdentifierInfo {
  word: string;
  identifier: string;
  type: string;
  line: number;
  context: string;
}

function breakCamelCase(identifier: string): string[] {
  return identifier
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_]+/)
    .filter((w) => w.length > 2)
    .filter((w) => !/^\d+$/.test(w))
    .map((w) => w.toLowerCase());
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("///");
}

function extractIdentifiers(line: string, lineNumber: number): IdentifierInfo[] {
  const results: IdentifierInfo[] = [];

  if (isCommentLine(line)) return results;

  const clean = line
    .replace(/\/\/.*$/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'[^']*'/g, '""')
    .replace(/"[^"]*"/g, '""')
    .replace(/r'[^']*'/g, '""')
    .replace(/r"[^"]*"/g, '""');

  if (!clean.trim()) return results;

  const classMatch = clean.match(
    /(?:abstract\s+interface\s+class|abstract\s+class|final\s+class|sealed\s+class|class)\s+([A-Za-z_]\w*)/
  );
  if (classMatch) {
    for (const word of breakCamelCase(classMatch[1])) {
      results.push({
        word,
        identifier: classMatch[1],
        type: "class",
        line: lineNumber,
        context: line.trim(),
      });
    }
  }

  const methodRe =
    /(?:Future<[^>]*>|void|String|int|double|bool|dynamic|List<[^>]*>|Map<[^,>]*,[^>]*>|Set<[^>]*>|[A-Z]\w*(?:<[^>]*>)?)\s+([a-z_]\w*)\s*\(/g;
  let m;
  while ((m = methodRe.exec(clean)) !== null) {
    const name = m[1];
    if (
      /^(get|set|build|createState|initState|dispose|toString|hashCode|main|runApp|of|from|parse|tryParse)$/.test(
        name
      )
    )
      continue;
    for (const word of breakCamelCase(name)) {
      results.push({
        word,
        identifier: name,
        type: "method",
        line: lineNumber,
        context: line.trim(),
      });
    }
  }

  const varRe =
    /(?:final|const|var|late\s+final|late)\s+(?:[A-Za-z_]\w*(?:<[^>]*>)?\s+)?([a-z_]\w*)\s*[=;]/g;
  while ((m = varRe.exec(clean)) !== null) {
    const name = m[1];
    if (/^(i|j|k|e|x|y|_)$/.test(name)) continue;
    for (const word of breakCamelCase(name)) {
      results.push({
        word,
        identifier: name,
        type: "variable",
        line: lineNumber,
        context: line.trim(),
      });
    }
  }

  return results;
}

function getVscodeWords(): string[] {
  try {
    if (!fs.existsSync(".vscode/settings.json")) return [];
    const settings = JSON.parse(fs.readFileSync(".vscode/settings.json", "utf-8"));
    return settings["cSpell.words"] || [];
  } catch {
    return [];
  }
}

export default createPlugin(
  {
    name: "spell-checker",
    description: "Verifica ortografia em identificadores Dart",
    enabled: true,
  },
  async () => {
    const danger = getDanger();

    const dartFiles = [...danger.git.created_files, ...danger.git.modified_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.endsWith(".mocks.dart") &&
        !f.includes("/generated/") &&
        fs.existsSync(f)
    );

    if (dartFiles.length === 0) return;

    const tmpDir = path.join(os.tmpdir(), `danger-spell-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const wordsFile = path.join(tmpDir, "words.txt");
    const configFile = path.join(tmpDir, "cspell.json");

    try {
      const allIdentifiers: (IdentifierInfo & { file: string })[] = [];
      const uniqueWords = new Set<string>();

      for (const file of dartFiles) {
        const diff = await danger.git.structuredDiffForFile(file);
        if (!diff) continue;

        for (const chunk of diff.chunks) {
          for (const change of chunk.changes) {
            if ((change as any).type !== "add") continue;

            const lineContent = (change as any).content?.replace(/^\+/, "") ?? "";
            const lineNum = (change as any).ln ?? 1;

            if (lineContent.trim().startsWith("import ")) continue;
            if (lineContent.trim().startsWith("export ")) continue;
            if (lineContent.trim().startsWith("part ")) continue;

            const identifiers = extractIdentifiers(lineContent, lineNum);
            for (const id of identifiers) {
              uniqueWords.add(id.word);
              allIdentifiers.push({ ...id, file });
            }
          }
        }
      }

      if (uniqueWords.size === 0) return;

      fs.writeFileSync(wordsFile, Array.from(uniqueWords).join("\n"));

      const vscodeWords = getVscodeWords();
      const allCustomWords = [...new Set([...TECH_WORDS, ...vscodeWords])];

      const cspellConfig = {
        version: "0.2",
        language: "en",
        import: [
          "@cspell/dict-dart/cspell-ext.json",
          "@cspell/dict-flutter/cspell-ext.json",
          "@cspell/dict-software-terms/cspell-ext.json",
        ],
        dictionaries: ["dart", "flutter", "softwareTerms", "custom-terms"],
        dictionaryDefinitions: [{ name: "custom-terms", words: allCustomWords }],
      };

      fs.writeFileSync(configFile, JSON.stringify(cspellConfig, null, 2));

      let cspellOutput = "";
      try {
        execSync(
          `./node_modules/.bin/cspell --config ${configFile} --no-progress --no-summary ${wordsFile}`,
          { encoding: "utf-8", stdio: "pipe", timeout: 30000 }
        );
      } catch (error: any) {
        cspellOutput = error.stdout || "";
      }

      const misspelled = new Set<string>();
      const regex = /words\.txt:\d+:\d+\s*-\s*Unknown word \(([^)]+)\)/g;
      let match;
      while ((match = regex.exec(cspellOutput)) !== null) {
        misspelled.add(match[1].toLowerCase());
      }

      if (misspelled.size === 0) return;

      type TaggedId = IdentifierInfo & { file: string; reason: "typo" | "portuguese" };
      const errorsByFile = new Map<string, TaggedId[]>();

      for (const id of allIdentifiers) {
        if (!misspelled.has(id.word.toLowerCase())) continue;

        const reason: "typo" | "portuguese" = PT_COMMON.has(id.word.toLowerCase())
          ? "portuguese"
          : "typo";

        const existing = errorsByFile.get(id.file) ?? [];
        const isDup = existing.some((e) => e.word === id.word && e.line === id.line);
        if (!isDup) {
          existing.push({ ...id, reason });
          errorsByFile.set(id.file, existing);
        }
      }

      const typeMap: Record<string, string> = {
        class: "classe",
        method: "método",
        variable: "variável",
        parameter: "parâmetro",
      };

      let totalErrors = 0;

      for (const [file, errors] of errorsByFile) {
        const ptErrors = errors.filter((e) => e.reason === "portuguese").slice(0, 10);
        const typoErrors = errors.filter((e) => e.reason === "typo").slice(0, 10);

        if (ptErrors.length > 0) {
          totalErrors += ptErrors.length;
          const items = ptErrors
            .map(
              (e) =>
                `\`${e.word}\` em ${typeMap[e.type] || e.type} \`${e.identifier}\` (linha ${e.line})`
            )
            .join("\n");

          sendFormattedFail({
            title: "IDENTIFICADOR EM PORTUGUÊS",
            description: `**${ptErrors.length} palavra(s)** em português detectada(s). Identificadores devem ser em **inglês**.`,
            problem: {
              wrong: items,
              correct: `// Renomeie para inglês`,
              wrongLabel: "Palavras em português",
              correctLabel: "Ação",
            },
            action: {
              text: "Renomeie os identificadores para inglês:",
              code: `// Exemplo: usuario → user, pedido → order`,
            },
            objective: "Código em inglês facilita **manutenção** e **padronização**.",
            file,
            line: ptErrors[0].line,
          });
        }

        if (typoErrors.length > 0) {
          totalErrors += typoErrors.length;
          const items = typoErrors
            .map(
              (e) =>
                `\`${e.word}\` em ${typeMap[e.type] || e.type} \`${e.identifier}\` (linha ${e.line})`
            )
            .join("\n");

          sendFormattedFail({
            title: "ERRO ORTOGRÁFICO",
            description: `**${typoErrors.length} palavra(s)** com possível typo detectada(s).`,
            problem: {
              wrong: items,
              correct: `// Corrija ou adicione ao dicionário`,
              wrongLabel: "Possíveis typos",
              correctLabel: "Ação",
            },
            action: {
              text: "Corrija o nome ou adicione ao dicionário:",
              code: `// .vscode/settings.json → "cSpell.words": ["palavra"]`,
            },
            objective: "Nomes corretos melhoram **legibilidade** do código.",
            file,
            line: typoErrors[0].line,
          });
        }
      }

      if (totalErrors > 0) {
        sendMessage(
          `**Spell Check**: ${totalErrors} problema(s) em ${errorsByFile.size} arquivo(s)`
        );
      }
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
);
