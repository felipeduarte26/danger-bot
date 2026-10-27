"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Identifier Language Plugin
 * Detecta nomes de classes, métodos e variáveis que não estão em inglês.
 * O padrão do projeto é código 100% em inglês.
 *
 * O que analisa nos `.dart` do PR (exceto `_test.dart`, `.g.dart` e `.freezed.dart`),
 * pelo modelo Dart — strings e comentários nunca viram identificador:
 * - comentários `//` e `///` em linha própria (os do fim da linha e os de bloco ficam
 *   de fora), exceto `ignore:`, `coverage:`, TODO, FIXME, `{@...}`, `@...` e textos
 *   com menos de 10 caracteres;
 * - nomes declarados: classes, enums, métodos/funções com tipo de retorno simples e não
 *   nullable, funções locais e variáveis declaradas com `final`/`const`/`var`/`late`,
 *   sem tipo ou com tipo simples (campos, de topo, locais e parâmetros `final`).
 *   Tipo simples: sem genérico aninhado, prefixo de import, tipo de função ou record — é a
 *   cobertura que o plugin sempre teve. Variáveis de `for-in` e nomes de API comuns
 *   (`build`, `toJson`, `value`...) ficam de fora. Palavras com até 2 letras e palavras
 *   que existem em PT e EN (`data`, `total`...) não contam.
 *
 * Detecção:
 * 1. Dicionário interno (~400 palavras PT comuns em código) — rápido e preciso
 * 2. cspell (dicionário EN) — valida se a palavra é inglês válido; se NÃO é
 *    inglês e está a até 1-2 letras de uma palavra PT conhecida → sinaliza
 *    (pega variantes como "filials"); sem cspell, esse passo não reporta nada
 *
 * O eld (detector de idioma) fica desligado: palavra por palavra ele reprovava
 * comentários e identificadores em inglês (`listener`, `internal`, "Converts this
 * model to a map"). Medido no esfera-web: 181 → 2.022 falhas com ele ligado.
 * Para religar, carregue `_eld` em `loadDependencies` e recalibre as heurísticas.
 *
 * Tradução:
 * - Identificadores: dicionário PT→EN interno
 * - Comentários/documentação: Google Translate (lib translate, sem API key)
 */
const _types_1 = require("../../../types.js");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const native_import_1 = require("../../../native-import");
/** Detector de idioma: desligado de propósito (ver o cabeçalho do arquivo). */
const _eld = null;
let _depsLoaded = false;
let _translate = null;
async function loadDependencies() {
  if (_depsLoaded) return;
  _depsLoaded = true;
  try {
    const tMod = await (0, native_import_1.importModule)("translate");
    _translate = tMod.default ?? tMod;
  } catch {
    // translate nao disponivel
  }
}
async function translateToEnglish(text) {
  if (!_translate) return null;
  try {
    const result = await Promise.race([
      _translate(text, { from: "pt", to: "en" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    return typeof result === "string" && result !== text ? result : null;
  } catch {
    return null;
  }
}
// ---------------------------------------------------------------------------
// cspell integration — valida batch de palavras contra dicionário EN
// ---------------------------------------------------------------------------
function validateWordsWithCspell(words) {
  if (words.size === 0) return new Set();
  const tmpDir = path.join(os.tmpdir(), `danger-idlang-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const wordsFile = path.join(tmpDir, "words.txt");
  const configFile = path.join(tmpDir, "cspell.json");
  try {
    fs.writeFileSync(wordsFile, Array.from(words).join("\n"));
    const customWords = getProjectCustomWords();
    const cspellConfig = {
      version: "0.2",
      language: "en",
      import: [
        "@cspell/dict-dart/cspell-ext.json",
        "@cspell/dict-flutter/cspell-ext.json",
        "@cspell/dict-software-terms/cspell-ext.json",
      ],
      dictionaries: ["dart", "flutter", "softwareTerms", "project-terms"],
      dictionaryDefinitions: [{ name: "project-terms", words: customWords }],
    };
    fs.writeFileSync(configFile, JSON.stringify(cspellConfig, null, 2));
    let cspellOutput = "";
    try {
      (0, child_process_1.execSync)(
        // --root: o cspell ignora arquivos fora da raiz (cwd por padrão)
        `./node_modules/.bin/cspell --config ${configFile} --root ${tmpDir} --no-progress --no-summary ${wordsFile}`,
        { encoding: "utf-8", stdio: "pipe", timeout: 30000 }
      );
    } catch (error) {
      cspellOutput = error.stdout || "";
    }
    const misspelled = new Set();
    const regex = /words\.txt:\d+:\d+\s*-\s*Unknown word \(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(cspellOutput)) !== null) {
      misspelled.add(match[1].toLowerCase());
    }
    return misspelled;
  } catch {
    return new Set();
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
}
function getProjectCustomWords() {
  const techWords = [
    "viewmodel",
    "usecase",
    "datasource",
    "dto",
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
    "appbar",
    "snackbar",
    "bottomsheet",
    "inkwell",
    "stateful",
    "stateless",
    "mixin",
    "typedef",
    "impl",
    "infra",
    "params",
    "args",
    "ctx",
    "btn",
    "img",
    "nav",
    "util",
    "utils",
    "debounce",
    "throttle",
    "paginator",
    "dio",
    "retrofit",
    "chopper",
    "grpc",
    "graphql",
    "websocket",
    "mqtt",
    "firebase",
    "supabase",
    "crashlytics",
    "pubspec",
    "sqlite",
    "onboarding",
    "signup",
    "signin",
    "oauth",
    "jwt",
    "uuid",
    "regex",
    "cron",
    "webhook",
    "lottie",
    "rive",
    "rgba",
    "argb",
    "datetime",
    "timestamp",
    "timezone",
    "nullable",
    "nonnull",
    "iterable",
    "cancelable",
    "listenable",
    "notifier",
    "changenotifier",
    "valuenotifier",
    "statenotifier",
    "asyncnotifier",
    "sliverappbar",
    "mediaquery",
    "autocomplete",
    "typeahead",
    "datatable",
    "shimmer",
    "skeleton",
    "interactor",
    "presenter",
  ];
  let vscodeWords = [];
  try {
    if (fs.existsSync(".vscode/settings.json")) {
      const settings = JSON.parse(fs.readFileSync(".vscode/settings.json", "utf-8"));
      vscodeWords = settings["cSpell.words"] || [];
    }
  } catch {
    // ignore
  }
  return [...new Set([...techWords, ...vscodeWords])];
}
const NON_ENGLISH_LANGS = new Set(["pt", "es"]);
function isNonEnglish(text) {
  if (!_eld || text.length < 8) return false;
  try {
    const result = _eld.detect(text);
    return NON_ENGLISH_LANGS.has(result?.language) && result.isReliable();
  } catch {
    return false;
  }
}
function cleanTextForDetection(text) {
  return text
    .replace(/[^a-zA-ZáàâãéèêíïóôõúüçÁÀÂÃÉÈÊÍÏÓÔÕÚÜÇ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function detectWordLang(word) {
  if (!_eld || word.length < 4) return null;
  try {
    const result = _eld.detect(word);
    return result?.isReliable() ? result.language : null;
  } catch {
    return null;
  }
}
/**
 * Verificação relaxada para palavras que cspell JÁ confirmou como inválidas em EN.
 * Não exige isReliable() do eld — se a detecção indica PT/ES, mesmo com baixa
 * confiança, é suficiente (cspell já deu o sinal forte).
 * Também verifica proximidade com palavras PT conhecidas.
 */
function isLikelyNonEnglish(word) {
  if (_eld && word.length >= 6) {
    try {
      const result = _eld.detect(word);
      if (result?.language && NON_ENGLISH_LANGS.has(result.language)) return true;
    } catch {
      // fallthrough
    }
  }
  const normalized = _types_1.DartText.stripAccents(word);
  const maxDist = normalized.length <= 5 ? 1 : 2;
  for (const ptWord of PT_WORDS) {
    if (Math.abs(ptWord.length - normalized.length) > maxDist) continue;
    if (_types_1.DartText.levenshtein(normalized, ptWord) <= maxDist) return true;
  }
  return false;
}
function isNonEnglishComment(text) {
  const cleaned = cleanTextForDetection(text);
  if (isNonEnglish(cleaned)) return true;
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 4);
  let nonEnCount = 0;
  for (const w of words) {
    const lang = detectWordLang(w);
    if (lang && lang !== "en") nonEnCount++;
  }
  return nonEnCount >= 1;
}
const PT_WORDS = new Set([
  // Substantivos comuns em código
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
  "pais",
  "paises",
  "empresa",
  "empresas",
  "funcionario",
  "funcionarios",
  "empregado",
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
  "video",
  "videos",
  "musica",
  "musicas",
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
  "motoristas",
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
  "remedios",
  "animal",
  "animais",
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
  "idades",
  "sexo",
  "tipo",
  "tipos",
  "valor",
  "valores",
  "preco",
  "precos",
  "total",
  "totais",
  "numero",
  "numeros",
  "quantidade",
  "tamanho",
  "peso",
  "altura",
  "cor",
  "cores",
  "data",
  "datas",
  "hora",
  "horas",
  "tempo",
  "titulo",
  "titulos",
  "descricao",
  "descricoes",
  "texto",
  "textos",
  "campo",
  "campos",
  "lista",
  "listas",
  "item",
  "itens",
  "grupo",
  "grupos",
  "perfil",
  "perfis",
  "nivel",
  "niveis",
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
  "requisicoes",
  "servico",
  "servicos",
  "repositorio",
  "repositorios",
  "tela",
  "telas",
  "pagina",
  "paginas",
  "botao",
  "botoes",
  "formulario",
  "formularios",
  "tabela",
  "tabelas",
  "filial",
  "filiais",
  "orcamento",
  "orcamentos",
  "contrato",
  "contratos",
  "fornecedor",
  "fornecedores",
  "lote",
  "lotes",
  "remetente",
  "remetentes",
  "destinatario",
  "destinatarios",
  "transportadora",
  "transportadoras",
  "rastreamento",
  "rastreio",
  "envio",
  "envios",
  "despacho",
  "remessa",
  "remessas",
  "frete",
  "fretes",
  "romaneio",
  "etiqueta",
  "etiquetas",
  "embalagem",
  "embalagens",
  "logistica",
  "armazem",
  "deposito",
  "coleta",
  "coletas",
  "devolucao",
  "devolucoes",
  "recebimento",
  "expedicao",
  "conferencia",
  "conferencias",
  "inventario",
  "inventarios",
  "nota",
  "fiscal",
  "imposto",
  "impostos",
  "tributo",
  "tributos",
  "aliquota",
  "descricao",
  "observacao",
  "observacoes",
  "situacao",
  "aprovacao",
  "rejeicao",
  "emissao",
  "vencimento",
  "cobranca",
  "cobrancas",
  "recibo",
  "recibos",
  "comprovante",
  "comprovantes",
  "lancamento",
  "lancamentos",
  "extrato",
  "saldo",
  "debito",
  "credito",
  "transferencia",
  "transferencias",
  "deposito",
  "depositos",
  "movimentacao",
  "movimentacoes",
  // Verbos comuns em métodos
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
  "consultar",
  "cadastrar",
  "registrar",
  "logar",
  "deslogar",
  "autenticar",
  "formatar",
  "converter",
  "transformar",
  "traduzir",
  "importar",
  "exportar",
  "gerar",
  "imprimir",
  "copiar",
  "colar",
  "mover",
  "adicionar",
  "inserir",
  "editar",
  "alterar",
  "modificar",
  "excluir",
  "apagar",
  "limpar",
  "resetar",
  "reiniciar",
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
  "finalizar",
  // Adjetivos comuns
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
  "secundaria",
  "publico",
  "publica",
  "privado",
  "privada",
  "aberto",
  "aberta",
  "fechado",
  "fechada",
  "disponivel",
  "indisponivel",
  "obrigatorio",
  "obrigatoria",
  "opcional",
  "valido",
  "valida",
  "invalido",
  "invalida",
  "vazio",
  "vazia",
  "cheio",
  "cheia",
  "grande",
  "pequeno",
  "pequena",
  "maximo",
  "maxima",
  "minimo",
  "minima",
  "primeiro",
  "primeira",
  "ultimo",
  "ultima",
  "proximo",
  "proxima",
  "anterior",
  "seguinte",
  "padrao",
  "especial",
  "temporario",
  "temporaria",
  "favorito",
  "favorita",
  "selecionado",
  "selecionada",
  "logado",
  "logada",
  "autenticado",
  "autenticada",
  "pendente",
  "aprovado",
  "aprovada",
  "rejeitado",
  "rejeitada",
  "concluido",
  "concluida",
  "cancelado",
  "cancelada",
  // Preposições e conectores (quando usados em nomes compostos)
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
// Palavras que existem em PT e EN (falsos positivos)
const AMBIGUOUS = new Set([
  "converter",
  "data",
  "item",
  "status",
  "menu",
  "error",
  "fatal",
  "local",
  "total",
  "real",
  "super",
  "extra",
  "auto",
  "normal",
  "digital",
  "final",
  "global",
  "central",
  "federal",
  "lateral",
  "original",
  "regional",
  "virtual",
  "visual",
  "horizontal",
  "vertical",
  "formal",
  "industrial",
  "material",
  "natural",
  "social",
  "animal",
  "canal",
  "general",
  "liberal",
  "mineral",
  "modal",
  "oral",
  "rural",
  "serial",
  "tribal",
  "universal",
  "vocal",
  "ideal",
  "radical",
  "tropical",
  "comercial",
  "editorial",
  "familiar",
  "particular",
  "popular",
  "regular",
  "similar",
  "singular",
  "solar",
  "angular",
  "circular",
  "linear",
  "par",
  "for",
  "do",
  "no",
  "set",
  "get",
  "log",
  "key",
  "use",
  "base",
  "case",
  "close",
  "complete",
  "export",
  "import",
  "input",
  "note",
  "open",
  "provider",
  "simple",
  "state",
  "store",
  "teste",
  "token",
  "volume",
]);
function commentContainsPtWords(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-záàâãéèêíïóôõúüç\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const ptFound = words.filter((w) => {
    const normalized = _types_1.DartText.stripAccents(w);
    return (
      (PT_WORDS.has(w) || PT_WORDS.has(normalized)) &&
      !AMBIGUOUS.has(w) &&
      !AMBIGUOUS.has(normalized)
    );
  });
  return ptFound.length >= 1;
}
/** Texto de comentário que não é prosa: diretivas, marcadores, macros, anotações e textos curtos. */
function isSkippedComment(text) {
  return (
    text.startsWith("ignore:") ||
    text.startsWith("coverage:") ||
    text.startsWith("TODO") ||
    text.startsWith("FIXME") ||
    text.startsWith("{@") ||
    text.startsWith("@") ||
    text.length < 10
  );
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "identifier-language",
    description: "Detecta identificadores e comentários que não estão em inglês",
    enabled: true,
  },
  async () => {
    await loadDependencies();
    // Gerados que não são `.g`/`.freezed` (ex.: `.gen.dart`, `generated/`) e auxiliares de `test/` entram.
    const dartFiles = _types_1.DartFile.changed({
      includeTests: true,
      includeGenerated: true,
    }).filter(
      (f) =>
        !f.path.fileName.endsWith("_test.dart") &&
        !f.path.fileName.endsWith(".g.dart") &&
        !f.path.fileName.endsWith(".freezed.dart")
    );
    if (dartFiles.length === 0) return;
    const matches = [];
    const commentMatches = [];
    const cspellCandidates = [];
    const candidateWords = new Set();
    for (const dartFile of dartFiles) {
      const file = dartFile.path.path;
      // Comentários e documentação que não estão em inglês (só `//` e `///` em linha própria)
      for (const comment of dartFile.comments) {
        if (comment.isTrailing) continue;
        if (
          comment.kind !== _types_1.DartCommentKind.Line &&
          comment.kind !== _types_1.DartCommentKind.Doc
        )
          continue;
        const text = comment.content;
        if (isSkippedComment(text)) continue;
        if (isNonEnglishComment(text) || commentContainsPtWords(text)) {
          commentMatches.push({
            file,
            line: comment.line,
            text: text.slice(0, 80),
            type:
              comment.kind === _types_1.DartCommentKind.Doc
                ? "documentação (///)"
                : "comentário (//)",
          });
        }
      }
      // Identificadores declarados que não estão em inglês
      for (const { name: identifier, line, kind } of declaredNames(dartFile)) {
        const words = splitIdentifier(identifier);
        const ptWords = words.filter((w) => {
          if (AMBIGUOUS.has(w)) return false;
          if (PT_WORDS.has(w)) return true;
          if (w.length >= 6 && isNonEnglish(w)) return true;
          return false;
        });
        if (ptWords.length > 0) {
          matches.push({ file, line, identifier, kind, ptWords });
        } else {
          for (const w of words) {
            if (w.length < 4) continue;
            if (AMBIGUOUS.has(w)) continue;
            candidateWords.add(w);
            cspellCandidates.push({ word: w, file, line, identifier, kind });
          }
        }
      }
    }
    // Segundo passe: validar palavras não capturadas contra cspell (dicionário EN)
    if (candidateWords.size > 0) {
      const misspelled = validateWordsWithCspell(candidateWords);
      if (misspelled.size > 0) {
        const seen = new Set();
        for (const candidate of cspellCandidates) {
          if (!misspelled.has(candidate.word)) continue;
          const isNonEn = isLikelyNonEnglish(candidate.word);
          if (!isNonEn) continue;
          const key = `${candidate.file}::${candidate.line}::${candidate.identifier}`;
          if (seen.has(key)) {
            const existing = matches.find((m) => `${m.file}::${m.line}::${m.identifier}` === key);
            if (existing) {
              existing.ptWords.push(candidate.word);
              continue;
            }
          }
          seen.add(key);
          matches.push({
            file: candidate.file,
            line: candidate.line,
            identifier: candidate.identifier,
            kind: candidate.kind,
            ptWords: [candidate.word],
          });
        }
      }
    }
    for (const c of commentMatches) {
      const snippet = `${c.text}${c.text.length >= 80 ? "..." : ""}`;
      const prefix = c.type === "documentação (///)" ? "///" : "//";
      const translated = await translateToEnglish(c.text);
      const correctText = translated
        ? `${prefix} ${translated}`
        : `${prefix} (translate to English)`;
      const correctLabel = translated ? "Sugestão em inglês" : "Em inglês";
      (0, _types_1.sendFormattedFail)({
        title: `${c.type.toUpperCase()} DEVE SER EM INGLÊS`,
        description: `\`${snippet}\``,
        problem: {
          wrong: `${prefix} ${snippet}`,
          correct: correctText,
          wrongLabel: "Atual",
          correctLabel,
        },
        action: {
          code: correctText,
        },
        objective:
          "Manter **consistência** com o ecossistema (SDK, docs, frameworks) e facilitar **colaboração** entre equipes.",
        reference: {
          text: "Effective Dart: Documentation",
          url: "https://dart.dev/effective-dart/documentation",
        },
        file: c.file,
        line: c.line,
      });
    }
    // `declaredNames` já devolve um nome por linha: cada match é um identificador
    for (const m of matches) {
      const currentDecl =
        m.kind === "classe"
          ? `class ${m.identifier}`
          : m.kind === "método"
            ? `void ${m.identifier}()`
            : `final ${m.identifier}`;
      const suggestedDecl =
        m.kind === "classe"
          ? `class ${suggestEnglish(m.identifier, m.ptWords)}`
          : m.kind === "método"
            ? `void ${suggestEnglish(m.identifier, m.ptWords)}()`
            : `final ${suggestEnglish(m.identifier, m.ptWords)}`;
      (0, _types_1.sendFormattedFail)({
        title: "IDENTIFICADOR DEVE SER EM INGLÊS",
        description: `\`${m.identifier}\` (${m.kind}) — palavras: **${m.ptWords.join(", ")}**`,
        problem: {
          wrong: currentDecl,
          correct: suggestedDecl,
          wrongLabel: "Atual",
          correctLabel: "Em inglês",
        },
        action: {
          code: suggestedDecl,
        },
        objective: "Manter **consistência** e facilitar **colaboração** em equipe.",
        reference: {
          text: "Clean Code: Naming",
          url: "https://medium.com/@mikhailhusyev/writing-clean-code-naming-variables-functions-methods-and-classes-6074a6796c7b",
        },
        file: m.file,
        line: m.line,
      });
    }
  }
);
const PT_TO_EN = {
  pessoa: "Person",
  pessoas: "People",
  usuario: "User",
  usuarios: "Users",
  cliente: "Client",
  clientes: "Clients",
  produto: "Product",
  produtos: "Products",
  pedido: "Order",
  pedidos: "Orders",
  compra: "Purchase",
  venda: "Sale",
  pagamento: "Payment",
  endereco: "Address",
  cidade: "City",
  estado: "State",
  empresa: "Company",
  funcionario: "Employee",
  conta: "Account",
  senha: "Password",
  mensagem: "Message",
  notificacao: "Notification",
  configuracao: "Configuration",
  categoria: "Category",
  comentario: "Comment",
  arquivo: "File",
  documento: "Document",
  imagem: "Image",
  tarefa: "Task",
  projeto: "Project",
  equipe: "Team",
  relatorio: "Report",
  resultado: "Result",
  cadastro: "Registration",
  registro: "Record",
  carrinho: "Cart",
  estoque: "Stock",
  fatura: "Invoice",
  parcela: "Installment",
  desconto: "Discount",
  entrega: "Delivery",
  motorista: "Driver",
  aluno: "Student",
  professor: "Teacher",
  escola: "School",
  curso: "Course",
  aula: "Lesson",
  prova: "Exam",
  nota: "Grade",
  medico: "Doctor",
  paciente: "Patient",
  consulta: "Appointment",
  receita: "Prescription",
  nome: "Name",
  nomes: "Names",
  idade: "Age",
  valor: "Value",
  preco: "Price",
  numero: "Number",
  quantidade: "Quantity",
  tamanho: "Size",
  peso: "Weight",
  altura: "Height",
  titulo: "Title",
  descricao: "Description",
  texto: "Text",
  campo: "Field",
  lista: "List",
  grupo: "Group",
  perfil: "Profile",
  nivel: "Level",
  erro: "Error",
  aviso: "Warning",
  resposta: "Response",
  servico: "Service",
  repositorio: "Repository",
  tela: "Screen",
  pagina: "Page",
  botao: "Button",
  formulario: "Form",
  tabela: "Table",
  filial: "Branch",
  orcamento: "Budget",
  contrato: "Contract",
  fornecedor: "Supplier",
  calcular: "calculate",
  buscar: "search",
  salvar: "save",
  deletar: "delete",
  remover: "remove",
  atualizar: "update",
  criar: "create",
  listar: "list",
  obter: "get",
  enviar: "send",
  receber: "receive",
  validar: "validate",
  verificar: "verify",
  processar: "process",
  carregar: "load",
  exibir: "show",
  mostrar: "display",
  abrir: "open",
  fechar: "close",
  iniciar: "start",
  finalizar: "finish",
  cancelar: "cancel",
  confirmar: "confirm",
  ativo: "active",
  inativo: "inactive",
  novo: "new",
  atual: "current",
  principal: "main",
  disponivel: "available",
  obrigatorio: "required",
  vazio: "empty",
  grande: "large",
  pequeno: "small",
};
function suggestEnglish(identifier, ptWords) {
  let result = identifier;
  for (const pt of ptWords) {
    const en = PT_TO_EN[pt];
    if (!en) continue;
    const capitalized = pt.charAt(0).toUpperCase() + pt.slice(1);
    if (result.includes(capitalized)) {
      const enCapitalized = en.charAt(0).toUpperCase() + en.slice(1);
      result = result.replace(capitalized, enCapitalized);
    } else if (result.includes(pt)) {
      result = result.replace(pt, en.toLowerCase());
    }
  }
  return result !== identifier ? result : `/* traduza para inglês */`;
}
/** Nomes de API do Flutter/Dart que não precisam ser analisados (métodos e variáveis). */
const RESERVED_NAMES = new Set([
  "get",
  "set",
  "build",
  "createState",
  "initState",
  "dispose",
  "toString",
  "hashCode",
  "main",
  "runApp",
  "setState",
  "mounted",
  "context",
  "widget",
  "state",
  "key",
  "value",
  "index",
  "length",
  "map",
  "where",
  "fold",
  "reduce",
  "forEach",
  "add",
  "remove",
  "contains",
  "isEmpty",
  "isNotEmpty",
  "first",
  "last",
  "toList",
  "toMap",
  "toSet",
  "toJson",
  "fromJson",
  "fromMap",
  "copyWith",
  "of",
  "then",
  "catchError",
  "whenComplete",
]);
/** Na mesma linha, a ordem das mensagens é classe → enum → método → variável. */
const KIND_ORDER = {
  classe: 0,
  enum: 1,
  método: 2,
  variável: 3,
};
/**
 * Tipo "simples": nomeado, sem prefixo de import e sem genérico aninhado
 * (`String`, `Foo?`, `Future<void>`, `Map<String, dynamic>`; não `Future<Either<F, X>>`,
 * `p.Foo`, `void Function()` nem records). O plugin sempre analisou só as declarações
 * com tipo simples (ou sem tipo); estender aos demais aumenta as reprovações.
 */
function isPlainType(type) {
  return (
    type.kind === _types_1.DartTypeKind.Named &&
    type.prefix === null &&
    type.typeArguments.every((arg) => arg.typeArguments.length === 0)
  );
}
/**
 * Nomes declarados que o plugin analisa, na ordem das linhas (um por nome e linha):
 * classes, enums, métodos/funções com tipo de retorno simples e não nullable, funções
 * locais e variáveis com `final`/`const`/`var`/`late` sem tipo ou com tipo simples
 * (campos, de topo, locais e parâmetros `final`).
 */
function declaredNames(file) {
  const found = [];
  const add = (kind, name, line, column) => {
    if ((kind === "método" || kind === "variável") && RESERVED_NAMES.has(name)) return;
    found.push({ name, line, kind, column });
  };
  const addVariable = (v) => {
    const declared = v.isFinal || v.isConst || v.isVar || v.isLate;
    if (declared && (v.type === null || isPlainType(v.type))) {
      add("variável", v.name, v.nameLine, v.column);
    }
  };
  const addParameters = (params) => {
    for (const p of params) {
      // os `final` do primary constructor são campos (já entram por `fields`)
      if (p.source === _types_1.DartParameterSource.Declaring || !p.isFinal) continue;
      if (p.type === null || isPlainType(p.type)) add("variável", p.name, p.nameLine, p.column);
    }
  };
  const addBody = (body) => {
    for (const v of body?.localVariables ?? []) {
      // `for (final x in xs)` não é analisado; `for (var i = 0; ...)` é
      if (v.isLoopVariable && v.initializer === null) continue;
      addVariable(v);
    }
  };
  const addFunction = (fn) => {
    const { returnType } = fn;
    if (
      fn.memberKind === _types_1.DartMemberKind.Method &&
      fn.typeParameters.length === 0 &&
      returnType !== null &&
      !returnType.isNullable &&
      isPlainType(returnType)
    ) {
      add("método", fn.name, fn.nameLine, fn.column);
    }
    addParameters(fn.parameters);
    addBody(fn.body);
  };
  for (const cls of file.classes) add("classe", cls.name, cls.nameLine, cls.column);
  for (const e of file.enums) add("enum", e.name, e.nameLine, e.column);
  for (const decl of file.declarations) {
    for (const field of decl.fields) addVariable(field);
    for (const method of decl.methods) addFunction(method);
    for (const ctor of decl.constructors) {
      addParameters(ctor.parameters);
      addBody(ctor.body);
    }
  }
  for (const v of file.variables) addVariable(v);
  for (const fn of file.functions) addFunction(fn);
  // closures e funções locais de todo o arquivo, inclusive em inicializadores de campos
  // (o modelo não expõe o tipo de retorno da função local: ela entra sempre)
  for (const closure of file.closures()) {
    if (closure.name !== null) add("método", closure.name, closure.line, closure.column);
    addParameters(closure.parameters);
    addBody(closure.body);
  }
  found.sort(
    (a, b) => a.line - b.line || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.column - b.column
  );
  // a mesma variável aparece no corpo do método e no da closure que a contém
  const seen = new Set();
  return found.filter(({ name, line }) => {
    const key = `${line}::${name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
/** Palavras do identificador com 3+ letras: `buscarPedidoHTTP` → `buscar`, `pedido`, `http`. */
function splitIdentifier(identifier) {
  return _types_1.DartText.toSnakeCase(identifier)
    .split("_")
    .filter((w) => w.length > 2);
}
