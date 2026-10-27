# Changelog

Todas as mudanças relevantes deste projeto são registradas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

As versões até a 4.0.0 foram reconstruídas a partir do histórico de commits (o `version` do `package.json` em cada commit) e não têm tag: os links delas comparam commits. Nem todas seguiram o SemVer à risca, e números que o pacote nunca teve não aparecem. As tags `vX.Y.Z` começam na 4.0.1.

## [Não publicado]

## [5.0.0] - 2026-10-27

### Adicionado

- Modelo Dart exportado pelo pacote. São classes como `DartFile`, `DartPath`, `DartClass`, `DartField`, `DartMethod`, `DartType`, `DartCall`, `DartString` e `DartComment`, mais enums como `DartLayer`, `DartLayerFolder`, `Presence` e `Nullability`.
  - Cada `.dart` do PR é lido uma vez por execução, e todos os plugins compartilham o resultado.
  - O modelo dá classes, membros, tipos, chamadas, strings, comentários, imports, variáveis locais (inclusive de patterns e de `for`) e as linhas adicionadas no diff.
  - Plugins locais podem usá-lo em vez de regex.
  - Guias: `docs/CRIANDO_PLUGINS.md` (passo a passo, "preciso de... → use", exemplos e checklist de revisão) e `docs/MODELO_DART.md` (referência).
- Comando `inspect <arquivo.dart>` (`db inspect`): mostra o que o modelo Dart enxerga num arquivo (classes e membros, chamadas, strings, comentários, variáveis locais), com o nome de cada propriedade na API. Aceita `--line N` para ver só uma linha, `--only` para escolher as seções e `--json`.
- `npm test` com os testes do modelo Dart.

### Modificado

- Os plugins Flutter leem o código pelo modelo Dart, e não mais com regex linha a linha. O resultado não depende mais da formatação nem de comentários ou strings no meio do código.
- **Incompatível:** os plugins podem reprovar PRs que passavam. O modelo vê código que a regex perdia quando a declaração quebrava linha. Medido no esfera-web, os achados novos são:
  - `data-datasources` e `domain-usecases`: `DOCUMENTAÇÃO REDUNDANTE EM @override` em métodos com parâmetros nomeados quebrados (`({`), com o tipo de retorno na linha de cima ou genéricos;
  - `domain-usecases`: a interface real do usecase passa a ser analisada, com `SUFIXO DO USECASE COM CASING INCORRETO` (`Usecase`) e `USECASE COM MUITOS PARÂMETROS`;
  - `late-final-checker`: `late final` com o inicializador em várias linhas;
  - `mediaquery-modern`: `MediaQuery.of(` com os argumentos em outra linha;
  - `column-row-spacing`: `Column`/`Row` com um filho comentado na lista;
  - `identifier-language` e `spell-checker`: nomes declarados em patterns (`final (a, b) = ...`, `case Foo(:final x)`);
  - `avoid-setstate-after-async` (`warn`, não reprova): métodos async com a assinatura em várias linhas.
- `create-plugin` pergunta o tipo de regra e gera o template correspondente, já sobre o modelo Dart e no padrão das mensagens: `Call` (`file.calls()`), `Class/structure` (`file.classes` + `Presence`), `Text added in the PR` (`readWithDiff` + `file.strings`, `warn`) ou `Path/file` (`file.path`). O README sai com a severidade e o exemplo do tipo.

### Obsoleto

- `getDartFiles()`, `getDartFilesInDirectory()`, `getDomainDartFiles()`, `getDataDartFiles()`, `getPresentationDartFiles()`, `isInLayer()`, `normalizePrimaryConstructorHeaders()`, `findPrimaryConstructors()` e `primaryConstructorFieldsByLine()`. Continuam exportados para plugins locais antigos.
  - Para arquivos e camadas, use `DartFile.changed()` e `file.path.inLayer(...)`.
  - Para primary constructors, use `cls.fields` e `cls.header`.

### Corrigido

Falsos positivos que deixam de ser reportados:

- `empty-catch-detector`: catch com código comentado, ou com `{`/`}` em comentário dentro do corpo.
- `print-statement-detector`: declaração de método chamado `print` e `print(...)` em comentário no fim da linha.
- `positional-bool-params`: parâmetro do tipo `bool Function(...)` tratado como `bool`.
- `presentation-encapsulation`: parâmetros de closure, variáveis de `for` e palavras de strings lidos como membros públicos do `State`.
- `flutter-widgets`: continuações de inicializadores, itens de lista e chamadas dentro de getters lidos como construtores e métodos; `@override // comentário` não reconhecido.
- `flutter-performance`: o `for` da árvore de widgets do `return` acusado como loop no `build()`, e closures declaradas antes do `return`.
- `memory-leak-detector`: `dispose()` em cascata quebrado em linhas (`_controller\n  ..stop()\n  ..dispose()`).
- `column-row-spacing`: filho comentado contado como filho.
- `boolean-naming-convention`: código gerado (`*.gen.dart`) deixa de ser analisado.
- `domain-usecases`:
  - uma doc com "abstract interface class that…" era lida como uma interface chamada `that`;
  - `USECASE COM EXTENDS INCORRETO` mostra o nome real da interface.
- `repositories`: em método genérico (`on<T>(...)`), a mensagem citava o método seguinte.
- `avoid-god-class`: continuações de arrow (`emit(...)`) contadas como métodos públicos.
- `class-naming-convention`, `clean-architecture` e `comments-checker`: `class`, `import` e `//` dentro de string ou comentário.
- `test-file-checker`: mais sufixos de código gerado ficam fora da lista de arquivos sem teste.
- `spell-checker-ptbr`: mensagens de `assert(...)` e logs com receptor (`logger.print(...)`) não são verificadas.

## [4.1.0] - 2026-10-20

### Adicionado

- No Bitbucket, os comentários inline terminam com quem alterou a linha por último, via `git blame`: `👤 Última alteração: **Nome** · dd/mm/aaaa · \`abc1234\``. Fica de fora quando a linha não está commitada, o git falha ou o clone é raso demais para chegar ao commit (use `clone: depth: full`). GitHub, GitLab e `dry-run` não mudam.
- Chave `settings.blame` no `danger-bot.yaml` (default `true`); `false` remove a linha de autoria.
- Exports `getLineAuthor`, `formatBlameLine`, `isBlameEnabled` e tipo `LineAuthor` para plugins locais.

## [4.0.1] - 2026-10-15

### Adicionado

- `CHANGELOG.md` com o histórico desde a 1.0.0, incluído no pacote. A partir desta versão, cada release tem a tag `vX.Y.Z`, que permite fixar a versão na instalação via Git (`#v4.0.1`).

### Modificado

- Rodapé do comentário principal em português: `Gerado por 🚀 <nome> no commit <hash>` (antes `Generated by … against …`).
- `create-plugin` gera o plugin no padrão das mensagens (`sendFormattedFail` com problema, correção, ação, objetivo e referência) e o README na estrutura dos demais (`O que verifica`, `Severidade`, `Exemplo`, `Referências`).
- `dry-run`: o resumo mostra os comentários inline à parte (`N comentário(s) inline`).
- O `PATCH_VERSION` do patch do Danger passa a ser o `version` do `package.json`: cada versão nova reaplica o patch.

### Corrigido

- A frase de abertura quando há erros volta a usar o nome do produto (`Danger Bot encontrou alguns problemas…`); na 4.0.0 ela usava o `branding.name`.
- `validate` acusava "Falta import do createPlugin" quando o import trazia outros nomes (todos os plugins do pacote); agora aceita e sai com código 1 quando encontra erro.
- `dry-run` contava os comentários inline de `warn` como erros e dizia que o CI falharia num PR só com avisos; o `github.pr.base.ref` do mock era sempre `main` em vez da branch de `--base`.
- `remove-plugin` quebrava com `TypeError` quando a resposta da seleção não era um número.

## [4.0.0] - 2026-10-14

### Adicionado

- Seção `branding` no `danger-bot.yaml` (`name` e `url`) com o nome e o link do bot no comentário principal, nos links invisíveis dos comentários, no status do build, no card do `google-chat-notification` e no rodapé do `ai-code-review`; ausente ou inválida, vale o padrão `Danger Bot` + `https://github.com/felipeduarte26/danger-bot`.
- Exports `getBranding()`, `DEFAULT_BRANDING` e `DangerBotBranding`, e `readConfig()`, que lê o `danger-bot.yaml` sem log e sem lançar erro.
- Helper `getPendingSummaryCounts()` com os fails/warns inline ainda não enviados à tabela principal.
- Seção `branding` no `danger-bot.yaml` gerado pelo comando `init`.

### Modificado

- **Incompatível:** `getFileContent()` retorna o conteúdo completo do arquivo após as mudanças do PR (`after` do `diffForFile`, com leitura do disco como alternativa), e não mais o texto dos trechos do diff.
- `executeDangerBot()` retorna `Promise<void>` e registra a execução com o `schedule()` do Danger, que espera todos os plugins antes de publicar os comentários; erros dos plugins vão para `onError` sem rejeitar a Promise.
- `google-chat-notification` sempre executado por último, inclusive depois dos `local_plugins`, no `executeDangerBot` e no `dry-run`.
- Patch do Danger (`scripts/patch-danger.cjs`) reescrito: aplicado sempre a partir do original (`<arquivo>.backup`), com nome e link lidos de `getBranding()` em tempo de execução (antes gravados no patch), branding também no status do build do Bitbucket Cloud/Server e do GitHub, e aviso quando um trecho esperado do Danger não é encontrado.
- `spell-checker-ptbr`: Hunspell (`nodehun` + `dictionary-pt`) desligado; o plugin verifica só acentuação e cedilha (lista de palavras e sufixos como `-cao` → `-ção`).
- `identifier-language`: detector de idioma `eld` desligado; a detecção fica com o dicionário PT interno e o `cspell`.
- `spell-checker`: só palavras detectadas como português ou espanhol são classificadas como "não está em inglês"; as demais desconhecidas são tratadas como typo.
- Documentação revisada: instalação com `danger` `^14.0.7` e `typescript` obrigatório, guias de pipeline (Bitbucket com repository access token e `DANGER_BITBUCKETCLOUD_UUID`, Node 25, Flutter e clone completo; GitHub Actions; GitLab), `local_plugins`, globs do `ignore_files`, limitações no GitLab/Bitbucket Server e READMEs de plugins.
- `CLAUDE.md` com o guia de desenvolvimento do projeto e o padrão obrigatório das mensagens dos plugins.

### Corrigido

- `spell-checker` e `identifier-language`: verificação com `cspell` passa a funcionar (sem `--root`, o arquivo temporário era ignorado); o `spell-checker` passa a reportar typos e identificadores fora do inglês.
- `domain-usecases`: arquivos `*_usecase.dart` voltam a ser validados (desde a 3.2.4 o filtro de arquivos os ignorava).
- `memory-leak-detector`: `StreamController` exige `close()` em vez de `cancel()`, e `dispose()`, `cancel()` e `close()` são aceitos como limpeza.
- `google-chat-notification`: contagem de fails e warnings inclui os comentários inline (antes o card podia sair verde com erros inline).
- `executeDangerBot`: fails/warns inline publicados na tabela principal mesmo quando um plugin lança erro.
- Plugins locais (`local_plugins`) e pacotes só-ESM (como o `eld` do `spell-checker`) carregados com `import()` nativo: no build CommonJS o `import()` virava `require()` e não os carregava; plugin `.ts` compilado para CommonJS também é reconhecido.
- `dry-run`: `ignore_files` aceita os mesmos globs do CI (antes só caminhos exatos).
- CLI: comandos sem pergunta (`dry-run`, `list`, `info`...) terminam sozinhos no terminal; `generate-dangerfile` funciona fora do repositório do Danger Bot; `info` conta só pastas com arquivo de plugin.
- CLI `remove-plugin`: plugin removido também do `export` por nome, da entrada `require(...)` em `allFlutterPlugins` e dos arrays de categoria, usando o nome exportado pelo barrel.

## [3.4.0] - 2026-09-30

### Modificado

- **Incompatível:** peer dependency `danger` atualizada de `^13.0.7` para `^14.0.7`.
- Dependências atualizadas: `commander` `^15.0.0`, `cspell` `^10.3.6`, `js-yaml` `^5.4.2`, `@cspell/dict-software-terms` `^5.4.5`, `compromise` `^14.17.0`, `eld` `^2.1.0` e `translate` `^3.1.0`.
- `primary-constructors`: título e mensagem sem a menção a "Dart 3.13+".

## [3.3.3] - 2026-09-24

### Adicionado

- Plugin `primary-constructors` (`primaryConstructorsPlugin`) que exige primary constructors (Dart 3.13+) em classes e enums com um único construtor generativo no corpo, com a conversão sugerida; só roda com SDK mínimo 3.13 no `pubspec.yaml` e ignora testes, código gerado e casos em que a conversão mudaria o comportamento; incluído em `allFlutterPlugins` e `codeQualityPlugins`.
- Helpers `findPrimaryConstructors`, `normalizePrimaryConstructorHeaders` e `primaryConstructorFieldsByLine` (e tipos `PrimaryConstructorDecl`/`PrimaryConstructorField`) exportados para plugins locais.
- Helper `getLineStats()` com as linhas adicionadas e removidas do PR, somando o `diffForFile` de cada arquivo (funciona no CI em GitHub, GitLab e Bitbucket).
- Helpers `setActivePlugins()` e `isPluginActive()` para saber quais plugins rodam na execução.
- Exports por nome de `avoidGodClassPlugin`, `avoidSetstateAfterAsyncPlugin`, `columnRowSpacingPlugin`, `dateTypeCheckerPlugin`, `aiCodeReviewPlugin` e `googleChatNotificationPlugin` na raiz do pacote.
- `flutter-analyze`: traduções para os diagnósticos de primary constructors (`use_primary_constructors`, `use_declaring_parameters`, `primary_constructor_body_without_declaration`...), `migrate_design_widgets`, `unused_element_parameter`, `deprecated_lint`, `async_return_with_no_await`, `no_dynamic_casts` e `no_raw_types`.

### Modificado

- Plugins que analisam a estrutura das classes (`domain-entities`, `domain-failures`, `domain-usecases`, `repositories`, `data-datasources`, `data-models`, `model-entity-inheritance`, `presentation-viewmodels`, `presentation-encapsulation`, `class-naming-convention`, `flutter-widgets`, `avoid-god-class`, `avoid-setstate-after-async`, `memory-leak-detector`, `date-type-checker`, `positional-bool-params`, `identifier-language`, `spell-checker`) adaptados a classes com primary constructor.
- `changelog-checker`: não roda quando o `pr-validation` está ativo, que já reprova o PR sem changelog.
- `flutter-analyze`: link da documentação aponta para `dart.dev/tools/diagnostics` ou `dart.dev/tools/linter-rules` conforme o código e é omitido para códigos sem página oficial.
- CLI `create-plugin`: plugin registrado também no `export` por nome de `src/index.ts` e inserido antes do `google-chat-notification` em `allFlutterPlugins`, sem reescrever o arquivo.

### Obsoleto

- `getLinesChanged()`: substituído por `await getLineStats()`; fora do dry-run usa o total do PR do GitHub e retorna 0 nas demais plataformas.

### Corrigido

- `pr-summary` e `pr-validation`: linhas alteradas calculadas com `getLineStats()` (antes vinham 0 no CI, pois `git.insertions`/`git.deletions` só existem no dry-run).
- `test-file-checker`: teste existente no disco encontrado com caminhos relativos à raiz (`lib/...`, formato do Danger) e em monorepo (`packages/app/lib/...` → `packages/app/test/...`).

## [3.3.2] - 2026-07-20

### Corrigido

- `print-statement-detector`: chamadas de método como `logger.print(...)` e `obj.debugPrint(...)` deixam de ser apontadas.
- `presentation-viewmodels`: correção da 3.3.1 incluída no build (`dist/`), que havia sido gerado sem ela.

## [3.3.1] - 2026-06-29

### Corrigido

- `presentation-viewmodels`: chamadas indentadas como `emit(...)`, `setState(...)` e `notifyListeners()` deixam de ser tratadas como métodos públicos com tipo de retorno inválido.

## [3.3.0] - 2026-05-26

### Adicionado

- `ignore_files` do `danger-bot.yaml` com suporte a globs (`*`, `**`, `?`); padrão terminado em `/*` ignora também as subpastas.
- Helper `isFileIgnored(filePath)` que verifica se um arquivo casa com algum padrão de `ignore_files`.

## [3.2.7] - 2026-05-22

### Modificado

- `class-naming-convention`: use cases também identificados pelo nome do arquivo (`_usecase.dart`, `_use_case.dart`) e pela pasta `use_cases/`, e mensagem explicando a exceção dos UseCases.

## [3.2.6] - 2026-05-21

### Modificado

- `class-naming-convention`: verbos de ação detectados em qualquer posição do nome (antes só na primeira palavra), com exceções para substantivos compostos (`SignIn`, `ReadOnly`, `Dropdown`...) e verbos que também são substantivos (`Download`, `Search`, `Filter`...).
- `identifier-language`: segunda verificação com `cspell` (dicionários EN, Dart, Flutter e termos de software, mais `cSpell.words` do `.vscode/settings.json`) que reprova palavras desconhecidas detectadas como PT/ES ou próximas de palavras PT (ex.: `filials`).

### Corrigido

- `identifier-language` e `spell-checker`: variáveis com tipo anulável (`String? nome`) e declarações seguidas de `,` ou `)` passam a ser analisadas.

## [3.2.5] - 2026-05-19

### Adicionado

- Plugin `private-named-params` (`privateNamedParamsPlugin`) que reprova construtores que atribuem parâmetros a campos privados pela initializer list (`: _campo = campo`) e sugere `this._campo` (Dart 3.12+); incluído em `allFlutterPlugins` e `codeQualityPlugins`.

### Modificado

- `flutter-analyze`: traduções para `unnecessary_const_in_enum_constructor`, `unnecessary_type_name_in_constructor` e `avoid_unstable_final_fields`, e mensagens de `prefer_initializing_formals` e `simple_directive_paths` detalhadas com o `dart fix` correspondente.

## [3.2.4] - 2026-05-18

### Adicionado

- Plugin `folder-naming-convention` (`folderNamingConventionPlugin`) que exige pastas da Clean Architecture no plural (`domain/usecase/` → `usecases/`, além de `entity`, `failure`, `repository`, `datasource`, `model`, `viewmodel`, `view` e `widget`), apontando cada pasta uma vez; incluído em `allFlutterPlugins` e `cleanArchitecturePlugins`.

### Modificado

- `domain-usecases`: arquivos em pastas `usecase/` também analisados.

### Corrigido

- `spell-checker-ptbr`: palavras como `categoria`, `diretoria`, `auditoria` e `consultoria` deixam de ser apontadas como falta de acento.

## [3.2.3] - 2026-05-08

### Adicionado

- CLI `dry-run`: saída colorida (respeita `NO_COLOR` e terminais sem TTY), barra de progresso fora do modo verbose e resumo de cada apontamento com a linha de código, a explicação e a sugestão.
- CLI `dry-run`: leitura do `danger-bot.yaml` do projeto, com `ignore_files`, `settings.verbose` e `local_plugins`.

### Modificado

- `positional-bool-params`: mensagem reescrita com o exemplo do call site e a sugestão de named parameter.

### Corrigido

- Declarações de classe quebradas em duas linhas (`class X` + `extends State<...>`, `implements I...` ou `extends Failure`) reconhecidas por `avoid-setstate-after-async`, `memory-leak-detector`, `flutter-widgets`, `presentation-viewmodels`, `data-datasources` e `domain-failures`.
- CLI `dry-run`: número da linha incluído no diff simulado, corrigindo a linha reportada por plugins que leem o diff estruturado.

## [3.2.2] - 2026-05-06

### Modificado

- `column-row-spacing`: mensagem indica as linhas dos `SizedBox` e diferencia o caso de um único `SizedBox`.

### Corrigido

- `spell-checker-ptbr`: strings usadas como chave de mapa (`'chave':`), índice (`['chave']`) ou em `Key`/`ValueKey`/`GlobalKey`/`ObjectKey`/`PageStorageKey` deixam de ser verificadas.

## [3.2.1] - 2026-05-06

### Modificado

- `column-row-spacing`: sugestão de `spacing` já a partir de um único `SizedBox` entre os filhos (antes exigia ao menos dois).
- `presentation-encapsulation`: logs de diagnóstico no console, e erro em um arquivo não interrompe a análise dos demais.

### Corrigido

- `presentation-encapsulation`: padrão builder reconhecido só em chamadas `widget.xxx(this)` (inclusive multilinha); States que passam `this` para `addObserver`/`addListener` deixam de ser ignorados.
- `spell-checker-ptbr`: regras de sufixo usadas só quando o Hunspell não carrega, evitando falsos positivos; a lista de palavras conhecidas é consultada primeiro.

## [3.2.0] - 2026-05-06

### Adicionado

- Plugin `spell-checker-ptbr` (`spellCheckerPtbrPlugin`) que verifica acentuação e ortografia em strings literais PT-BR das linhas adicionadas em arquivos `.dart` (Hunspell via `nodehun` + `dictionary-pt`, com regras de sufixo como alternativa), até 15 apontamentos por arquivo; incluído em `allFlutterPlugins` e `codeQualityPlugins`.
- Plugin `presentation-encapsulation` (`presentationEncapsulationPlugin`) que reprova variáveis, métodos, getters e setters públicos em classes `State<>` da `presentation/` (exceto membros `static`, anotados com `@override`/`@protected`/`@visibleForTesting` ou de States expostos via builder); supressão com `// ignore: presentation-encapsulation`; incluído em `allFlutterPlugins` e `presentationLayerPlugins`.

## [3.1.0] - 2026-05-04

### Adicionado

- `class-naming-convention`: regra que reprova nomes de classe no plural em Entity, Repository, Datasource e Model (ex.: `ProductsEntity` → `ProductEntity`), com exceções como `Params`, `Items`, `Details` e siglas; usa a nova dependência `compromise`.
- `data-datasources`, `domain-usecases` e `repositories`: regra que reprova `///` em métodos `@override` já documentados na interface (no `repositories`, qualquer doc em `@override` da implementação, exceto `{@macro}`).

### Modificado

- `class-naming-convention`: análise estendida à pasta `/models/`, classes em comentários ignoradas e regra de plural ativa mesmo sem o `wordpos` disponível.

## [3.0.0] - 2026-05-04

### Modificado

- `data-datasources`: nome sugerido para o arquivo reconhece variações e erros de digitação de "datasource" (`data_source`, `datascource`, `datsource`...), ex.: `user_data_source.dart` → `user_datasource.dart`.
- `data-datasources`: arquivos com nome fora do padrão também têm o conteúdo validado (antes a análise parava no erro de nomenclatura).
- README com os plugins `model-entity-inheritance`, `boolean-naming-convention`, `positional-bool-params` e `build-doc-checker` e a contagem das categorias atualizada.

## [2.9.9] - 2026-05-01

### Modificado

- `build-doc-checker`: mensagem com o comentário `///` encontrado e um trecho real do código com e sem ele, sugerindo `//` para comentários inline.

## [2.9.8] - 2026-05-01

### Corrigido

- `build-doc-checker` exportado como `buildDocCheckerPlugin` e incluído em `allFlutterPlugins` e `codeQualityPlugins`; na 2.9.6 ele não era carregado pelo pacote.

## [2.9.7] - 2026-05-01

### Modificado

- `flutter-widgets`: objetivo da mensagem "ORDEM DE MÉTODOS INCORRETA" resumido.

## [2.9.6] - 2026-05-01

### Adicionado

- Plugin `build-doc-checker` que reprova comentários `///` dentro do corpo de métodos `build` com `@override` (ainda sem registro nos exports do pacote nem em `allFlutterPlugins`).

## [2.9.5] - 2026-05-01

### Modificado

- `flutter-widgets`: um comentário inline para cada método fora de ordem, na linha do próprio método, em vez de um único comentário por classe.

## [2.9.4] - 2026-05-01

### Modificado

- `flutter-widgets`: mensagem "ORDEM DE MÉTODOS INCORRETA" com todos os métodos fora de ordem, agrupados por tipo, e com a ordem atual e a correta montadas a partir dos métodos reais da classe.

### Corrigido

- `flutter-widgets`: parâmetros de assinaturas multi-linha e corpos `=>` de métodos `static` e de declarações ignoradas não são mais detectados como métodos.

## [2.9.3] - 2026-04-30

### Corrigido

- `flutter-widgets`: campos de tipo função (`void Function(int)? onChanged;`, `VoidCallback`, `ValueChanged`, builders do Flutter etc.) não são mais tratados como métodos na verificação de ordem.

## [2.9.2] - 2026-04-30

### Modificado

- `flutter-widgets`: verificação de ordem estendida a construtores e factories/named constructors, na ordem construtor → factory → `@override` → público → privado (Vertical Ordering, Clean Code cap. 5), com mensagem e referência atualizadas.

### Corrigido

- `flutter-widgets`: detecção de métodos corrigida para assinaturas multi-linha, métodos de uma linha com `=>`, parâmetros com valor padrão na assinatura e arquivos com quebra de linha CRLF.

## [2.9.1] - 2026-04-30

### Adicionado

- `presentation-viewmodels`: regra que exige que métodos públicos de ViewModels (`ViewModelBase`) retornem `void`, `Future<void>` ou `FutureOr<void>` e exponham o resultado pelo state (ignora `@override`, `static`, getters e setters).
- `flutter-performance`: novas operações custosas detectadas antes do `return` do `build()`: `do-while`, `Timer(...)`, `ValueNotifier`, `OverlayEntry`, `GlobalKey<...>`, `json.encode`, `ThemeData`, `Future.wait`/`delayed`/`microtask`, `File`, `rootBundle.load`, `compute`, `Isolate.spawn`, `MethodChannel` e `EventChannel`.

### Modificado

- `flutter-performance`: análise de todos os `build()` do arquivo, com assinaturas e statements multi-linha, `return` dentro de closures desconsiderado, chaves em strings e comentários ignoradas e arquivos `.mocks.dart` excluídos.
- `presentation-viewmodels`: reconhecimento de ViewModels com parâmetros genéricos (`class X<T> extends ViewModelBase`).

### Corrigido

- `ignore_files` do `danger-bot.yaml` aplicado a todos os plugins: os arquivos ignorados são removidos de `danger.git.modified_files`/`created_files`, e caminhos com `./` ou `\` são normalizados.
- `column-row-spacing`: `Column`/`Row` detectados em qualquer posição da linha (ex.: `child: Column(`), não só no início.

## [2.9.0] - 2026-04-27

### Adicionado

- Plugin `boolean-naming-convention` (`booleanNamingConventionPlugin`, em `codeQualityPlugins` e `allFlutterPlugins`) que reprova propriedades, variáveis e getters `bool` cujo nome começa com verbo imperativo (ex.: `showPopup`), sugerindo prefixos como `is`, `has`, `can` e `should`; depende do `wordpos` e não roda sem ele.
- Plugin `positional-bool-params` (`positionalBoolParamsPlugin`, em `codeQualityPlugins` e `allFlutterPlugins`) que reprova parâmetros `bool` posicionais, obrigatórios ou opcionais `[...]`, em funções, métodos e construtores e sugere parâmetros nomeados (ignora setters, operadores e `@override`).

## [2.8.9] - 2026-04-27

### Modificado

- Patch do Danger (`postinstall`): resumo do PR com três cenários: "encontrou alguns problemas" só quando há fails, "**Aprovado!**" quando há apenas warnings e "**Parabéns!**" quando não há nada; antes, warnings sozinhos exibiam a mensagem de problemas.

## [2.8.8] - 2026-04-27

### Adicionado

- `flutter-analyze`: tradução e link de documentação para o diagnóstico `non_type_as_type_argument`.

## [2.8.7] - 2026-04-27

### Corrigido

- `data-datasources`, `domain-entities`, `domain-failures` e `repositories`: declarações de classe dentro de comentários (`//`, `///`, `/* */`) não são mais analisadas, evitando falsos positivos.

## [2.8.6] - 2026-04-27

### Corrigido

- `model-entity-inheritance`: chamadas `.toEntity()` não são mais confundidas com a declaração do método `toEntity()`.

## [2.8.4] - 2026-04-24

### Modificado

- Apenas atualização do número da versão.

## [2.8.3] - 2026-04-24

### Adicionado

- `barrel-files-enforcer`: regra que exige que o barrel file exporte todos os arquivos `.dart` da pasta (exceto gerados, testes e `part of`) e os barrels das subpastas.
- `barrel-files-enforcer`: regra que reprova import direto de um arquivo quando o barrel da pasta existe e já o exporta.

## [2.8.2] - 2026-04-24

### Adicionado

- `domain-entities`: regra que reprova Entity declarada como `final class` quando um Model a estende ou repete todos os campos dela.

### Modificado

- `model-entity-inheritance`: mensagem "MODEL DEVE EXTENDER ENTITY" com aviso para remover o `final` quando a Entity é `final class`.

## [2.8.1] - 2026-04-20

### Adicionado

- CLI: banner com a versão em `--version`/`-V` e ajuda resumida e colorida ao rodar sem argumentos (respeita `NO_COLOR`).

### Corrigido

- CLI: `--version` lido do `package.json` em vez do `1.8.0` fixo.
- `model-entity-inheritance`: `toEntity()` que retorna uma Entity diferente da estendida pelo Model não é mais acusado como redundante.

## [2.8.0] - 2026-04-20

### Adicionado

- Comando `dry-run` (alias `run`) na CLI, que executa os plugins localmente a partir do `git diff` contra a branch base, sem CI, tokens nem PR aberto; opções `--project`, `--base`, `--plugins`, `--all` e `--verbose`, com plugins que dependem de serviços externos pulados por padrão.
- Binário `db` como alias curto de `danger-bot`.
- Guia de teste local (`docs/TESTE_LOCAL.md`) e documentação do `dry-run` no README e em `docs/`.

### Corrigido

- `dist/` volta a carregar com `require`: o build grava `dist/package.json` com `"type": "commonjs"`. Desde a 1.8.1, o `"type": "module"` do pacote fazia o Node tratar o `dist/` (CommonJS) como ES Module.

## [2.7.2] - 2026-04-20

### Modificado

- `model-entity-inheritance`: exemplo de correção da mensagem "MODEL DEVE EXTENDER ENTITY" com construtor `super.<campo>` e link de referência nas duas regras.

## [2.7.1] - 2026-04-20

### Modificado

- `flutter-analyze`: título do resumo sem emoji.

## [2.7.0] - 2026-04-20

### Adicionado

- Plugin `model-entity-inheritance` (`modelEntityInheritancePlugin`, em `dataLayerPlugins` e `allFlutterPlugins`) que exige que Models de `data/models/` estendam a Entity correspondente quando repetem todos os campos dela e reprova `toEntity()` redundante em Model que já estende a Entity sem campos próprios.

### Modificado

- `domain-entities`: exigência de `final class` dispensada para Entity estendida por um Model ou cujo Model repete todos os campos dela.

## [2.6.6] - 2026-04-17

### Modificado

- Apenas atualização do número da versão.

## [2.6.5] - 2026-04-17

### Removido

- `pr-validation`: contagem de arquivos `.dart` e avisos de PR grande/crítica, que duplicavam o `pr-size-checker`.

### Corrigido

- `flutter-test-runner`: mensagem de testes quebrando sem a lista vazia quando nenhum arquivo de teste é identificado.

## [2.6.4] - 2026-04-17

### Modificado

- **Incompatível:** `flutter-test-runner`: testes quebrando passam a reprovar o build (`fail` em vez de `warn`).
- Checklist de testes manuais (Android, iOS, Web e responsividade) movido do `pr-summary` para o `test-coverage-summary`.
- `test-file-checker`: aviso só com a contagem; a lista de arquivos sem teste vai para um bloco markdown separado.
- `changelog-checker`: aviso de CHANGELOG não atualizado reduzido a uma linha, sem a lista de arquivos.

## [2.6.3] - 2026-04-17

### Modificado

- `test-coverage-summary`: gera `coverage/lcov.info` com `flutter test --coverage` nos testes ligados aos arquivos da PR quando o arquivo não existe.
- `test-coverage-summary`: informa quando a cobertura fica indisponível e mostra a cobertura geral quando nenhum arquivo da PR tem dados.
- `flutter-test-runner`: roda sem `--coverage`, deixa de mostrar o tempo e agrupa as falhas em um único aviso com os arquivos de teste afetados.
- `test-file-checker`: um único aviso com a lista de arquivos sem teste, em vez de um comentário por arquivo.

### Corrigido

- `google-chat-notification` volta a ser o último plugin de `allFlutterPlugins` (os plugins de teste rodavam depois dele).

## [2.6.2] - 2026-04-17

### Modificado

- Apenas atualização do número da versão.

## [2.6.1] - 2026-04-17

### Adicionado

- Plugin `test-file-checker` que avisa quando arquivos de `usecases/`, `datasources/`, `repositories/`, `viewmodels/`, `models/` ou `entities/` não têm `_test.dart` correspondente.
- Plugin `flutter-test-runner` que roda `flutter test` nos testes ligados aos arquivos da PR e publica um resumo; falhas viram avisos.
- Plugin `test-coverage-summary` que lê `coverage/lcov.info` e publica a cobertura dos arquivos da PR.
- Categoria `testPlugins` e exports `testFileCheckerPlugin`, `flutterTestRunnerPlugin` e `testCoverageSummaryPlugin`; os três também entram em `allFlutterPlugins`.

### Modificado

- `avoid-god-class` ignora arquivos de configuração de módulo (`_module.dart`, `_module_binding.dart`, `_module_routing.dart`).
- READMEs novos para `empty-catch-detector`, `future-wait-modernizer`, `print-statement-detector` e os plugins de teste; README e `docs/` atualizados com os novos plugins.

### Corrigido

- `data-datasources`, `data-models`, `domain-entities`, `domain-failures`, `domain-usecases` e `repositories` deixam de validar barrel files (arquivo com o mesmo nome da pasta).

## [2.5.8] - 2026-04-16

### Modificado

- `identifier-language`: comentários passam a ser apontados a partir de uma única palavra detectada fora do inglês (antes eram necessárias duas).

### Corrigido

- `identifier-language`: palavras acentuadas em comentários passam a ser reconhecidas na lista de termos em português.

## [2.5.7] - 2026-04-16

### Modificado

- **Incompatível:** `ai-code-review` passa a vir desabilitado por padrão (`enabled: false`).
- **Incompatível:** `future-wait-modernizer` passa de aviso para falha (`fail`), reprovando o build.
- `future-wait-modernizer`: só aponta `Future.wait([...])` cujo resultado é atribuído a uma variável, com sugestão de correção montada a partir das chamadas reais.
- Descrições de `empty-catch-detector`, `future-wait-modernizer`, `presentation-try-catch-checker` e `print-statement-detector` sem o número da linha.

### Corrigido

- `domain-usecases`: nome sugerido para a classe de parâmetros também remove o sufixo `Usecase` com casing errado.

## [2.5.6] - 2026-04-16

### Adicionado

- Plugin `print-statement-detector` que avisa sobre `print()`, `debugPrint()`, `debugPrintStack()` e `printError()` em código de produção.
- Plugin `empty-catch-detector` que reprova blocos `catch` vazios ou só com comentários.
- Plugin `future-wait-modernizer` que avisa sobre `Future.wait([...])` com lista literal e sugere a tupla com `.wait` do Dart 3.
- Exports `printStatementDetectorPlugin`, `emptyCatchDetectorPlugin` e `futureWaitModernizerPlugin`, incluídos em `allFlutterPlugins` e `codeQualityPlugins`.

## [2.5.5] - 2026-04-16

### Modificado

- Apenas atualização do número da versão.

## [2.5.4] - 2026-04-16

### Modificado

- `presentation-try-catch-checker`: mensagem mostra o trecho real do `try` detectado e a linha; o exemplo de correção usa `Result<Failure, Success>`.

### Corrigido

- `presentation-try-catch-checker`: `try` dentro de comentários de bloco (`/* */`) e strings multilinha deixa de ser apontado.

## [2.5.3] - 2026-04-16

### Modificado

- `domain-usecases`: classes com sufixo `Usecase` (casing errado) recebem mensagem própria com o nome corrigido para `UseCase`.

### Corrigido

- `avoid-god-class`: contagem de métodos públicos reconhece `@override` acima de outras anotações e métodos sem tipo de retorno, e ignora setters, membros `static`, palavras-chave e corpos de arrow functions.
- `flutter-widgets`: verificação de ordem dos métodos reconhece `@override` acima de outras anotações e ignora setters, anotações e corpos de arrow functions.

## [2.5.0] - 2026-04-16

### Adicionado

- `data-datasources` e `repositories`: regra que reprova métodos da interface que repetem o contexto do nome da classe (ex.: `getUserById` em `IUserRepository` → `getById`).

### Modificado

- `avoid-god-class`: ViewModels (`*_viewmodel.dart` que estendem `ViewModelBase`) passam a ter limite de 400 linhas, sem contar as linhas de construtores.
- `presentation-viewmodels`: exemplos das mensagens usam o sufixo `UseCase`.

## [2.4.2] - 2026-04-16

### Modificado

- `avoid-god-class`: limite de métodos públicos por classe volta a 15.

## [2.3.1] - 2026-04-16

### Modificado

- **Incompatível:** `domain-usecases`: interfaces e implementações passam a exigir o sufixo `UseCase` em vez de `Usecase`.
- `avoid-god-class`: limite de métodos públicos por classe sobe de 15 para 20.

## [2.3.0] - 2026-04-14

### Adicionado

- `flutter-analyze`: tradução pt-BR e link de documentação para 47 diagnósticos do Dart (null safety, argumentos, override, constantes, `final`, tipos, imports, classes, anotações, dead code e coleções).
- `flutter-analyze`: tradução das regras de lint `simple_directive_paths`, `avoid_catches_without_on_clauses`, `avoid_empty_else` e `avoid_types_as_parameter_names`.

### Modificado

- README com capturas de tela de um PR real (comentário principal, AI Code Review e comentário inline).

## [2.2.2] - 2026-04-08

### Modificado

- `domain-usecases`: texto do link de referência da regra de parâmetros traduzido para português.

### Corrigido

- `data-models`: a palavra `class` em comentários e strings deixa de ser tratada como declaração de classe, e declarações com `sealed`, `base`, `interface` e `mixin` passam a ser reconhecidas.

## [2.2.1] - 2026-04-01

### Adicionado

- `domain-usecases`: regra que limita o método `call` da interface a 3 parâmetros e sugere uma classe `<Nome>Params` acima disso.

## [2.2.0] - 2026-03-31

### Adicionado

- `domain-entities`: regra que reprova entidades sem nenhum campo `final`.
- `domain-entities`: regra que reprova entidades com um único campo (wrapper desnecessário).

## [2.1.8] - 2026-03-31

### Corrigido

- `clean-architecture`: detecção do pacote do próprio app em Domain também considera imports de `utils/`, `shared/`, `common/`, `modules/` e `app/`, evitando que ele seja apontado como pacote externo.

## [2.1.7] - 2026-03-31

### Modificado

- `clean-architecture`: imports de Domain para Data, Presentation e Infrastructure unificados em uma única regra e mensagem; caminhos que também contêm `/domain/` deixam de ser apontados.

## [2.1.6] - 2026-03-31

### Adicionado

- `clean-architecture`: regra que proíbe Domain de importar caminhos de `infrastructure/` ou `infra/`.

## [2.1.5] - 2026-03-31

### Modificado

- `avoid-god-class`: limite de 600 linhas passa a valer para qualquer arquivo em `presentation/` (antes só `presentation/views/`).

## [2.1.4] - 2026-03-31

### Modificado

- `clean-architecture`: Domain pode importar qualquer arquivo do pacote `flutter` (antes só `package:flutter/foundation.dart`).
- `clean-architecture`: mensagem de pacote externo em Domain sugere mover a implementação para `core/infrastructure/`.

## [2.1.3] - 2026-03-31

### Adicionado

- `clean-architecture`: regra que impede Domain de importar pacotes externos; permitidos o pacote do próprio app, `meta`, `equatable`, `freezed_annotation`, `json_annotation`, `collection`, `dartz`, `fpdart`, `result_dart`, `uuid` e `package:flutter/foundation.dart`.
- `domain-usecases`: exige que a interface do UseCase tenha um único método e que ele se chame `call`.

### Modificado

- **Incompatível:** `sendFail`/`sendWarn` com arquivo e linha publicam o comentário inline via `markdown()`; a reprovação passa a vir só do resumo de `flushSummaries()`, que quem usa `runPlugins` sem `executeDangerBot` precisa chamar.
- `flutter-analyze`: um único `fail` com o total de ocorrências, em vez de um por severidade.
- `avoid-god-class`: limite de 600 linhas por classe em arquivos de `presentation/views/` (300 nos demais).
- `ai-code-review`: intervalo entre requisições reduzido de 15 s para 1,5 s e espera após rate limit de 5 s para 2 s.

## [2.1.2] - 2026-03-30

### Modificado

- **Incompatível:** `getDartFiles()` deixa de retornar arquivos `_test.dart`.
- Arquivos `_test.dart` ignorados por `barrel-files-enforcer`, `class-naming-convention`, `clean-architecture`, `data-datasources`, `domain-entities`, `domain-failures`, `domain-usecases`, `flutter-analyze`, `flutter-performance`, `flutter-widgets`, `late-final-checker`, `mediaquery-modern`, `memory-leak-detector`, `repositories` e `spell-checker`.
- `flutter-analyze`: cada problema vira comentário inline sem `fail` próprio, e o build reprova com um `fail` por severidade com a contagem.

## [2.0.7] - 2026-03-30

### Corrigido

- `domain-usecases`: linhas de comentário com a palavra `class` deixam de ser tratadas como declarações de classe.

## [2.0.6] - 2026-03-30

### Modificado

- `pr-size-checker`: erro de PR acima do limite reduzido a uma mensagem de uma linha.

### Corrigido

- `data-models`: arquivos `_test.dart` em pastas `models/` deixam de ser validados.
- `flutter-widgets`: campos, declarações `with`/`extends`/`implements` e comentários deixam de ser confundidos com métodos na verificação de ordem.

## [2.0.5] - 2026-03-30

### Adicionado

- `comments-checker`: tags `TODO:`, `FIXME:`, `ignore:`, `coverage:ignore` e `danger:ignore` (na mesma linha ou na anterior) liberam comentários `//`.
- Export `flushSummaries()`, que publica o resumo agrupado de fails/warns e é chamado automaticamente pelo `executeDangerBot`.

### Modificado

- Resumo de fails/warns na tabela principal agrupado por título: até 3 ocorrências listam os arquivos, acima disso só a contagem.
- `sendFormattedFail`/`sendFormattedWarn`: exemplos ❌/✅ em blocos de código separados, com rótulos em negrito.
- Mensagens migradas para o formato padrão (`sendFormattedFail`) em `class-naming-convention`, `clean-architecture`, `comments-checker`, `data-datasources`, `data-models`, `domain-failures`, `file-naming`, `flutter-performance`, `flutter-widgets`, `late-final-checker`, `mediaquery-modern`, `merge-conflict-checker`, `pr-size-checker`, `pr-validation`, `presentation-try-catch-checker`, `presentation-viewmodels`, `repositories`, `security-checker` e `spell-checker`.
- `pr-validation`: avisos de tamanho de PR reduzidos a uma linha.
- `ai-code-review`: prompt reforçado para responder só em pt-BR, com um achado por linha ordenado por severidade (🔴/🟡/🔵).
- `ai-code-review`: cada review publicado como tabela markdown própria, com um único aviso agregado de arquivos com sugestões.
- `ai-code-review`: ignora arquivos com menos de 10 linhas ou menos de 5 linhas adicionadas e prioriza os mais alterados; intervalo entre requisições sobe de 10 s para 15 s.
- `spell-checker`: identificadores fora do inglês detectados pelo `eld` em qualquer idioma, no lugar da lista fixa de palavras em português.
- READMEs dos plugins reescritos de forma resumida; README novo para `repositories`.

### Removido

- `ai-code-review`: aviso no PR quando o rate limit interrompe a análise.

### Corrigido

- `flutter-analyze`: links de documentação dos diagnósticos apontam para a URL atual (`dart.dev/tools/diagnostics/<regra>`).
- `identifier-language`: `converter` tratado como palavra ambígua, sem falso positivo de português.

## [2.0.4] - 2026-03-26

### Adicionado

- Plugin `google-chat-notification` que envia um card (Cards V2) ao Google Chat via webhook ao fim da revisão, com status (erros, avisos ou limpo), título do PR e botão para abrir o PR; posicionado no fim de `allFlutterPlugins` e disponível apenas por esse array.
- Chave `settings.google_chat_webhook` no `danger-bot.yaml` (ou variável `GOOGLE_CHAT_WEBHOOK`), com exemplo comentado no arquivo gerado pelo `init`.

### Modificado

- `ai-code-review`: prompt simplificado; cada ponto traz emoji de severidade, título curto e explicação de 1–2 linhas, sem o modelo obrigatório com blocos de código.

### Corrigido

- `comments-checker`: comentários `//` adicionados no PR não eram detectados; a análise passa a percorrer as linhas adicionadas do diff e a comentar na linha correta.

## [2.0.3] - 2026-03-26

### Corrigido

- `ai-code-review`: a revisão gerada pela IA não era publicada no PR; cada arquivo com sugestões passa a gerar um aviso (warn) com o nome do arquivo e o texto da revisão.

## [2.0.2] - 2026-03-26

### Adicionado

- Plugin `ai-code-review` que revisa os arquivos Dart alterados com Google Gemini (bugs, SOLID, Clean Architecture, segurança, complexidade), com rotação de chaves e tratamento de rate limit; não roda sem chave.
- Chave `settings.gemini_api_keys` no `danger-bot.yaml` (também no modelo do `init`) e variáveis `GEMINI_API_KEYS`/`GEMINI_API_KEY` para o `ai-code-review`.
- Plugin `avoid-god-class` que reprova classes com mais de 300 linhas ou mais de 15 métodos públicos.
- Plugin `avoid-setstate-after-async` que avisa sobre `setState()` após `await` sem checagem de `mounted` em classes `State`/`ViewState`.
- Plugin `column-row-spacing` que reprova `Column`/`Row` com `SizedBox` de mesmo valor intercalados e sugere a propriedade `spacing` (Flutter 3.27+).
- Plugin `date-type-checker` que reprova campos `String` com nome ou documentação de data/hora em entities e models, sugerindo `DateTime`.
- Novos plugins incluídos em `allFlutterPlugins`, `codeQualityPlugins` e `performancePlugins` (`column-row-spacing`), sem export individual na raiz do pacote.
- Helpers `sendFormattedFail` e `sendFormattedWarn` (tipo `FormattedMessageOptions`) que montam mensagens no padrão do Danger Bot (título, problema ❌/✅, ação, objetivo e referência).
- `domain-entities`: regras para enums (pasta `entities/enums/`, arquivo `_enum.dart`, sufixo `Enum`) e para subpastas `extensions/`, `errors/`, `mixins/` e `typedefs/` dentro de `entities/`.
- `memory-leak-detector`: verificação de `DraggableScrollableController`, `SearchController`, `ExpansionTileController`, `FocusScopeNode`, `TransformationController`, `UndoHistoryController` e `OverlayPortalController`.

### Modificado

- **Incompatível:** `getDartFiles`, `getDartFilesInDirectory`, `getDomainDartFiles`, `getDataDartFiles` e `getPresentationDartFiles` passam a ser assíncronos (`Promise<string[]>`); `getDartFiles` retorna só arquivos existentes e deixa de aplicar o `ignore_files`.
- `identifier-language`: detecção de idioma trocada de `cld3-asm` para `eld` (inclui espanhol e textos mistos), dicionário ampliado e sugestão de tradução de comentários para inglês via Google Translate (pacote `translate`).
- `identifier-language`: comentários a partir de 10 caracteres ou com duas ou mais palavras do dicionário em português passam a ser apontados.
- Mensagens de `barrel-files-enforcer`, `domain-entities`, `domain-usecases`, `identifier-language` e `memory-leak-detector` no formato de `sendFormattedFail`.

### Corrigido

- `repositories` e `domain-usecases`: `implements`/`extends` em declarações de classe quebradas em várias linhas eram ignorados, gerando falsos positivos.
- Comando `create-plugin`: o novo plugin é registrado em `allFlutterPlugins` com `require(...).default`, evitando erro de referência circular.

## [2.0.1] - 2026-03-24

### Adicionado

- Arquivo de configuração `danger-bot.yaml` (ou `danger-bot.yml`) na raiz do projeto, carregado automaticamente por `executeDangerBot`.
- Chave `local_plugins`: arquivos `.ts`/`.js` ou diretórios com plugins do projeto, executados após os plugins passados a `executeDangerBot`.
- Chave `ignore_files`: caminhos exatos removidos das listas de `getAllChangedFiles` e `getDartFiles`.
- Chave `settings.verbose`: logs detalhados da execução, com tempo por plugin e total.
- Comando `init` da CLI que gera um `danger-bot.yaml` de exemplo na raiz.
- Exports `loadConfig`, `loadLocalPlugins`, `DangerBotConfig`, `setIgnoredFiles`, `getIgnoredFiles`, `setVerbose`, `isVerbose` e `verboseLog`.
- Plugin `merge-conflict-checker` (`mergeConflictCheckerPlugin`) que simula o merge com o branch de destino via `git merge-tree` e reprova os arquivos em conflito; incluído em `allFlutterPlugins`.
- Guia de configuração `docs/CONFIGURACAO.md`.

### Modificado

- `sendFail`/`sendWarn` com arquivo e linha registram também uma entrada na tabela principal do PR (`**título** — arquivo`), além do comentário inline.

## [1.9.9] - 2026-03-23

### Adicionado

- Plugin `presentation-try-catch-checker` (`presentationTryCatchCheckerPlugin`) que reprova `try-catch`/`try-finally` na camada `presentation/`; incluído em `allFlutterPlugins` e `presentationLayerPlugins`.

### Modificado

- Patch do Danger: mensagem "All green" substituída por mensagem de parabéns em pt-BR (antes era removida).
- Documentação atualizada com a lista atual de plugins e o padrão de mensagens dos plugins.

## [1.9.8] - 2026-03-22

### Modificado

- Mensagens de `pr-validation` e `security-checker` sem a quebra de linha inicial introduzida na versão anterior.

### Corrigido

- `sendMessage`, `sendWarn`, `sendFail` e `sendMarkdown` passam a ignorar mensagens vazias.

## [1.9.7] - 2026-03-22

### Modificado

- `pr-validation`: modelo de changelog sugerido no formato `## [x.x.x] - DD/MM/AAAA (Pre-Release)` com seções Fixed/Added/Changed e link do ticket.
- `pr-validation`: exemplo de divisão de PR grande com a quantidade real de arquivos e dicas finais removidas.
- Mensagens de `pr-validation` e `security-checker` reformatadas (quebra de linha inicial, listas espaçadas, entradas do `.gitignore` em lista).

## [1.9.6] - 2026-03-22

### Modificado

- `pr-validation`: mensagens de tamanho do PR condensadas em uma linha, sem cabeçalho `##`.

## [1.9.5] - 2026-03-22

### Modificado

- `flutter-analyze`: tradução para pt-BR ampliada a muito mais regras do analyzer (documentação, imports, construtores, null safety, entre outras) e link para a página de diagnósticos em mais casos.
- Ajustes de formatação nas mensagens de `pr-summary`, `pr-validation` e `security-checker`.

### Removido

- `flutter-analyze`: mensagens de progresso ("Analisando N arquivo(s)...") e de total de problemas encontrados.

## [1.9.4] - 2026-03-22

### Modificado

- Apenas atualização do número da versão.

## [1.8.3] - 2026-03-22

### Corrigido

- `barrel-files-enforcer`: considera apenas imports do próprio pacote (nome lido do `pubspec.yaml`), sem sugerir barrel file para pacotes externos; sem `pubspec.yaml` o plugin não roda.

## [1.8.2] - 2026-03-21

### Adicionado

- Plugin `identifier-language` (`identifierLanguagePlugin`) que reprova identificadores e comentários/documentação em português; incluído em `allFlutterPlugins` e `codeQualityPlugins`.
- Plugin `class-naming-convention` (`classNamingConventionPlugin`) que reprova verbos em nomes de repositories, datasources e ViewModels (via `wordpos`/WordNet); incluído em `allFlutterPlugins` e `codeQualityPlugins`.
- Plugin `repositories` (`repositoriesPlugin`) que valida interfaces de `domain/` (`*_repository_interface.dart`, prefixo `I`, sufixo `Repository`) e implementações de `data/` (`*_repository.dart`, `implements` da interface, `extends BaseRepository`), uma classe por arquivo.
- `clean-architecture`: regras que reprovam imports Data → UseCase, UseCase → UseCase e Presentation → Data.
- `data-datasources`: exige interface `I…Datasource` e implementação `…Datasource` no mesmo arquivo, uma de cada.
- `data-models`: exige sufixo `Model`, campos `final` e uma classe por arquivo.
- `domain-entities`: exige uma entity por arquivo.
- `domain-failures`: exige arquivo `*_failure.dart`, `sealed class` com sufixo `Failure` e ao menos uma subclasse `final class` com sufixo `Failure`.
- `presentation-viewmodels`: reprova imports de `data/` e campos do tipo Repository, Datasource ou Model em classes que estendem `ViewModelBase`.
- `security-checker`: detecção de chaves e tokens de provedores (Google, AWS, OpenAI, Stripe, Firebase, GitHub, Twilio, SendGrid, Slack, JWT), senhas, secrets, chaves privadas e credenciais em headers e URLs.
- `security-checker`: reprova arquivos sensíveis commitados (`.env`, `google-services.json`, keystores etc.) e avisa sobre entradas ausentes no `.gitignore`.

### Modificado

- **Incompatível:** `clean-architecture`, `domain-entities`, `domain-failures`, `domain-usecases`, `presentation-viewmodels`, `flutter-performance`, `flutter-widgets`, `late-final-checker`, `mediaquery-modern`, `memory-leak-detector` e `security-checker` passam a analisar o arquivo inteiro, não só o diff, e a comentar na linha do problema.
- **Incompatível:** `domain-usecases` passa a exigir o sufixo `Usecase` (antes exigia `UseCase` e rejeitava `Usecase`).
- **Incompatível:** `barrel-files-enforcer` analisa os imports de cada arquivo e reprova (fail, antes warn) dois ou mais imports `package:` da mesma pasta sem barrel file.
- **Incompatível:** `late-final-checker` reprova (fail, antes warn) apenas `late final` com valor atribuído na declaração.
- **Incompatível:** `pr-size-checker` conta arquivos `.dart` não gerados em vez de linhas: avisa acima de 60 e reprova acima de 100.
- **Incompatível:** `memory-leak-detector` verifica cada campo descartável de classes `State`/`ViewState` contra o `dispose()` e reprova (antes warn) `Timer` e streams sem `cancel()`.
- Plugins de camada validam arquivos em qualquer pasta `entities/`, `failures/`, `usecases/`, `models/` e `datasources/`, não só sob `domain/` ou `data/`.
- `flutter-performance`: lista ampliada de operações custosas antes do `return` no `build()` (loops, `sort`, criação de controllers, `Timer`, HTTP, JSON, `RegExp`, `DateTime.now()`), ignorando callbacks; `.where()`/`.map()` deixam de ser apontados.
- `flutter-widgets`: ordem `@override` → públicos → privados verificada por classe em widgets e states de qualquer pasta.
- `mediaquery-modern`: aponta qualquer `MediaQuery.of(context).<propriedade>` e sua atribuição a variável, sugerindo `sizeOf`, `paddingOf` etc.
- `spell-checker`: cspell executado diretamente (dicionários Dart, Flutter e software, mais `cSpell.words` do `.vscode/settings.json`), sem scripts auxiliares, só nas linhas adicionadas e com erros agrupados por arquivo.
- `spell-checker`: palavras em português reportadas separadamente dos erros de digitação.
- `pr-summary`: resumo com tabela de métricas, camadas afetadas, testes, arquivos gerados, nível de risco, distribuição por tipo, arquivos em destaque, pontos de atenção e checklist por plataforma.
- Títulos das mensagens da maioria dos plugins sem cabeçalho `##` e sem emoji.
- Patch do Danger reescrito com substituições exatas de texto (antes expressões regulares) e mensagem de problemas com o nome "Danger Bot".

### Removido

- **Incompatível:** plugins `domain-repositories` e `data-repositories` (`domainRepositoriesPlugin`, `dataRepositoriesPlugin`), substituídos por `repositories`.
- **Incompatível:** plugin `portuguese-documentation` (`portugueseDocumentationPlugin`); a documentação em português passa a ser apontada pelo `identifier-language`.
- **Incompatível:** plugin `presentation-states` (`presentationStatesPlugin`).
- `security-checker`: verificação de uso de `eval()`.
- `clean-architecture`: verificação de Repository em ViewModel (coberta pelo `presentation-viewmodels`).

### Corrigido

- Comentários duplicados: `sendMessage`/`sendWarn`/`sendFail` descartam mensagens idênticas (tipo, arquivo, linha e texto) e o patch do Danger deixa de exigir o `uuid` do autor ao reconhecer comentários no Bitbucket Cloud.
- Comentários inline no Bitbucket Cloud: metadados em link invisível com arquivo e linha (estilo Danger Ruby) e uso do template do Bitbucket com `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN`.

## [1.8.1] - 2026-03-20

### Adicionado

- Plugin `pr-summary`, executado primeiro, que publica no topo do PR um sumário com o tamanho, os arquivos criados/modificados/removidos e as linhas alteradas.
- Plugin `pr-validation` que reprova PR com descrição abaixo de 15 caracteres, sem `CHANGELOG.md` atualizado ou com `pubspec.lock` alterado sem o `pubspec.yaml`, e avisa sobre PRs com muitos arquivos Dart ou linhas alteradas.
- Plugins da camada Domain: `domain-entities` (arquivo `*_entity.dart`, sufixo `Entity`, `final class`), `domain-failures` (sufixo `Failure`, primeira classe `sealed`), `domain-repositories` (`*_repository_interface.dart`, `abstract interface class` com prefixo `I`, sem retorno `void`) e `domain-usecases` (`*_usecase.dart`, sufixo `UseCase`, interface `I…UseCase` implementada com `implements`).
- Plugins `data-datasources`, `data-models` e `data-repositories`, que exigem os sufixos `_datasource.dart`, `_model.dart` e `_repository.dart`; `presentation-states`, que exige states `sealed`; e `presentation-viewmodels`, que proíbe ViewModel dependente de repository.
- Plugin `clean-architecture` que reprova imports de Domain para Data/Presentation, de Data para Presentation e ViewModel que usa repository.
- Plugins de qualidade: `file-naming` (arquivos novos em `lib/` em snake_case), `comments-checker` (proíbe `//` e exige `///`), `late-final-checker` (avisa sobre `late final`), `barrel-files-enforcer` (avisa sobre pasta de camada sem `<pasta>/<pasta>.dart`) e `security-checker` (API keys do Google, OpenAI e AWS no código e uso de `eval()`).
- Plugins de Flutter: `flutter-performance` (`sort`, `where`, `map` e laços dentro de `build()`), `flutter-widgets` (métodos `@override` antes dos demais), `mediaquery-modern` (proíbe `MediaQuery.of(context).size`) e `memory-leak-detector` (controller sem `dispose()`, `Timer` e `StreamSubscription` sem `cancel()`).
- Arrays de plugins por categoria: `domainLayerPlugins`, `dataLayerPlugins`, `presentationLayerPlugins`, `cleanArchitecturePlugins`, `codeQualityPlugins` e `performancePlugins`.
- Helpers exportados para filtrar arquivos e ler o PR: `getAllChangedFiles`, `getDartFiles`, `getDartFilesInDirectory`, `getDomainDartFiles`, `getDataDartFiles`, `getPresentationDartFiles`, `isInLayer`, `getFilesMatching`, `getFilesByExtension`, `hasFilesMatching`, `getFileContent`, `fileContainsPattern`, `getPRTitle`, `getPRDescription` e `getLinesChanged`, além dos tipos `ExtendedDangerDSLType` e `ExtendedGitDSL`.
- Comando `remove-plugin` (alias `rm`) na CLI, que apaga a pasta do plugin e o retira dos exports e de `allFlutterPlugins`.
- Tradução para pt-BR das mensagens do Danger (cabeçalhos, contagens e frase de abertura do resumo), aplicada pelo postinstall.

### Modificado

- **Incompatível:** pacote renomeado de `@diletta/danger-bot` para `@felipeduarte26/danger-bot`, com o repositório movido do Bitbucket para o GitHub.
- **Incompatível:** `allFlutterPlugins` passa de 7 para 26 plugins, com `pr-summary` primeiro; vários dos novos reprovam o build.
- **Incompatível:** Node mínimo passa de `>=22.19.0` para `>=25.2.1` e o peer `danger` passa a `^13.0.7`.
- **Incompatível:** `package.json` passa a declarar `"type": "module"` (CLI convertida para ES Modules), mas o `dist/` continua em CommonJS e deixa de carregar com `require`.
- **Incompatível:** `getDanger()` retorna `ExtendedDangerDSLType` em vez de `any`.
- Postinstall renomeado para `scripts/patch-danger.cjs`, com marcador versionado que reaplica os patches quando a versão do patch muda.
- Rodapé dos comentários com 🚀 no lugar de 🚫 e link para o repositório do pacote (`github.com/felipeduarte26/danger-bot`).
- `create-plugin` passa a registrar o plugin novo também em `src/index.ts` (import e `allFlutterPlugins`).
- `flutter-analyze`: o comentário inline mostra o link da documentação da regra e cita o nome da regra só quando não há link.
- Dependências atualizadas: `cspell` `^9.7.0`, `commander` `^14.0.3`, `@cspell/dict-dart` e `@cspell/dict-software-terms`.
- Documentação reescrita em pt-BR e reorganizada em `docs/` (instalação, início rápido, API, helpers, guia de plugins, exemplos, FAQ, commits e pipelines Bitbucket/Bitrise), com README por plugin.
- Desenvolvimento com ESLint, Prettier, Husky (lint-staged, commitlint com Conventional Commits e lint/type-check/build no pre-push), scripts `lint`, `format` e `type-check`, e CLI dividida em módulos em `bin/commands/`.

### Removido

- **Incompatível:** plugin `flutter-architecture` (`flutterArchitecturePlugin`) e plugin de exemplo `plugin-test` (`pluginTestPlugin`).
- **Incompatível:** `setupDangerConfig()` e `addSuccessMessage()`; a remoção do "All green" fica só a cargo do postinstall.

### Corrigido

- Comentários inline do Bitbucket Cloud: os metadados (`DangerID`, arquivo e linha) deixam de aparecer no preview, trocados por um link invisível no fim do comentário (estratégia do Danger Ruby), e o `danger-id` com `;` permite ao Danger apagar os comentários antigos em vez de duplicá-los.
- `gen` gerava um `dangerfile.example.ts` que importava de `danger-bot` e listava plugins inexistentes; agora usa `executeDangerBot(allFlutterPlugins)` de `@felipeduarte26/danger-bot`.
- `changelog-checker`: listas markdown da mensagem de aviso renderizadas corretamente.

## [1.8.0] - 2025-11-02

### Adicionado

- Script `postinstall` (`scripts/patch-danger.js`) que altera o Danger JS instalado em `node_modules`: remove a mensagem "All green", troca os links de `danger.systems` por `https://github.com/felipeduarte26` e "dangerJS" por "Danger Bot", com backup `.backup` dos arquivos alterados e marcador `.danger-bot-patched` para não reaplicar.
- `addSuccessMessage`, que publica uma mensagem de sucesso em português quando não há avisos nem falhas.

### Modificado

- **Incompatível:** `setupDangerConfig` passa a aceitar `{ successMessage, addCustomSuccess }` e, por padrão, publica a mensagem de sucesso em português em vez de ocultar "All green" e reescrever os links do Danger JS.

### Removido

- **Incompatível:** export `customizeDangerMessages`.

## [1.7.0] - 2025-11-01

### Adicionado

- `setupDangerConfig` (e `customizeDangerMessages`), para chamar no início do `dangerfile`: suprime a mensagem "All green. Well done." e troca o texto e os links do Danger JS por "Danger Bot", apontando para o repositório do pacote.

## [1.6.0] - 2025-11-01

### Adicionado

- Parâmetros opcionais `file` e `line` em `sendMessage`, `sendWarn`, `sendFail` e `sendMarkdown`, para comentar em uma linha específica do arquivo.

### Modificado

- `plugin-test` desabilitado por padrão (`enabled: false`).
- Plugins e template gerado por `create-plugin` passam a usar `getDanger` e os helpers `send*` em vez das variáveis globais do Danger JS.

## [1.5.0] - 2025-11-01

### Modificado

- `plugin-test` passa a publicar só uma mensagem informativa, sem o aviso e a falha de exemplo.

## [1.4.3] - 2025-11-01

### Modificado

- **Incompatível:** `danger` passa de `dependencies` para `peerDependencies` (`^13.0.0`), evitando instalação duplicada; o projeto precisa declarar o `danger` como dependência própria.

## [1.4.2] - 2025-11-01

### Corrigido

- `plugin-test` deixa de importar `danger`, `message`, `warn` e `fail` do pacote `danger` e passa a usar os globais injetados pelo Danger JS em tempo de execução.

## [1.4.1] - 2025-11-01

### Removido

- **Incompatível:** re-exportação de `danger`, `message`, `warn`, `fail`, `markdown` e `schedule` pelo import principal, pois o Danger JS detecta e remove esse import; usar `getDanger` e os helpers `send*`.

## [1.4.0] - 2025-11-01

### Adicionado

- Helpers `getDanger`, `sendMessage`, `sendWarn`, `sendFail`, `sendMarkdown` e `scheduleTask`, que acessam os globais injetados pelo Danger JS em tempo de execução e evitam o conflito com a remoção de imports do `danger`.

## [1.3.0] - 2025-11-01

### Adicionado

- `allFlutterPlugins`: array com todos os plugins Flutter, pronto para `runPlugins`.
- `executeDangerBot` (com o tipo `DangerBotCallbacks`), que executa os plugins com os callbacks `onBeforeRun`, `onSuccess`, `onError` e `onFinally`.
- Re-exportação de `danger`, `message`, `warn`, `fail`, `markdown` e `schedule` do Danger JS pelo import principal do pacote.
- Arquivo `danger-globals.d.ts` publicado no pacote com os tipos das variáveis globais do Danger JS.
- Plugin `plugin-test` (`pluginTestPlugin`) de exemplo, que publica uma mensagem, um aviso e uma falha; incluído em `allFlutterPlugins`.

### Modificado

- **Incompatível:** versão mínima do Node.js passa de `>=18.0.0` para `>=22.19.0`.
- Plugins reorganizados por plataforma em `src/plugins/flutter/<nome>/`; os exports pelo nome continuam os mesmos.
- CLI: `create-plugin` pergunta a plataforma (Flutter/Dart ou Node.js), cria o plugin em `src/plugins/<plataforma>/<nome>/` e registra o export no barrel da plataforma; `list` e `info` agrupam os plugins por plataforma; `generate-dangerfile` inclui o import do `danger`.
- Dependências atualizadas: `cspell` 9, `commander` 14 e `@cspell/dict-software-terms` 5.
- Documentação dos plugins traduzida para português e ampliada; `docs/CLI.md` e `docs/PLATFORM_ARCHITECTURE.md` substituem `docs/CLI_GUIDE.md`.
- Build com `tsc-alias` para resolver os aliases `@types` e `@plugins/*`.

### Corrigido

- Instalação via Git: o `dist/` compilado passa a ser versionado, dispensando build no projeto que instala o pacote.
- Declarações de tipo (`.d.ts`) passam a ser geradas no build, como o campo `types` do `package.json` já indicava.

## [1.0.0] - 2025-11-01

### Adicionado

- Lançamento inicial do `@diletta/danger-bot`: conjunto modular de plugins Danger JS para revisar PRs de projetos Flutter/Dart.
- Plugin `pr-size-checker` que avisa quando o PR passa de 500 linhas alteradas, com alerta reforçado acima de 1000.
- Plugin `changelog-checker` que avisa quando arquivos de código mudam sem atualização do `CHANGELOG`.
- Plugin `flutter-analyze` que executa `flutter analyze` nos arquivos Dart alterados e reporta cada problema como falha na linha, com mensagem traduzida e link para a documentação da regra.
- Plugin `flutter-architecture` que sugere classes `final`, cobra barrel file por pasta, questiona `extends` fora das classes base do Flutter e verifica as camadas `data`/`domain`/`presentation`.
- Plugin `spell-checker` que verifica a ortografia de identificadores Dart com `cspell` (dicionários Dart, Flutter e de software, mais as `cSpell.words` do `.vscode/settings.json`).
- Plugin `portuguese-documentation` que detecta comentários de documentação (`///`) em português com `cld3-asm`.
- Núcleo para criar e executar plugins: `createPlugin`, `runPlugins` e as interfaces `DangerPlugin` e `DangerPluginConfig`.
- CLI `danger-bot` com os comandos `create-plugin` (`new`), `list` (`ls`), `generate-dangerfile` (`gen`), `validate` e `info`.
- Guias de instalação, CLI, arquitetura e configuração de pipelines em `docs/`.

[Não publicado]: https://github.com/felipeduarte26/danger-bot/compare/v5.0.0...HEAD
[5.0.0]: https://github.com/felipeduarte26/danger-bot/compare/v4.1.0...v5.0.0
[4.1.0]: https://github.com/felipeduarte26/danger-bot/compare/v4.0.1...v4.1.0
[4.0.1]: https://github.com/felipeduarte26/danger-bot/compare/fc1c4ea50...v4.0.1
[4.0.0]: https://github.com/felipeduarte26/danger-bot/compare/48760e7fe...fc1c4ea50
[3.4.0]: https://github.com/felipeduarte26/danger-bot/compare/57205c031...48760e7fe
[3.3.3]: https://github.com/felipeduarte26/danger-bot/compare/493274f3c...57205c031
[3.3.2]: https://github.com/felipeduarte26/danger-bot/compare/e769149e9...493274f3c
[3.3.1]: https://github.com/felipeduarte26/danger-bot/compare/3ef58b8e8...e769149e9
[3.3.0]: https://github.com/felipeduarte26/danger-bot/compare/7c2286b26...3ef58b8e8
[3.2.7]: https://github.com/felipeduarte26/danger-bot/compare/9bb00e489...7c2286b26
[3.2.6]: https://github.com/felipeduarte26/danger-bot/compare/5ee00a205...9bb00e489
[3.2.5]: https://github.com/felipeduarte26/danger-bot/compare/b4eb4d184...5ee00a205
[3.2.4]: https://github.com/felipeduarte26/danger-bot/compare/ebe779690...b4eb4d184
[3.2.3]: https://github.com/felipeduarte26/danger-bot/compare/e17685779...ebe779690
[3.2.2]: https://github.com/felipeduarte26/danger-bot/compare/4d13aac14...e17685779
[3.2.1]: https://github.com/felipeduarte26/danger-bot/compare/8926fdf63...4d13aac14
[3.2.0]: https://github.com/felipeduarte26/danger-bot/compare/af7a2f564...8926fdf63
[3.1.0]: https://github.com/felipeduarte26/danger-bot/compare/c35b6e86b...af7a2f564
[3.0.0]: https://github.com/felipeduarte26/danger-bot/compare/e9eccda4f...c35b6e86b
[2.9.9]: https://github.com/felipeduarte26/danger-bot/compare/5cf249a28...e9eccda4f
[2.9.8]: https://github.com/felipeduarte26/danger-bot/compare/817b23ef0...5cf249a28
[2.9.7]: https://github.com/felipeduarte26/danger-bot/compare/3a4135940...817b23ef0
[2.9.6]: https://github.com/felipeduarte26/danger-bot/compare/a33e69af7...3a4135940
[2.9.5]: https://github.com/felipeduarte26/danger-bot/compare/7ab68b5de...a33e69af7
[2.9.4]: https://github.com/felipeduarte26/danger-bot/compare/fa40024ce...7ab68b5de
[2.9.3]: https://github.com/felipeduarte26/danger-bot/compare/eefb67d1a...fa40024ce
[2.9.2]: https://github.com/felipeduarte26/danger-bot/compare/e0f795d7b...eefb67d1a
[2.9.1]: https://github.com/felipeduarte26/danger-bot/compare/6a05e300d...e0f795d7b
[2.9.0]: https://github.com/felipeduarte26/danger-bot/compare/59c04714f...6a05e300d
[2.8.9]: https://github.com/felipeduarte26/danger-bot/compare/be3616405...59c04714f
[2.8.8]: https://github.com/felipeduarte26/danger-bot/compare/576ca734f...be3616405
[2.8.7]: https://github.com/felipeduarte26/danger-bot/compare/c5c118787...576ca734f
[2.8.6]: https://github.com/felipeduarte26/danger-bot/compare/a12429a26...c5c118787
[2.8.4]: https://github.com/felipeduarte26/danger-bot/compare/e331d4f12...a12429a26
[2.8.3]: https://github.com/felipeduarte26/danger-bot/compare/7eb83107d...e331d4f12
[2.8.2]: https://github.com/felipeduarte26/danger-bot/compare/90ee03c0c...7eb83107d
[2.8.1]: https://github.com/felipeduarte26/danger-bot/compare/d651e8753...90ee03c0c
[2.8.0]: https://github.com/felipeduarte26/danger-bot/compare/89ac2659d...d651e8753
[2.7.2]: https://github.com/felipeduarte26/danger-bot/compare/bf127bb26...89ac2659d
[2.7.1]: https://github.com/felipeduarte26/danger-bot/compare/b10d7aaf1...bf127bb26
[2.7.0]: https://github.com/felipeduarte26/danger-bot/compare/713152b79...b10d7aaf1
[2.6.6]: https://github.com/felipeduarte26/danger-bot/compare/7a1f6b356...713152b79
[2.6.5]: https://github.com/felipeduarte26/danger-bot/compare/566c516bb...7a1f6b356
[2.6.4]: https://github.com/felipeduarte26/danger-bot/compare/7cf7e848c...566c516bb
[2.6.3]: https://github.com/felipeduarte26/danger-bot/compare/e94b5797c...7cf7e848c
[2.6.2]: https://github.com/felipeduarte26/danger-bot/compare/f537d9699...e94b5797c
[2.6.1]: https://github.com/felipeduarte26/danger-bot/compare/51faaa6b6...f537d9699
[2.5.8]: https://github.com/felipeduarte26/danger-bot/compare/fae545d2c...51faaa6b6
[2.5.7]: https://github.com/felipeduarte26/danger-bot/compare/9dd0b6396...fae545d2c
[2.5.6]: https://github.com/felipeduarte26/danger-bot/compare/33f90b847...9dd0b6396
[2.5.5]: https://github.com/felipeduarte26/danger-bot/compare/db0b710ce...33f90b847
[2.5.4]: https://github.com/felipeduarte26/danger-bot/compare/10c275bd6...db0b710ce
[2.5.3]: https://github.com/felipeduarte26/danger-bot/compare/59808425b...10c275bd6
[2.5.0]: https://github.com/felipeduarte26/danger-bot/compare/2bbd96eb9...59808425b
[2.4.2]: https://github.com/felipeduarte26/danger-bot/compare/6942389ff...2bbd96eb9
[2.3.1]: https://github.com/felipeduarte26/danger-bot/compare/477209d56...6942389ff
[2.3.0]: https://github.com/felipeduarte26/danger-bot/compare/d690349a9...477209d56
[2.2.2]: https://github.com/felipeduarte26/danger-bot/compare/5ab0b83bf...d690349a9
[2.2.1]: https://github.com/felipeduarte26/danger-bot/compare/ea288d0c0...5ab0b83bf
[2.2.0]: https://github.com/felipeduarte26/danger-bot/compare/c4fd62a1e...ea288d0c0
[2.1.8]: https://github.com/felipeduarte26/danger-bot/compare/12ae27f1a...c4fd62a1e
[2.1.7]: https://github.com/felipeduarte26/danger-bot/compare/17c6cec72...12ae27f1a
[2.1.6]: https://github.com/felipeduarte26/danger-bot/compare/d95d558d9...17c6cec72
[2.1.5]: https://github.com/felipeduarte26/danger-bot/compare/684c29663...d95d558d9
[2.1.4]: https://github.com/felipeduarte26/danger-bot/compare/939b63ef1...684c29663
[2.1.3]: https://github.com/felipeduarte26/danger-bot/compare/ba4ca1287...939b63ef1
[2.1.2]: https://github.com/felipeduarte26/danger-bot/compare/5852c739d...ba4ca1287
[2.0.7]: https://github.com/felipeduarte26/danger-bot/compare/b86e29e48...5852c739d
[2.0.6]: https://github.com/felipeduarte26/danger-bot/compare/545eecfa1...b86e29e48
[2.0.5]: https://github.com/felipeduarte26/danger-bot/compare/5466030b7...545eecfa1
[2.0.4]: https://github.com/felipeduarte26/danger-bot/compare/bcc222927...5466030b7
[2.0.3]: https://github.com/felipeduarte26/danger-bot/compare/1e5befb9b...bcc222927
[2.0.2]: https://github.com/felipeduarte26/danger-bot/compare/63d61832f...1e5befb9b
[2.0.1]: https://github.com/felipeduarte26/danger-bot/compare/a25b1f1a7...63d61832f
[1.9.9]: https://github.com/felipeduarte26/danger-bot/compare/1ecf2531b...a25b1f1a7
[1.9.8]: https://github.com/felipeduarte26/danger-bot/compare/2d8d36aa1...1ecf2531b
[1.9.7]: https://github.com/felipeduarte26/danger-bot/compare/9d5e1e99c...2d8d36aa1
[1.9.6]: https://github.com/felipeduarte26/danger-bot/compare/c94c4c15a...9d5e1e99c
[1.9.5]: https://github.com/felipeduarte26/danger-bot/compare/9c5557071...c94c4c15a
[1.9.4]: https://github.com/felipeduarte26/danger-bot/compare/91194af77...9c5557071
[1.8.3]: https://github.com/felipeduarte26/danger-bot/compare/ae25b2de7...91194af77
[1.8.2]: https://github.com/felipeduarte26/danger-bot/compare/23ce82f5c...ae25b2de7
[1.8.1]: https://github.com/felipeduarte26/danger-bot/compare/216e4d0c4...23ce82f5c
[1.8.0]: https://github.com/felipeduarte26/danger-bot/compare/bdd91c9fd...216e4d0c4
[1.7.0]: https://github.com/felipeduarte26/danger-bot/compare/9aafaeca6...bdd91c9fd
[1.6.0]: https://github.com/felipeduarte26/danger-bot/compare/6b3cc0ca5...9aafaeca6
[1.5.0]: https://github.com/felipeduarte26/danger-bot/compare/9246f108f...6b3cc0ca5
[1.4.3]: https://github.com/felipeduarte26/danger-bot/compare/96540dc34...9246f108f
[1.4.2]: https://github.com/felipeduarte26/danger-bot/compare/e3aaa24cc...96540dc34
[1.4.1]: https://github.com/felipeduarte26/danger-bot/compare/ed46323bd...e3aaa24cc
[1.4.0]: https://github.com/felipeduarte26/danger-bot/compare/69e3a4748...ed46323bd
[1.3.0]: https://github.com/felipeduarte26/danger-bot/compare/0e97cf2b9...69e3a4748
[1.0.0]: https://github.com/felipeduarte26/danger-bot/tree/0e97cf2b9
