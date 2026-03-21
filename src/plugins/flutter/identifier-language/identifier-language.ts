/**
 * Identifier Language Plugin
 * Detecta nomes de classes, métodos e variáveis em português.
 * O padrão do projeto é código 100% em inglês.
 */
import { createPlugin, getDanger, sendFail } from "@types";
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

    const seen = new Set<string>();

    for (const m of matches) {
      const key = `${m.file}::${m.line}::${m.identifier}`;
      if (seen.has(key)) continue;
      seen.add(key);

      await sendFail(
        `IDENTIFICADOR EM PORTUGUÊS

\`${m.identifier}\` (${m.kind}) — palavras: **${m.ptWords.join(", ")}**

### Problema Identificado

O padrão do projeto é código 100% em inglês.
Identificadores em português dificultam colaboração e consistência.

### 🎯 AÇÃO NECESSÁRIA

Renomeie para inglês:

\`\`\`dart
// ❌ Em português
${m.kind === "classe" ? `class ${m.identifier}` : m.kind === "método" ? `void ${m.identifier}()` : `final ${m.identifier}`}

// ✅ Em inglês
${m.kind === "classe" ? `class ${suggestEnglish(m.identifier, m.ptWords)}` : m.kind === "método" ? `void ${suggestEnglish(m.identifier, m.ptWords)}()` : `final ${suggestEnglish(m.identifier, m.ptWords)}`}
\`\`\`

### 🚀 Objetivo

Manter **consistência** e facilitar **colaboração** em equipe.

📖 [Clean Code: Naming](https://medium.com/@mikhailhusyev/writing-clean-code-naming-variables-functions-methods-and-classes-6074a6796c7b)`,
        m.file,
        m.line
      );
    }
  }
);

const PT_TO_EN: Record<string, string> = {
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

function suggestEnglish(identifier: string, ptWords: string[]): string {
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
