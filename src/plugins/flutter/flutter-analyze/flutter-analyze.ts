import { execSync } from "child_process";
import * as fs from "fs";
import { createPlugin, getDanger, sendMessage, sendFail } from "@types";

export default createPlugin(
  {
    name: "flutter-analyze",
    description: "Executa flutter analyze e reporta problemas",
    enabled: true,
  },
  async () => {
    const danger = getDanger();

    const allFiles = [...danger.git.modified_files, ...danger.git.created_files];

    // Filtrar apenas arquivos .dart (excluindo gerados e testes)
    const dartFiles = allFiles.filter(
      (file: string) =>
        file.endsWith(".dart") &&
        !file.includes(".g.dart") && // Arquivos gerados
        !file.includes(".freezed.dart") && // Arquivos freezed
        !file.includes(".mocks.dart") && // Mocks gerados
        fs.existsSync(file) // Arquivo existe
    );

    if (dartFiles.length === 0) {
      sendMessage("ℹ️ **Flutter Analyze**: Nenhum arquivo Dart alterado para analisar.");
      return;
    }

    try {
      const analyzeCmd = `flutter analyze ${dartFiles.join(" ")} --no-congratulate --fatal-warnings --fatal-infos`;

      let analyzeOutput = "";
      try {
        analyzeOutput = execSync(analyzeCmd, {
          encoding: "utf-8",
          stdio: "pipe",
        });
      } catch (error: any) {
        analyzeOutput = error.stdout || error.stderr || "";
      }

      // Filtrar apenas linhas relevantes (que mencionam os arquivos alterados)
      const filteredLines = analyzeOutput
        .split("\n")
        .filter((line: string) => dartFiles.some((file: string) => line.includes(file)));

      if (filteredLines.length === 0) {
        sendMessage("✅ **Flutter Analyze**: Nenhum problema encontrado nos arquivos alterados!");
        return;
      }

      const issueRegex = /^(error|warning|info)\s*•\s*(.+?)\s*•\s*(.+?):(\d+):(\d+)\s*•\s*(.+)$/;

      for (const line of filteredLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        if (
          trimmedLine.includes("Analyzing") ||
          trimmedLine.includes("issue found") ||
          trimmedLine.includes("(ran in")
        ) {
          continue;
        }

        const match = trimmedLine.match(issueRegex);
        if (match) {
          const [, severity, rawMessage, filePath, lineNumber, , ruleName] = match;

          const relativePath = filePath.replace(process.cwd() + "/", "").replace(/^\.\//, "");

          if (dartFiles.includes(relativePath)) {
            const translatedMessage = translateFlutterAnalyzeMessage(rawMessage, ruleName);

            const docLink = getDocumentationLink(ruleName);
            const fullMessage =
              `🔍 **Flutter Analyze** (${severity})\n\n` +
              `${translatedMessage}\n` +
              (docLink
                ? `\n📖 [Documentação oficial](${docLink})`
                : `\n**Regra:** \`${ruleName}\``);

            sendFail(fullMessage, relativePath, parseInt(lineNumber, 10));
          }
        }
      }
    } catch (error) {
      sendMessage("⚠️ **Flutter Analyze**: Erro ao executar análise. Verifique os logs.");
    }
  }
);

function translateFlutterAnalyzeMessage(message: string, ruleName: string): string {
  const translations: Record<string, string> = {
    // ── Diagnostic messages (erros do compilador/analyzer) ──
    unused_local_variable: "Variável local não utilizada — remova ou use",
    dead_code: "Código morto detectado — remova",
    unreachable_code: "Código inalcançável — nunca será executado",
    unused_import: "Import não utilizado — remova",
    unused_element: "Elemento não utilizado — remova ou torne privado",
    unused_field: "Campo não utilizado — remova",
    unused_catch_clause: "Cláusula catch não utilizada",
    unused_catch_stack: "Stack trace catch não utilizado",
    unused_result: "Resultado não utilizado — atribua a variável",
    unused_shown_name: "Nome mostrado não utilizado em import",
    missing_return: "Faltando declaração return",
    invalid_assignment: "Atribuição inválida — tipos incompatíveis",
    argument_type_not_assignable: "Tipo de argumento não atribuível",
    return_of_invalid_type: "Retorno de tipo inválido",
    undefined_class: "Classe não definida — verifique import",
    undefined_identifier: "Identificador não definido",
    unnecessary_import: "Import desnecessário — remova",
    undefined_method: "Método não definido — verifique nome",
    undefined_getter: "Getter não definido",
    undefined_setter: "Setter não definido",
    non_bool_condition: "Condição deve ser booleana",
    deprecated_member_use: "Uso de membro depreciado — considere alternativa",
    deprecated_member_use_from_same_package: "Uso de membro depreciado do mesmo pacote",
    override_on_non_overriding_member: "@override em membro que não sobrescreve",
    missing_override_of_must_be_overridden: "Faltando override de método obrigatório",

    // ── Documentação e APIs públicas ──
    public_member_api_docs: "Documentação ausente em membro público",
    type_annotate_public_apis: "Adicione anotações de tipo em APIs públicas",
    always_declare_return_types: "Declare o tipo de retorno do método",
    comment_references: "Referência em comentário não encontrada",
    slash_for_doc_comments: "Use /// ao invés de /** */ para doc comments",
    missing_code_block_language_in_doc_comment:
      "Especifique a linguagem no bloco de código do doc comment",
    unintended_html_in_doc_comment: "HTML não intencional no doc comment",
    dangling_library_doc_comments: "Doc comment de library sem diretiva library",
    document_ignores: "Documente o motivo do ignore",

    // ── Construtores e const ──
    prefer_const_constructors: "Prefira construtores const quando possível",
    prefer_const_constructors_in_immutables: "Use construtores const em classes imutáveis",
    prefer_const_declarations: "Prefira declarações const para valores constantes",
    prefer_const_literals_to_create_immutables: "Use const para criar coleções imutáveis",
    unnecessary_const: "Palavra-chave const desnecessária",
    unnecessary_new: "Palavra-chave new desnecessária",
    unnecessary_constructor_name: "Nome de construtor .new desnecessário",
    sort_constructors_first: "Coloque construtores primeiro na classe",
    sort_unnamed_constructors_first: "Coloque o construtor sem nome primeiro",
    prefer_initializing_formals: "Use this.param no construtor",
    use_super_parameters: "Use super parameters ao invés de passar para super manualmente",

    // ── Print e logging ──
    avoid_print: "Evite usar print() em código de produção",

    // ── Imports e dependências ──
    directives_ordering: "Ordene as diretivas de import corretamente",
    sort_pub_dependencies: "Ordene dependências do pubspec.yaml alfabeticamente",
    depend_on_referenced_packages: "Dependa apenas de pacotes referenciados",
    always_use_package_imports: "Use package imports ao invés de relativos",
    avoid_relative_lib_imports: "Evite imports relativos para arquivos em lib/",
    prefer_relative_imports: "Use imports relativos dentro do mesmo package",
    implementation_imports: "Evite importar arquivos de src/ de outros packages",
    combinators_ordering: "Ordene show/hide em imports",

    // ── Variáveis e campos ──
    prefer_final_fields: "Prefira campos final para variáveis não modificadas",
    prefer_final_locals: "Prefira variáveis locais final quando não modificadas",
    unnecessary_final: "Não use final para variáveis locais",
    prefer_final_in_for_each: "Use final em loops for-each quando possível",
    prefer_final_parameters: "Use final em parâmetros não modificados",
    avoid_final_parameters: "Não use final em parâmetros",
    prefer_typing_uninitialized_variables: "Adicione tipo em variáveis não inicializadas",
    omit_local_variable_types: "Omita tipos óbvios em variáveis locais",
    omit_obvious_local_variable_types: "Omita tipos óbvios em variáveis locais",
    specify_nonobvious_local_variable_types:
      "Especifique o tipo quando não for óbvio em variáveis locais",
    omit_obvious_property_types: "Omita tipos óbvios em propriedades",
    specify_nonobvious_property_types: "Especifique o tipo quando não for óbvio em propriedades",
    parameter_assignments: "Evite reatribuir parâmetros",

    // ── Null safety ──
    unnecessary_null_in_if_null_operators: "Valor null desnecessário em operador ??",
    unnecessary_null_checks: "Verificações null desnecessárias",
    unnecessary_null_aware_assignments: "Atribuição null-aware desnecessária",
    unnecessary_null_aware_operator_on_extension_on_nullable:
      "Operador null-aware desnecessário em extensão de tipo nullable",
    unnecessary_nullable_for_final_variable_declarations:
      "Tipo nullable desnecessário em variável final",
    avoid_null_checks_in_equality_operators: "Evite verificações null em operadores de igualdade",
    use_if_null_to_convert_nulls_to_bools: "Use ?? para converter nulls em bools",
    prefer_null_aware_operators: "Use operador null-aware (?.) ao invés de verificação null",
    prefer_null_aware_method_calls: "Use operador null-aware em chamadas de método",
    use_null_aware_elements: "Use null-aware em elementos de coleção",
    null_check_on_nullable_type_parameter: "Verificação null em tipo genérico nullable",
    cast_nullable_to_non_nullable: "Use cast seguro de nullable para non-nullable",
    prefer_void_to_null: "Use void ao invés de Null como tipo",
    tighten_type_of_initializing_formals: "Refine o tipo do parâmetro de inicialização",

    // ── Flutter específico ──
    sort_child_properties_last: "Propriedade child deve vir por último",
    use_key_in_widget_constructors: "Use key em construtores de widgets",
    must_be_immutable: "Widget deve ser imutável",
    use_build_context_synchronously: "Não use BuildContext após gaps assíncronos",
    use_colored_box: "Use ColoredBox ao invés de Container com cor",
    use_decorated_box: "Use DecoratedBox ao invés de Container com decoração",
    sized_box_for_whitespace: "Use SizedBox para espaços em branco",
    sized_box_shrink_expand: "Use SizedBox.shrink() ou SizedBox.expand()",
    avoid_unnecessary_containers: "Container desnecessário — use o widget filho diretamente",
    avoid_web_libraries_in_flutter: "Evite bibliotecas web em aplicações Flutter",
    use_full_hex_values_for_flutter_colors: "Use valores hex de 8 dígitos para cores",
    no_logic_in_create_state: "Não coloque lógica em createState()",
    diagnostic_describe_all_properties: "Descreva todas as propriedades no debugFillProperties",
    flutter_style_todos: "Use formato Flutter para TODOs (Flutter fix)",

    // ── Strings ──
    prefer_single_quotes: "Prefira aspas simples para strings",
    prefer_double_quotes: "Prefira aspas duplas para strings",
    unnecessary_brace_in_string_interps: "Chaves desnecessárias na interpolação de strings",
    unnecessary_string_interpolations: "Interpolação de string desnecessária",
    unnecessary_string_escapes: "Escapes desnecessários em strings",
    use_raw_strings: "Use raw strings para evitar escapes",
    use_string_buffers: "Use StringBuffer para compor strings",
    prefer_interpolation_to_compose_strings:
      "Use interpolação ao invés de concatenar strings com +",
    prefer_adjacent_string_concatenation: "Use strings adjacentes ao invés de +",
    missing_whitespace_between_adjacent_strings:
      "Faltando espaço entre strings adjacentes — possível bug",
    no_adjacent_strings_in_list: "Evite strings adjacentes em listas — possível vírgula faltando",
    leading_newlines_in_multiline_strings: "Evite linhas em branco no início de strings multiline",

    // ── Coleções ──
    prefer_is_empty: "Use isEmpty ao invés de length == 0",
    prefer_is_not_empty: "Use isNotEmpty ao invés de length > 0",
    prefer_contains: "Use contains() ao invés de indexOf() != -1",
    prefer_for_elements_to_map_fromIterable: "Prefira for elements ao Map.fromIterable",
    prefer_spread_collections: "Use spread operator ao invés de addAll()",
    unnecessary_to_list_in_spreads: "toList() desnecessário em spreads",
    prefer_collection_literals: "Use literais de coleção ([] ao invés de List())",
    prefer_inlined_adds: "Use spread ao invés de ..add()",
    prefer_if_elements_to_conditional_expressions:
      "Use if dentro de coleções ao invés de operador ternário",
    prefer_iterable_whereType: "Use whereType ao invés de where + is",
    collection_methods_unrelated_type: "Tipo não relacionado em método de coleção",

    // ── Async/await ──
    unawaited_futures: "Futures devem ser aguardados com await ou marcados com unawaited",
    unnecessary_await_in_return: "Await desnecessário no return",
    unnecessary_async: "Função async desnecessária sem await",
    discarded_futures: "Future descartado — use unawaited() ou await",
    avoid_void_async: "Evite funções async void — prefira Future<void>",
    avoid_slow_async_io: "Evite operações de IO assíncronas lentas — use versão síncrona",

    // ── Performance e boas práticas ──
    avoid_function_literals_in_foreach_calls: "Evite funções anônimas em forEach — use for-in",
    prefer_conditional_assignment: "Use operador ??= para atribuição condicional",
    prefer_expression_function_bodies: "Use => para funções com corpo de uma expressão",
    prefer_if_null_operators: "Use operador ?? ao invés de operador ternário com null",
    prefer_is_not_operator: "Use isNot ao invés de !(is)",
    join_return_with_assignment: "Combine atribuição com return",
    cascade_invocations: "Use cascade (..) para chamadas encadeadas no mesmo objeto",
    prefer_foreach: "Use forEach ao invés de for quando não precisar do índice",
    avoid_redundant_argument_values: "Argumento redundante — já é o valor padrão",
    noop_primitive_operations: "Operação primitiva sem efeito",
    unnecessary_statements: "Statement sem efeito — possível bug",
    literal_only_boolean_expressions: "Expressão booleana com apenas literais",

    // ── Controle de fluxo ──
    curly_braces_in_flow_control_structures: "Use chaves em estruturas de controle",
    empty_catches: "Catch vazio — trate ou documente a exceção",
    empty_statements: "Statement vazio detectado",
    empty_constructor_bodies: "Corpo de construtor vazio — use ;",
    no_duplicate_case_values: "Valores duplicados em case",
    exhaustive_cases: "Switch não cobre todos os valores do enum",
    no_default_cases: "Evite default em switch de enum — use cases explícitos",
    control_flow_in_finally: "Evite controle de fluxo em bloco finally",
    throw_in_finally: "Evite throw em bloco finally",

    // ── Nomeação ──
    camel_case_types: "Use CamelCase para tipos",
    camel_case_extensions: "Use CamelCase para extensions",
    file_names: "Use snake_case para nomes de arquivos",
    non_constant_identifier_names: "Use camelCase para identificadores não constantes",
    constant_identifier_names: "Use lowerCamelCase ou SCREAMING_SNAKE_CASE para constantes",
    library_names: "Use snake_case para nomes de bibliotecas",
    library_prefixes: "Use lowercase_with_underscores para prefixos",
    package_names: "Use snake_case para nomes de packages",
    no_leading_underscores_for_local_identifiers: "Não use _ como prefixo em variáveis locais",
    no_leading_underscores_for_library_prefixes: "Não use _ como prefixo em library prefixes",

    // ── Segurança e erros comuns ──
    avoid_dynamic_calls: "Evite chamadas em tipos dynamic",
    avoid_type_to_string: "Evite usar Type.toString()",
    close_sinks: "Feche Sinks quando terminar de usar",
    cancel_subscriptions: "Cancele Subscriptions quando terminar",
    hash_and_equals: "Implemente hashCode quando implementar ==",
    only_throw_errors: "Só lance objetos que implementem Error ou Exception",
    recursive_getters: "Getter recursivo — possível stack overflow",
    use_rethrow_when_possible: "Use rethrow ao invés de throw dentro de catch",
    valid_regexps: "Regex inválida",
    unrelated_type_equality_checks: "Comparação de igualdade entre tipos não relacionados",
    test_types_in_equals: "Verifique o tipo no operador ==",
    no_self_assignments: "Auto-atribuição — variável atribuída a si mesma",
    avoid_catching_errors: "Não capture Error — deixe propagar",
    avoid_returning_this: "Evite retornar this — use cascade",

    // ── Código desnecessário / limpeza ──
    unnecessary_this: "this desnecessário — remova",
    unnecessary_overrides: "Override desnecessário — não adiciona comportamento",
    unnecessary_lambdas: "Lambda desnecessária — use tear-off",
    unnecessary_parenthesis: "Parênteses desnecessários",
    unnecessary_late: "late desnecessário — variável pode ser inicializada diretamente",
    unnecessary_getters_setters: "Getter/setter triviais — use campo público",
    unnecessary_breaks: "break desnecessário em switch",
    unnecessary_library_directive: "Diretiva library desnecessária",
    unnecessary_library_name: "Nome de library desnecessário",
    unnecessary_raw_strings: "Raw string desnecessária — não contém escapes",
    unnecessary_unawaited: "unawaited() desnecessário",
    unnecessary_underscores: "Underscore desnecessário",
    unnecessary_ignore: "ignore desnecessário — regra não é violada",
    unreachable_from_main: "Código inacessível a partir do main",

    // ── Classes e OOP ──
    annotate_overrides: "Adicione @override em membros sobrescritos",
    annotate_redeclares: "Adicione @redeclare em membros redeclarados",
    provide_deprecation_message: "Forneça mensagem no @Deprecated",
    require_trailing_commas: "Adicione vírgula final em parâmetros multi-linha",
    prefer_constructors_over_static_methods:
      "Prefira construtores ao invés de métodos estáticos para criação",
    prefer_mixin: "Use mixin ao invés de classe abstrata para mixins",
    avoid_equals_and_hash_code_on_mutable_classes: "Evite == e hashCode em classes mutáveis",
    one_member_abstracts: "Classe abstrata com um membro — considere typedef",
    overridden_fields: "Campo sobrescrito — use getter",
    avoid_setters_without_getters: "Evite setters sem getters correspondentes",
    use_setters_to_change_properties: "Use setters para alterar propriedades",
    use_to_and_as_if_applicable: "Nomeie conversores como toX() ou asX()",
    implicit_reopen: "Classe implicitamente reaberta — adicione modificador",
    avoid_implementing_value_types: "Evite implementar tipos de valor",
    library_private_types_in_public_api: "Tipo privado de library em API pública",
    avoid_field_initializers_in_const_classes: "Evite inicializadores de campo em classes const",
    avoid_classes_with_only_static_members:
      "Evite classes com apenas membros estáticos — use funções top-level",
    use_enums: "Use enum ao invés de classe com constantes",

    // ── Funções e closures ──
    prefer_function_declarations_over_variables:
      "Prefira declarações de função ao invés de variáveis",
    prefer_generic_function_type_aliases: "Use sintaxe moderna para typedefs de função",
    use_function_type_syntax_for_parameters: "Use sintaxe de tipo função para parâmetros",
    avoid_positional_boolean_parameters: "Evite parâmetros booleanos posicionais",
    implicit_call_tearoffs: "Use tear-off implícito ao invés de lambda",
    avoid_private_typedef_functions: "Evite typedef privado — use inline",
    avoid_unused_constructor_parameters: "Parâmetro de construtor não utilizado",

    // ── Tipos e casting ──
    avoid_annotating_with_dynamic: "Evite anotar com dynamic quando não necessário",
    avoid_types_on_closure_parameters: "Evite tipos em parâmetros de closures",
    prefer_asserts_in_initializer_lists: "Prefira asserts na lista de inicialização",
    prefer_asserts_with_message: "Adicione mensagem em asserts",
    avoid_bool_literals_in_conditional_expressions:
      "Evite literais bool em expressões condicionais",
    avoid_double_and_int_checks: "Evite verificações double e int — use num",
    no_literal_bool_comparisons: "Evite comparar com true/false literalmente",
    type_init_formals: "Não especifique tipo em parâmetros de inicialização",
    type_literal_in_constant_pattern: "Use type literal em pattern constante",
    avoid_js_rounded_ints: "Evite inteiros que perdem precisão em JavaScript",
    invalid_case_patterns: "Pattern inválido em case",
    invalid_runtime_check_with_js_interop_types:
      "Verificação de runtime inválida com tipos JS interop",
    no_runtimeType_toString: "Evite runtimeType.toString() — use 'is'",
    avoid_init_to_null: "Evite inicializar com null — já é o padrão",
    avoid_renaming_method_parameters: "Evite renomear parâmetros de método ao sobrescrever",
    avoid_return_types_on_setters: "Não especifique tipo de retorno em setters",
    avoid_returning_null_for_void: "Evite retornar null para void",
    avoid_shadowing_type_parameters: "Evite sombrear parâmetros de tipo",
    avoid_single_cascade_in_expression_statements: "Evite cascade único em expression statements",
    avoid_escaping_inner_quotes: "Evite escapar aspas internas — troque o tipo de aspas",
    await_only_futures: "Só use await com Futures",
    null_closures: "Não passe null onde uma função é esperada",
    void_checks: "Verificação de void — possível uso incorreto",
    no_wildcard_variable_uses: "Não use variáveis wildcard (_) como valores",

    // ── Pub e configuração ──
    secure_pubspec_urls: "Use URLs https no pubspec.yaml",
    package_prefixed_library_names: "Use nome do package como prefixo em libraries",
    deprecated_consistency: "Mantenha consistência em anotações @Deprecated",
    do_not_use_environment: "Evite usar variáveis de ambiente — use fromEnvironment",
    use_string_in_part_of_directives: "Use string URI em diretivas part of",
    library_annotations: "Coloque anotações antes da diretiva library",
    conditional_uri_does_not_exist: "URI condicional não existe",

    // ── Diversos ──
    eol_at_end_of_file: "Adicione linha em branco no final do arquivo",
    lines_longer_than_80_chars: "Linha com mais de 80 caracteres",
    prefer_int_literals: "Use literais int quando possível",
    use_is_even_rather_than_modulo: "Use isEven/isOdd ao invés de % 2",
    use_late_for_private_fields_and_variables:
      "Use late para campos e variáveis privados inicializados tardiamente",
    use_named_constants: "Use constantes nomeadas ao invés de valores literais",
    use_test_throws_matchers: "Use throwsA matcher em testes",
    use_truncating_division: "Use ~/ para divisão truncada",
    matching_super_parameters: "Nomeie parâmetros super com o mesmo nome do pai",
    strict_top_level_inference: "Especifique tipos em declarações top-level",
    switch_on_type: "Considere switch em tipo ao invés de if-else com 'is'",
    simplify_variable_pattern: "Simplifique o pattern da variável",
    unsafe_variance: "Variância insegura em tipo genérico",
    var_with_no_type_annotation: "Variável com var sem anotação de tipo",
    avoid_multiple_declarations_per_line: "Evite múltiplas declarações na mesma linha",
    always_put_control_body_on_new_line: "Coloque o corpo de controle em nova linha",
    always_put_required_named_parameters_first: "Coloque parâmetros nomeados obrigatórios primeiro",
    always_specify_types: "Especifique todos os tipos explicitamente",
    remove_deprecations_in_breaking_versions:
      "Remova membros depreciados em versões com breaking changes",
    avoid_futureor_void: "Evite FutureOr<void> — use Future<void>",
  };

  const translated = translations[ruleName];
  return translated || message;
}

function getDocumentationLink(ruleName: string): string | null {
  const diagnosticMessages = [
    "unused_local_variable",
    "dead_code",
    "unreachable_code",
    "unused_import",
    "unused_element",
    "unused_field",
    "unused_catch_clause",
    "unused_catch_stack",
    "unused_result",
    "unused_shown_name",
    "missing_return",
    "invalid_assignment",
    "argument_type_not_assignable",
    "return_of_invalid_type",
    "undefined_class",
    "undefined_identifier",
    "undefined_method",
    "undefined_getter",
    "undefined_setter",
    "non_bool_condition",
    "deprecated_member_use",
    "override_on_non_overriding_member",
    "missing_override_of_must_be_overridden",
    "must_be_immutable",
  ];

  if (diagnosticMessages.includes(ruleName)) {
    return `https://dart.dev/tools/diagnostics/${ruleName}`;
  }

  return `https://dart.dev/tools/linter-rules/${ruleName}`;
}
