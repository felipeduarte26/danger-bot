/**
 * Identifier Language Plugin
 * Detecta nomes de classes, métodos e variáveis em português.
 * O padrão do projeto é código 100% em inglês.
 */
import { createPlugin, getDanger, sendWarn } from "@types";
import * as fs from "fs";

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

interface IdentifierMatch {
  file: string;
  line: number;
  identifier: string;
  kind: string;
  ptWords: string[];
}

export default createPlugin(
  {
    name: "identifier-language",
    description: "Detecta identificadores em português no código Dart",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );

    if (dartFiles.length === 0) return;

    const matches: IdentifierMatch[] = [];

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cleaned = stripCommentsAndStrings(line);
        if (!cleaned.trim()) continue;

        for (const { identifier, kind } of extractIdentifiers(cleaned)) {
          const words = splitIdentifier(identifier);
          const ptWords = words.filter((w) => PT_WORDS.has(w) && !AMBIGUOUS.has(w));

          if (ptWords.length > 0) {
            matches.push({ file, line: i + 1, identifier, kind, ptWords });
          }
        }
      }
    }

    if (matches.length === 0) return;

    const byFile = new Map<string, IdentifierMatch[]>();
    for (const m of matches) {
      const list = byFile.get(m.file) || [];
      list.push(m);
      byFile.set(m.file, list);
    }

    for (const [file, fileMatches] of byFile) {
      const seen = new Set<string>();
      const unique = fileMatches.filter((m) => {
        const key = `${m.identifier}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const listing = unique
        .slice(0, 8)
        .map((m) => `\`${m.identifier}\` (${m.kind}) — palavras: ${m.ptWords.join(", ")}`)
        .join("\n");

      const extra = unique.length > 8 ? `\n\n+${unique.length - 8} ocorrência(s) omitida(s)` : "";

      sendWarn(
        `**Identificadores em português detectados**\n\n` +
          `O padrão do projeto é código em inglês.\n\n` +
          `${listing}${extra}`,
        file,
        unique[0].line
      );
    }
  }
);

function stripCommentsAndStrings(line: string): string {
  return line
    .replace(/\/\/.*$/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/r'[^']*'/g, "''")
    .replace(/r"[^"]*"/g, '""');
}

function extractIdentifiers(line: string): { identifier: string; kind: string }[] {
  const results: { identifier: string; kind: string }[] = [];

  const classRe = /(?:abstract\s+)?(?:final\s+|sealed\s+|base\s+|mixin\s+)?class\s+([A-Za-z_]\w*)/g;
  let m;
  while ((m = classRe.exec(line)) !== null) {
    results.push({ identifier: m[1], kind: "classe" });
  }

  const enumRe = /enum\s+([A-Za-z_]\w*)/g;
  while ((m = enumRe.exec(line)) !== null) {
    results.push({ identifier: m[1], kind: "enum" });
  }

  const methodRe =
    /(?:Future<[^>]*>|void|String|int|double|bool|num|dynamic|List<[^>]*>|Map<[^,>]*,[^>]*>|Set<[^>]*>|[A-Z]\w*(?:<[^>]*>)?)\s+([a-z_]\w*)\s*\(/g;
  while ((m = methodRe.exec(line)) !== null) {
    if (!isReserved(m[1])) results.push({ identifier: m[1], kind: "método" });
  }

  const varRe =
    /(?:final|const|var|late\s+final|late)\s+(?:[A-Za-z_]\w*(?:<[^>]*>)?\s+)?([a-z_]\w*)\s*[=;]/g;
  while ((m = varRe.exec(line)) !== null) {
    if (!isReserved(m[1])) results.push({ identifier: m[1], kind: "variável" });
  }

  return results;
}

function isReserved(word: string): boolean {
  const reserved = new Set([
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
  return reserved.has(word);
}

function splitIdentifier(identifier: string): string[] {
  return identifier
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase()
    .split("_")
    .filter((w) => w.length > 2);
}
