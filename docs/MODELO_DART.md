# Modelo Dart (`DartFile`, `DartClass`, `DartPath`...)

Os plugins Flutter não leem mais o código com regex linha a linha. Eles usam um **modelo do arquivo Dart**:
o arquivo é lido e analisado uma vez (tokens, não regex), e o plugin trabalha só com propriedades —
classes, campos, métodos, tipos, chamadas, strings, comentários.

```typescript
import { DartFile, DartLayerFolder, createPlugin, sendFormattedFail } from "@types";

for (const file of DartFile.changed()) {
  if (!file.path.inFolder(DartLayerFolder.Entities)) continue;
  for (const cls of file.classes) {
    for (const field of cls.fields) {
      if (field.type?.isString && /date$/i.test(field.name)) {
        // field.lineText é a linha real do código; field.line é a linha do comentário inline
      }
    }
  }
}
```

- **Onde fica:** `src/dart/` (exportado por `"@types"` dentro do pacote e por `@felipeduarte26/danger-bot` para plugins locais).
- **Testes:** `tests/dart-model.test.cjs` (`npm test`).
- **Quando usar:** sempre que um plugin precisar entender código Dart. Regex só para a **regra** (ex.: o padrão de um segredo, o formato de um nome), nunca para achar classes, campos, métodos, chamadas, comentários ou strings.

## Sumário

- [Por que um modelo](#por-que-um-modelo)
- [Como o modelo evita falso positivo](#como-o-modelo-evita-falso-positivo)
- [Ler arquivos](#ler-arquivos)
- [Caminho: `DartPath`](#caminho-dartpath)
- [Arquivo: `DartFile`](#arquivo-dartfile)
- [Declarações: `DartClass`](#declarações-dartclass)
- [Campos e variáveis](#campos-e-variáveis)
- [Métodos e funções](#métodos-e-funções)
- [Construtores e parâmetros](#construtores-e-parâmetros)
- [Tipos: `DartType`](#tipos-darttype)
- [Corpos: statements, chamadas, closures, try/catch](#corpos-statements-chamadas-closures-trycatch)
- [Strings, comentários e diretivas](#strings-comentários-e-diretivas)
- [Enums](#enums)
- [Receitas](#receitas)
- [Linhas e textos das mensagens](#linhas-e-textos-das-mensagens)
- [Como funciona por dentro](#como-funciona-por-dentro)

## Por que um modelo

Antes, cada plugin tinha seu mini-parser: contava `{` e `}` caractere a caractere, pulava `//` e `/* */`
à mão, procurava `class\s+(\w+)` com uma regex diferente em cada arquivo. Cada um errava de um jeito:

| Antes (regex por linha) | Com o modelo |
| --- | --- |
| `// print('x')` no fim da linha era reportado | comentário nunca é código |
| `'{'` numa string desalinhava a contagem de chaves | strings são tokens |
| `Future<Either<F, List<X>>>` escondia o método | tipos genéricos aninhados são lidos inteiros |
| `final class X\n    extends Y` (quebra de linha) não era visto | quebras de linha não mudam nada |
| `bool Function(int)` virava "parâmetro bool" | tipo de função é `DartTypeKind.Function` |
| variável local dentro de método virava "campo" | `cls.fields` só tem campos |
| `_controller..stop()..dispose()` não contava como dispose | `call.isCascade` + `call.cascadeTarget` |
| o 2º State do arquivo usava o `dispose()` do 1º | cada classe tem os próprios métodos |

Validação: o modelo lê os 4.678 arquivos do esfera (lib + test) sem nenhum trecho não reconhecido, e
extrai **exatamente os mesmos fatos** do código reformatado com `dart format` em 40, 80 e 160 colunas.

## Como o modelo evita falso positivo

| | Regra | Na prática |
| --- | --- | --- |
| R1 | Mesma fonte e mesmas linhas de antes | `fs.readFileSync` + `split("\n")`; linhas base 1; `node.lineText` = `lines[i].trim()` |
| R2 | Desconhecido nunca vira `false` | `var x = 1` → `field.type === null`, `field.nullability === Nullability.Unknown` |
| R3 | Ausência só com certeza | `cls.hasMember("dispose")` → `Presence.Unknown` se a classe tem trecho não reconhecido |
| R4 | Sem sinônimos | `inFolder(DartLayerFolder.UseCases)` = `includes("/usecases/")`; `usecase` (singular) não conta |
| R5 | Exclusões só crescem | `isGenerated`/`isTest` são a união das listas que os plugins usavam |
| R6 | O tipo separa os escopos | `cls.fields` nunca tem variável local; locais estão em `body.localVariables` |
| R7 | Nunca lança exceção | arquivo truncado, vazio ou com sintaxe nova: o que não for reconhecido vira `DartUnknownMember`/`parseErrors` |
| R8 | Fatos, não decisões | o modelo diz o que o código **é**; o plugin decide o que é erro |

Consequência para quem escreve plugin: **regra de ausência** ("falta X") só reporta quando a classe está
completa (`cls.isComplete` ou `Presence.Absent`). Propriedade que pode ser desconhecida é `null` ou um enum
com `Unknown` — compare explicitamente (`=== Nullability.NonNullable`), nunca com `!`.

## Ler arquivos

```typescript
DartFile.changed();                      // .dart criados + modificados no PR, existentes, sem testes e sem gerados
DartFile.changed({ includeTests: true }); // inclui _test.dart e test/
DartFile.read("lib/x.dart");             // um arquivo (cache por execução; nunca lança exceção)
await DartFile.readWithDiff("lib/x.dart"); // + file.addedLines / file.isAdded(line) a partir do diff do PR
DartFile.fromSource(texto, "lib/x.dart"); // a partir de texto (testes)
```

- O caminho é o do Danger: relativo à raiz do projeto (`lib/features/...`).
- Ordem: modificados e depois criados; `changed({ createdFirst: true })` inverte (a ordem dos arquivos é a ordem das mensagens).
- `ignore_files` do `danger-bot.yaml` já foi aplicado na lista do Danger: `changed()` respeita.
- Arquivo deletado/inexistente: `read()` devolve `exists === false` e listas vazias.
- O cache é limpo no início de cada `runPlugins` (`DartFile.clearCache()`): vários plugins lendo o mesmo arquivo fazem um parse só.

## Caminho: `DartPath`

Só o caminho, sem ler o arquivo (serve para qualquer arquivo do PR, até deletado ou não-Dart).
`file.path` em um `DartFile`, ou `DartPath.of(caminho)`.

| Propriedade | Exemplo (`packages/app/lib/features/order/domain/usecases/get_order_usecase.dart`) |
| --- | --- |
| `path` / `fileName` / `baseName` | caminho / `get_order_usecase.dart` / `get_order_usecase` |
| `extension` / `compoundSuffix` | `.dart` / `null` (em `x.g.dart`: `.g.dart`) |
| `directory` / `folderName` / `segments` | `.../usecases` / `usecases` / `["packages", "app", "lib", ...]` |
| `layer` | `DartLayer.Domain` (primeira em Domain → Data → Presentation → Core) |
| `layerFolder` | `DartLayerFolder.UseCases` (a pasta de papel mais próxima do arquivo) |
| `feature` | `order` (segmento depois de `features/`) |
| `libRelativePath` / `packageRootPath` | `features/order/.../get_order_usecase.dart` / `packages/app` |
| `expectedTestPath` | `packages/app/test/features/order/domain/usecases/get_order_usecase_test.dart` |
| `isDart` / `isTest` / `isGenerated` / `isBarrel` | `true` / `false` / `false` / `false` |
| `category` | `FileCategory.Dart` (Generated, Test, Dart, Config, Asset, Docs, Other) |
| `package` | `DartPackage` do pubspec mais próximo (`name`, `sdkMin`, `supportsLanguage(3, 13)`) |

Métodos:

- `inLayer(DartLayer.Domain)` — `path.includes("/domain/")`, a mesma regra do `isInLayer` (a 1ª pasta não conta).
- `inFolder(DartLayerFolder.Entities)` ou `inFolder("enums")` — `path.includes("/entities/")`.
- `hasTest(prFiles)` — teste no disco (`expectedTestPath`), no PR ou com o mesmo nome em qualquer pasta de `test/`.

Para **regras**, use `inLayer`/`inFolder` (mesma semântica dos plugins antigos). `layer`/`layerFolder`
servem para relatórios.

- `isTest`: `_test.dart` ou pasta de testes do pacote (`test/`, `integration_test/`, `test_driver/`, na raiz ou em `packages/x/`). Uma pasta `test` dentro de `lib/` é código de produção; para "qualquer `/test/` no caminho" use `inFolder("test")`.
- `isGenerated`: `GENERATED_SUFFIXES` (`.g`, `.freezed`, `.mocks`, `.mock`, `.gr`, `.gen`, `.config`, `.chopper`, `.mapper`, `.module`, `.graphql`, `.reflectable`, `.tailor`) ou pasta `generated/`, `.dart_tool/`, `build/`. `file.isGenerated` (no `DartFile`) também olha `part 'x.g.dart'` e o cabeçalho `GENERATED CODE`.
- `isBarrel`: nome do arquivo igual ao da pasta (`models/models.dart`).

## Arquivo: `DartFile`

| Propriedade / método | O que é |
| --- | --- |
| `path`, `exists`, `source`, `lines`, `lineCount` | caminho (`DartPath`), conteúdo, linhas (`source.split("\n")`) |
| `declarations` | todas as declarações de tipo, na ordem |
| `classes` / `enums` / `mixins` / `extensions` / `extensionTypes` | por tipo (`classes` inclui `abstract`, `sealed`, `base`, `interface`, `final`, `mixin class`, mixin application) |
| `functions` / `variables` / `typedefs` | nível superior |
| `directives` / `imports` / `exports` / `parts` / `partOf` | diretivas |
| `comments` / `strings` / `identifiers` | todos, na ordem do arquivo |
| `calls()` | todas as chamadas (corpos, inicializadores, valores padrão) |
| `findClass(nome)` / `declarationAt(linha)` | busca |
| `isCode(linha)` / `isCommentLine(linha)` | a linha tem código / é só comentário |
| `lineAt(linha)` / `snippet(de, até)` | texto original |
| `addedLines` / `isAdded(linha)` | linhas do diff (só com `readWithDiff`) |
| `generatedReason` / `isGenerated` / `languageVersionOverride` | gerado? `// @dart=` |
| `isComplete` / `parseErrors` | tudo foi reconhecido? |

## Declarações: `DartClass`

`DartClass` representa `class`, `enum`, `mixin`, `extension`, `extension type` e mixin application (`kind`).

| Propriedade / método | O que é |
| --- | --- |
| `kind`, `name`, `isPrivate` | `DartDeclarationKind`, nome (`""` na extension sem nome) |
| `modifiers` + `isAbstract`, `isBase`, `isInterface`, `isFinal`, `isSealed`, `isMixinClass`, `isAugmentation` | todos os modificadores do Dart 3 |
| `typeParameters` | `T extends Comparable<T>` → `{ name: "T", bound: DartType }` |
| `superclass` / `interfaces` / `mixins` / `onTypes` / `extendedType` | `extends` / `implements` / `with` / `mixin ... on` / `extension ... on` |
| `extendsAny("State", "ViewState")` / `implementsAny(...)` / `mixesIn(...)` | por nome (`State<Foo<T>>` casa com `"State"`) |
| `annotations` / `hasAnnotation("immutable")` / `doc` | anotações e `///` |
| `header` | cabeçalho clássico em uma linha (`final class Foo<T> extends Bar {`), também em classes com primary constructor |
| `primaryConstructor` | o construtor do cabeçalho (Dart 3.13), com os campos declarantes |
| `members` | todos os membros na ordem (campo, construtor, método, `DartUnknownMember`) |
| `fields` / `constructors` / `methods` / `enumValues` | por tipo |
| `findField(nome)` / `findMethod(nome, kind?)` / `findConstructor(nome \| null)` | busca |
| `hasMember(nome, kind?)` | `Presence.Present` / `Absent` / `Unknown` |
| `isComplete` / `unknownMembers` | o corpo foi todo reconhecido? |
| `line` / `nameLine` / `startLine` / `endLine` / `lineCount` | linha do 1º modificador/palavra-chave, do nome, com doc/anotações, fim |

Todas as combinações de modificadores da [referência do Dart](https://dart.dev/language/class-modifiers)
são reconhecidas, inclusive quebradas em várias linhas ou com comentários entre as palavras.

## Campos e variáveis

`DartField` (campo), `DartTopLevelVariable` e `DartLocalVariable` têm a base `DartVariable`:

| Propriedade | O que é |
| --- | --- |
| `name`, `isPrivate`, `type` (`DartType \| null`), `nullability` | `type` é `null` sem tipo escrito |
| `isFinal`, `isConst`, `isLate`, `isVar`, `isStatic`, `isCovariant`, `isExternal`, `isAbstract` | modificadores escritos |
| `initializer` | `DartExpression` ou `null` |
| `annotations`, `doc`, `trailingComment` | |
| `line` / `nameLine` | linha do início da declaração / do nome |

Só no `DartField`: `owner`, `origin` (`Body` ou `PrimaryConstructor`), `declaringParameter`, `isOverride`.
`final int a, b;` gera dois campos. Parâmetros `final`/`var` do primary constructor são campos com
`origin === DartFieldOrigin.PrimaryConstructor`.

## Métodos e funções

`DartMethod` (em classe) estende `DartFunction` (nível superior):

| Propriedade | O que é |
| --- | --- |
| `memberKind` | `Method`, `Getter`, `Setter`, `Operator` |
| `name`, `returnType`, `typeParameters`, `parameters` | operador: `name` é o símbolo (`==`, `[]`) |
| `asyncKind`, `isAsync`, `isGenerator` | `async`, `async*`, `sync*` |
| `bodyKind` | `Block`, `Arrow`, `None` (abstrato/external) |
| `body` | `DartBody` (calculado no primeiro acesso) |
| `signature` | assinatura em uma linha, sem o corpo |
| `isStatic`, `isAbstract`, `isExternal`, `isOverride` | `isOverride` é a anotação do **próprio** método |
| `isComplete` | a lista de parâmetros foi reconhecida |
| `line` / `nameLine` / `lineCount` | assinatura em várias linhas: `line` é o início, `nameLine` a linha do nome |

## Construtores e parâmetros

`DartConstructor`: `name` (`Foo` ou `Foo.fromJson`), `constructorName` (`fromJson` ou `null`), `isConst`,
`isFactory`, `isPrimary`, `isRedirecting`, `redirectTarget`, `parameters`, `initializers`
(`DartInitializer`: `fieldName`, `isSuperCall`, `isAssert`, `isRedirect`, `value`), `body`.

`DartParameter`: `name`, `publicName` (`this._repo` nomeado → `repo`), `type`, `kind`
(`RequiredPositional`, `OptionalPositional`, `Named`), `source` (`Plain`, `This`, `Super`, `Declaring`),
`isRequired`, `isFinal`, `defaultValue`, `isFunctionTyped`, `annotations`, `doc`.

## Tipos: `DartType`

| Propriedade / método | O que é |
| --- | --- |
| `kind` | `Named`, `Function` (`bool Function(int)`), `Record` (`(int, {String a})`) |
| `text` / `canonical` | original / uma linha no formato do `dart format` (`Map<String, dynamic>?`) |
| `name`, `prefix`, `typeArguments`, `builtin` | `p.User<T>` → `User`, `p`, `[T]`; `builtin` para tipos do `dart:core`/`dart:async` |
| `isNullable` / `nullability` | `?` escrito / `Nullable`, `NonNullable`, `Unknown` (`T`, `void`) |
| `isString`, `isBool`, `isInt`, `isDouble`, `isNum`, `isNumeric`, `isDateTime`, `isDynamic`, `isVoid`, `isObject` | atalhos (sempre `false` em Function/Record) |
| `isList`, `isMap`, `isSet`, `isIterable`, `isFuture`, `isFutureOr`, `isStream`, `isFunction`, `isRecord` | |
| `returnType`, `parameters`, `recordFields` | partes de Function e Record |
| `unwrapFuture()` | `Future<X>`/`FutureOr<X>` → `X` |
| `equals(outro)` | compara `canonical` (aceita texto) |
| `some(predicado)` | o tipo ou algum tipo dentro dele satisfaz |

Dart não tem `float`: ponto flutuante é `double` (`isDouble`).

## Corpos: statements, chamadas, closures, try/catch

`method.body`, `constructor.body`, `closure.body`, `catch.body` são `DartBody`:

| Propriedade | O que é |
| --- | --- |
| `kind`, `asyncKind`, `isAsync`, `isEmpty` | |
| `statements` | statements de nível 1 (`DartStatement`: `kind`, `children`, `expression`) |
| `expression` | no corpo `=>` |
| `calls` | todas as chamadas, inclusive dentro de closures (`call.insideClosure`) |
| `awaits` / `returns` | com `insideClosure` |
| `closures` | funções anônimas e funções locais (`name`, `parameters`, `isAsync`, `body`) |
| `tryStatements` | `DartTry` (`body`, `catches`, `finallyBody`); `DartCatch` (`onType`, `exceptionName`, `stackTraceName`, `isEmpty`, `body.comments`) |
| `localVariables` | `DartLocalVariable` (inclui `for (final x in xs)`) |
| `firstTopLevelReturnLine` | 1º `return` fora de closures |
| `references(nome)` | linhas onde o nome é usado (fora de strings/comentários) |
| `comments` | comentários dentro do corpo |

`DartCall`:

| Propriedade | `MediaQuery.of(context).size` | `_c..addListener(f)..dispose()` (o `dispose`) | `widget.ctrl?.dispose()` |
| --- | --- | --- | --- |
| `callee` | `MediaQuery.of` | `dispose` | `widget.ctrl.dispose` |
| `name` | `of` | `dispose` | `dispose` |
| `receiver` | `MediaQuery` | `null` | `widget.ctrl` |
| `isCascade` / `cascadeTarget` | `false` / `null` | `true` / `_c` | `false` / `null` |
| `isNullAware` | `false` | `false` | `true` |
| `postfixMember` | `size` | `null` | `null` |

Mais: `arguments` (`DartArgument`: `label`, `value`), `argument("children")`, `positionalArguments`,
`typeArguments`, `isConst` (`const Foo()`), `line`/`nameLine`. Comentários e strings nunca geram chamada;
declarações (`void helper() {}`, `Future<void> load()`) também não.

`DartExpression`: `kind` (`Call`, `ListLiteral`, `MapLiteral`, `SetLiteral`, `StringLiteral`,
`NumberLiteral`, `BoolLiteral`, `NullLiteral`, `Identifier`, `PropertyAccess`, `Closure`, `Conditional`,
`Other`), `call`, `elements` (itens de lista: `children: [...]`), `numberValue`, `strings`, `usesThis`
(usa `this`/`widget`), `compact` (texto em uma linha), `calls`.

## Strings, comentários e diretivas

`DartString`: `value` (sem aspas), `valueWithoutInterpolation` (interpolações viram espaços), `isRaw`,
`isMultiline`, `hasInterpolation`, `role`, `enclosingCallee` (`Text`, `print`, `RegExp`, `Key`...),
`argumentLabel` (`semanticsLabel`).

`role` (`DartStringRole`): `DirectiveUri`, `AnnotationArgument`, `MapKey` (`{'k': v}`, não confunde com
`c ? 'a' : 'b'`), `IndexKey` (`json['k']`), `CaseLabel`, `CallArgument`, `Value`.

`DartComment`: `kind` (`Line`, `Doc`, `Block`, `DocBlock`), `content` (sem marcadores), `isDoc`,
`isTrailing` (há código antes na linha), `directive` (`Ignore`, `IgnoreForFile`, `Todo`, `Fixme`,
`DangerIgnore`, `CoverageIgnore`, `Format`, `LanguageVersion`), `directiveArgs`.

`DartDoc` (em `node.doc`): `lines`, `content`, `macros`, `templates`, `isMacroOnly`.

Em toda declaração: `isIgnoredBy("nome-do-plugin", linhasAcima = 5)` — `// ignore: nome-do-plugin` ou
`// danger:ignore` acima da declaração (até N linhas) ou no fim da linha.

`DartDirective`: `kind`, `uri`, `uriKind` (`Dart`, `Package`, `Relative`), `packageName`, `packagePath`,
`prefix`, `show`, `hide`, `isDeferred`, `hasConfigurations`.

`DartIdentifier` (em `file.identifiers`): cada nome **declarado** (classe, campo, método, parâmetro,
variável local, catch...), com `kind` (`DartIdentifierKind`) e `ownerName`.

## Enums

String enums: o valor é o texto do código ou do caminho (`DartLayer.Domain === "domain"`). Em `.js`, dá
para comparar com a string; em `.ts`, o compilador aceita `layer === "domain"` e rejeita `"domian"`.
Plugin local em `.ts` pode **usar** os enums, mas não **declarar** um enum próprio (type stripping).

| Enum | Valores |
| --- | --- |
| `DartLayer` | Domain, Data, Presentation, Core |
| `DartLayerFolder` | Entities, Models, Repositories, UseCases, DataSources, Failures, ViewModels |
| `FileCategory` | Generated, Test, Dart, Config, Asset, Docs, Other |
| `GeneratedReason` | FileSuffix, Directory, GeneratedPart, GeneratedHeader |
| `Presence` | Present, Absent, Unknown |
| `Nullability` | Nullable, NonNullable, Unknown |
| `DartDeclarationKind` | Class, Enum, Mixin, Extension, ExtensionType, MixinApplication |
| `DartClassModifier` | Abstract, Base, Interface, Final, Sealed, Mixin |
| `DartMemberKind` | Field, Constructor, Method, Getter, Setter, Operator, Unknown |
| `DartFieldOrigin` | Body, PrimaryConstructor |
| `DartTypeKind` | Named, Function, Record |
| `DartBuiltinType` | String, Bool, Int, Double, Num, BigInt, DateTime, Duration, Uri, Object, Dynamic, Void, Never, Null, List, Map, Set, Iterable, Future, FutureOr, Stream, Function |
| `DartParameterKind` | RequiredPositional, OptionalPositional, Named |
| `DartParameterSource` | Plain, This, Super, Declaring |
| `DartBodyKind` | Block, Arrow, None |
| `DartAsyncKind` | Sync, Async, SyncStar, AsyncStar |
| `DartDirectiveKind` | Library, Import, Export, Part, PartOf |
| `DartUriKind` | Dart, Package, Relative |
| `DartCommentKind` | Line, Doc, Block, DocBlock |
| `DartCommentDirective` | Ignore, IgnoreForFile, Todo, Fixme, DangerIgnore, CoverageIgnore, Format, LanguageVersion |
| `DartStringRole` | DirectiveUri, AnnotationArgument, MapKey, IndexKey, CaseLabel, CallArgument, Value |
| `DartStatementKind` | Expression, VariableDeclaration, LocalFunction, Return, If, For, While, Do, Switch, Try, Throw, Rethrow, Yield, Break, Continue, Assert, Block, Empty |
| `DartExpressionKind` | Call, ListLiteral, MapLiteral, SetLiteral, StringLiteral, NumberLiteral, BoolLiteral, NullLiteral, Identifier, PropertyAccess, Closure, Conditional, Other |
| `DartIdentifierKind` | Class, Enum, EnumValue, Mixin, Extension, ExtensionType, Typedef, TypeParameter, Function, Method, Getter, Setter, Constructor, Field, TopLevelVariable, LocalVariable, LocalFunction, Parameter, CatchVariable |

## Receitas

**Arquivos de uma pasta, sem barrel:**

```typescript
const files = DartFile.changed().filter(
  (f) => f.path.inFolder(DartLayerFolder.Models) && !f.path.isBarrel
);
```

**Classes que estendem State:**

```typescript
for (const state of file.classes.filter((c) => c.extendsAny("State", "ViewState"))) { ... }
```

**Métodos públicos que não são override:**

```typescript
cls.methods.filter(
  (m) => m.memberKind === DartMemberKind.Method && !m.isPrivate && !m.isStatic && !m.isOverride
);
```

**Retorno `void`/`Future<void>`:**

```typescript
const returnsVoid = m.returnType?.unwrapFuture().isVoid ?? false;
```

**Chamadas de `print` (não `logger.print`, não em comentário):**

```typescript
file.calls().filter((c) => c.name === "print" && c.receiver === null && !c.isCascade);
```

**Catch vazio:**

```typescript
for (const fn of [...file.functions, ...file.classes.flatMap((c) => c.methods)]) {
  for (const t of fn.body?.tryStatements ?? []) {
    for (const c of t.catches) if (c.isEmpty && c.body.comments.length === 0) { ... }
  }
}
```

**Imports de outra camada:**

```typescript
for (const imp of file.imports) {
  if (imp.uriKind === DartUriKind.Package && imp.packagePath?.includes("/data/")) { ... }
}
```

**Só as linhas adicionadas no PR:**

```typescript
const file = await DartFile.readWithDiff(path);
for (const s of file.strings) if (file.isAdded(s.line)) { ... }
```

**Regra de ausência segura:**

```typescript
if (state.hasMember("dispose", DartMemberKind.Method) === Presence.Unknown) continue;
```

## Linhas e textos das mensagens

- `node.line`: linha que vai no comentário inline (o início do nó, sem doc e anotações).
- `node.nameLine`: linha do nome (diferente de `line` quando a declaração quebra linha).
- `node.lineText`: a linha `line` sem espaços nas pontas — o "código real" do `problem.wrong`.
- `node.text`: o texto original inteiro do nó (várias linhas).
- `file.snippet(de, até)`: linhas originais.

O padrão obrigatório das mensagens continua o mesmo (`sendFormattedFail`/`sendFormattedWarn`, código
real, correção, ação, objetivo, referência). Veja o CLAUDE.md.

## Como funciona por dentro

```
src/dart/
├── internal/lexer.ts     tokens (strings, interpolação, comentários aninhados, CRLF, BOM) e utilitários
├── internal/syntax.ts    classes/enums, membros, parâmetros, construtores (também usado pelo primary-constructors)
├── internal/toplevel.ts  nível superior: diretivas, mixin, extension, extension type, typedef, funções, variáveis
├── internal/pubspec.ts   pubspec.yaml mais próximo
├── enums.ts              todos os enums
├── path.ts               DartPath, DartPackage
├── type.ts               DartType
├── nodes.ts              anotações, docs, comentários, strings, parâmetros, variáveis, expressões, corpos
├── declarations.ts       DartClass e membros, funções, typedefs, diretivas
├── file.ts               DartFile (ponto de entrada, cache), DartIdentifier
└── index.ts              exportações públicas
```

- **Tokens, não linhas.** O lexer separa código, strings (com interpolação e aspas triplas) e comentários
  (inclusive aninhados). Tudo o que vem depois trabalha sobre tokens.
- **Preguiçoso.** Classes e membros são lidos no primeiro acesso; corpos (`body`), chamadas, strings e
  identificadores também. Ler um arquivo e olhar só `file.path` não faz parse.
- **Recuperação.** Um membro não reconhecido vira `DartUnknownMember` e a leitura continua no próximo `;`
  ou `}`; um trecho de nível superior vira `parseErrors`.
- **Cache.** `DartFile.read` guarda o modelo por caminho até o próximo `runPlugins`.
- **Desempenho.** O esfera inteiro (4.678 arquivos), com corpos, chamadas, strings e identificadores, leva
  cerca de 3 s.

Ao mudar o modelo: rode `npm test`, adicione o caso novo em `tests/dart-model.test.cjs` e valide os plugins
com o dry-run antes/depois (veja [Testando um plugin](../CLAUDE.md#testando-um-plugin)).
