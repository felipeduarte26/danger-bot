"use strict";
/**
 * 🔍 FLUTTER ANALYZE PLUGIN
 * ========================
 * Executa flutter analyze e reporta problemas
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const types_1 = require("../../types");
exports.default = (0, types_1.createPlugin)({
    name: "flutter-analyze",
    description: "Executa flutter analyze e reporta problemas",
    enabled: true,
}, async () => {
    const allFiles = [
        ...danger.git.modified_files,
        ...danger.git.created_files,
    ];
    // Filtrar apenas arquivos .dart (excluindo gerados e testes)
    const dartFiles = allFiles.filter((file) => file.endsWith(".dart") &&
        !file.includes(".g.dart") && // Arquivos gerados
        !file.includes(".freezed.dart") && // Arquivos freezed
        !file.includes(".mocks.dart") && // Mocks gerados
        fs.existsSync(file) // Arquivo existe
    );
    if (dartFiles.length === 0) {
        message("ℹ️ **Flutter Analyze**: Nenhum arquivo Dart alterado para analisar.");
        return;
    }
    message(`🔍 **Flutter Analyze**: Analisando ${dartFiles.length} arquivo(s)...`);
    try {
        const analyzeCmd = `flutter analyze ${dartFiles.join(" ")} --no-congratulate --fatal-warnings --fatal-infos`;
        let analyzeOutput = "";
        try {
            analyzeOutput = (0, child_process_1.execSync)(analyzeCmd, {
                encoding: "utf-8",
                stdio: "pipe",
            });
        }
        catch (error) {
            analyzeOutput = error.stdout || error.stderr || "";
        }
        // Filtrar apenas linhas relevantes (que mencionam os arquivos alterados)
        const filteredLines = analyzeOutput
            .split("\n")
            .filter((line) => dartFiles.some((file) => line.includes(file)));
        if (filteredLines.length === 0) {
            message("✅ **Flutter Analyze**: Nenhum problema encontrado nos arquivos alterados!");
            return;
        }
        let issuesFound = 0;
        const issueRegex = /^(error|warning|info)\s*•\s*(.+?)\s*•\s*(.+?):(\d+):(\d+)\s*•\s*(.+)$/;
        for (const line of filteredLines) {
            const trimmedLine = line.trim();
            if (!trimmedLine)
                continue;
            if (trimmedLine.includes("Analyzing") ||
                trimmedLine.includes("issue found") ||
                trimmedLine.includes("(ran in")) {
                continue;
            }
            const match = trimmedLine.match(issueRegex);
            if (match) {
                const [, severity, rawMessage, filePath, lineNumber, , ruleName] = match;
                const relativePath = filePath
                    .replace(process.cwd() + "/", "")
                    .replace(/^\.\//, "");
                if (dartFiles.includes(relativePath)) {
                    const translatedMessage = translateFlutterAnalyzeMessage(rawMessage, ruleName);
                    const docLink = getDocumentationLink(ruleName);
                    const fullMessage = `🔍 **Flutter Analyze** (${severity})\n\n` +
                        `${translatedMessage}\n\n` +
                        `**Regra**: \`${ruleName}\`\n\n` +
                        (docLink ? `📖 [Documentação oficial](${docLink})` : "");
                    fail(fullMessage, relativePath, parseInt(lineNumber, 10));
                    issuesFound++;
                }
            }
        }
        if (issuesFound > 0) {
            message(`🔍 **Flutter Analyze**: ${issuesFound} problema(s) encontrado(s) nos arquivos alterados.`);
        }
    }
    catch (error) {
        message("⚠️ **Flutter Analyze**: Erro ao executar análise. Verifique os logs.");
    }
});
function translateFlutterAnalyzeMessage(message, ruleName) {
    const translations = {
        // Diagnostic messages
        unused_local_variable: "Variável local não utilizada - remova ou use",
        dead_code: "Código morto detectado - remova",
        unreachable_code: "Código inalcançável - nunca será executado",
        unused_import: "Import não utilizado - remova",
        unused_element: "Elemento não utilizado - remova ou torne privado",
        unused_field: "Campo não utilizado - remova",
        unused_catch_clause: "Cláusula catch não utilizada",
        unused_catch_stack: "Stack trace catch não utilizado",
        unused_result: "Resultado não utilizado - atribua a variável",
        unused_shown_name: "Nome mostrado não utilizado em import",
        missing_return: "Faltando declaração return",
        invalid_assignment: "Atribuição inválida - tipos incompatíveis",
        argument_type_not_assignable: "Tipo de argumento não atribuível",
        return_of_invalid_type: "Retorno de tipo inválido",
        undefined_class: "Classe não definida - verifique import",
        undefined_identifier: "Identificador não definido",
        unnecessary_import: "Import desnecessário - remova",
        undefined_method: "Método não definido - verifique nome",
        undefined_getter: "Getter não definido",
        undefined_setter: "Setter não definido",
        non_bool_condition: "Condição deve ser booleana",
        deprecated_member_use: "Uso de membro depreciado - considere alternativa",
        deprecated_member_use_from_same_package: "Uso de membro depreciado do mesmo pacote",
        override_on_non_overriding_member: "@override em membro que não sobrescreve",
        missing_override_of_must_be_overridden: "Faltando override de método obrigatório",
        // Linter rules - Documentação e APIs públicas
        public_member_api_docs: "Documentação ausente em API pública",
        type_annotate_public_apis: "Adicione anotações de tipo em APIs públicas",
        // Construtores e const
        prefer_const_constructors: "Prefira construtores const quando possível",
        prefer_const_constructors_in_immutables: "Use construtores const em classes imutáveis",
        prefer_const_declarations: "Prefira declarações const para valores constantes",
        prefer_const_literals_to_create_immutables: "Use const para criar coleções imutáveis",
        unnecessary_const: "Palavra-chave const desnecessária",
        unnecessary_new: "Palavra-chave new desnecessária",
        unnecessary_constructor_name: "Nome de construtor .new desnecessário",
        // Print e logging
        avoid_print: "Evite usar print() em código de produção",
        // Imports e dependências
        directives_ordering: "Ordene as diretivas de import corretamente",
        sort_pub_dependencies: "Ordene dependências do pubspec.yaml alfabeticamente",
        depend_on_referenced_packages: "Dependa apenas de pacotes referenciados",
        // Variáveis e campos
        prefer_final_fields: "Prefira campos final para variáveis não modificadas",
        prefer_final_locals: "Prefira variáveis locais final quando não modificadas",
        unnecessary_final: "Não use final para variáveis locais",
        prefer_final_in_for_each: "Use final em loops for-each quando possível",
        // Null safety
        unnecessary_null_in_if_null_operators: "Valor null desnecessário em operador ??",
        unnecessary_null_checks: "Verificações null desnecessárias",
        unnecessary_null_aware_assignments: "Atribuição null-aware desnecessária",
        avoid_null_checks_in_equality_operators: "Evite verificações null em operadores de igualdade",
        use_if_null_to_convert_nulls_to_bools: "Use ?? para converter nulls em bools",
        // Flutter específico
        sort_child_properties_last: "Propriedade child deve vir por último",
        use_key_in_widget_constructors: "Use key em construtores de widgets",
        must_be_immutable: "Widget deve ser imutável",
        use_build_context_synchronously: "Não use BuildContext após gaps assíncronos",
        use_colored_box: "Use ColoredBox ao invés de Container com cor",
        use_decorated_box: "Use DecoratedBox ao invés de Container com decoração",
        sized_box_for_whitespace: "Use SizedBox para espaços em branco",
        avoid_web_libraries_in_flutter: "Evite bibliotecas web em aplicações Flutter",
        use_full_hex_values_for_flutter_colors: "Use valores hex de 8 dígitos para cores",
        // Strings
        prefer_single_quotes: "Prefira aspas simples para strings",
        unnecessary_brace_in_string_interps: "Chaves desnecessárias na interpolação de strings",
        unnecessary_string_interpolations: "Interpolação de string desnecessária",
        unnecessary_string_escapes: "Escapes desnecessários em strings",
        use_raw_strings: "Use raw strings para evitar escapes",
        use_string_buffers: "Use StringBuffer para compor strings",
        // Coleções
        prefer_is_empty: "Use isEmpty ao invés de length == 0",
        prefer_is_not_empty: "Use isNotEmpty ao invés de length > 0",
        prefer_contains: "Use contains() ao invés de indexOf() != -1",
        prefer_for_elements_to_map_fromIterable: "Prefira for elements ao Map.fromIterable",
        prefer_spread_collections: "Use spread operator ao invés de addAll()",
        unnecessary_to_list_in_spreads: "toList() desnecessário em spreads",
        // Async/await
        unawaited_futures: "Futures devem ser aguardados com await ou marcados com unawaited",
        unnecessary_await_in_return: "Await desnecessário no return",
        avoid_returning_null_for_future: "Evite retornar null para Future",
        unnecessary_async: "Função async desnecessária sem await",
        // Performance
        avoid_function_literals_in_foreach_calls: "Evite funções anônimas em forEach - use for-in",
        list_remove_unrelated_type: "Tipo não relacionado em list.remove()",
        prefer_iterable_whereType: "Use whereType ao invés de where + is",
        // Nomeação
        camel_case_types: "Use camelCase para tipos",
        file_names: "Use snake_case para nomes de arquivos",
        non_constant_identifier_names: "Use camelCase para identificadores não constantes",
        constant_identifier_names: "Use SCREAMING_SNAKE_CASE para constantes",
        library_names: "Use snake_case para nomes de bibliotecas",
        library_prefixes: "Use lowercase_with_underscores para prefixos",
        // Segurança
        avoid_dynamic_calls: "Evite chamadas em tipos dynamic",
        avoid_type_to_string: "Evite usar Type.toString()",
        close_sinks: "Feche Sinks quando terminar de usar",
        cancel_subscriptions: "Cancele Subscriptions quando terminar",
    };
    const translated = translations[ruleName];
    return translated || message;
}
function getDocumentationLink(ruleName) {
    if ([
        "unused_local_variable",
        "dead_code",
        "unreachable_code",
        "unused_import",
        "undefined_class",
        "undefined_identifier",
    ].includes(ruleName)) {
        return `https://dart.dev/tools/diagnostic-messages#${ruleName}`;
    }
    return `https://dart.dev/tools/linter-rules/${ruleName}`;
}
