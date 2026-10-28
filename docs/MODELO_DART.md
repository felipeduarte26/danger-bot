# Modelo Dart

Referência completa das classes que os plugins usam para ler código Dart: `DartFile`, `DartPath`,
`DartClass`, `DartField`, `DartMethod`, `DartCall`, `DartType` e as demais.

O modelo transforma um arquivo `.dart` numa árvore de objetos tipados. Um plugin não lê texto nem usa
regex para achar código: ele percorre essa árvore e faz perguntas como "esta classe estende `State`?",
"este campo é `final`?" ou "esta chamada é `MediaQuery.of(context).size`?". Cada arquivo é analisado
uma vez por execução, e todos os plugins compartilham o resultado.

> [!TIP]
> Este documento é a **referência** (o que existe e o que cada coisa faz). Para o **passo a passo** de
> criar um plugin, veja [CRIANDO_PLUGINS.md](CRIANDO_PLUGINS.md). Para ver o modelo de um arquivo real,
> rode `db inspect lib/caminho/arquivo.dart`.

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Conceitos que valem para todo nó](#2-conceitos-que-valem-para-todo-nó)
3. [Ler arquivos](#3-ler-arquivos)
4. [`DartFile`: o arquivo](#4-dartfile-o-arquivo)
5. [`DartPath` e `DartPackage`: o caminho](#5-dartpath-e-dartpackage-o-caminho)
6. [`DartClass`: classes, enums, mixins e extensions](#6-dartclass-classes-enums-mixins-e-extensions)
7. [Campos e variáveis](#7-campos-e-variáveis)
8. [Funções, métodos e construtores](#8-funções-métodos-e-construtores)
9. [`DartType`: tipos](#9-darttype-tipos)
10. [`DartBody`: corpos e statements](#10-dartbody-corpos-e-statements)
11. [Expressões e chamadas](#11-expressões-e-chamadas)
12. [Strings, comentários, documentação e anotações](#12-strings-comentários-documentação-e-anotações)
13. [Diretivas, identificadores e erros de leitura](#13-diretivas-identificadores-e-erros-de-leitura)
14. [`DartText`: utilitários de nomes](#14-darttext-utilitários-de-nomes)
15. [Enums](#15-enums)
16. [Cookbook](#16-cookbook)
17. [Mensagens: qual linha e qual texto usar](#17-mensagens-qual-linha-e-qual-texto-usar)
18. [O que o modelo garante](#18-o-que-o-modelo-garante)
19. [Perguntas frequentes](#19-perguntas-frequentes)
20. [Como funciona por dentro](#20-como-funciona-por-dentro)

---

## 1. Visão geral

### Mapa do modelo

```text
DartFile ─────────────────── um arquivo .dart (o ponto de entrada)
├── path: DartPath ──────────── só o caminho: camada, pasta, feature, teste, gerado, pacote
├── directives ──────────────── DartDirective: imports, exports, parts
├── declarations ────────────── DartClass: class, enum, mixin, extension, extension type
│   ├── fields ──────────────── DartField (também os do primary constructor)
│   ├── constructors ────────── DartConstructor ── parameters, initializers, body
│   ├── methods ─────────────── DartMethod ─────── parameters, returnType, body
│   └── enumValues ──────────── DartEnumValue
├── functions ───────────────── DartFunction (nível superior)
├── variables ───────────────── DartTopLevelVariable
├── typedefs ────────────────── DartTypedef
├── comments / strings ──────── DartComment / DartString
├── identifiers ─────────────── DartIdentifier (todo nome declarado)
└── calls() / closures() / tryStatements() / localVariables() ── o arquivo inteiro

DartBody ─────────────────── corpo de método, função, construtor, closure ou catch
├── statements ──────────────── DartStatement ── children: DartBody (blocos de if, for, try...)
├── calls ───────────────────── DartCall ── arguments: DartArgument ── value: DartExpression
├── closures ────────────────── DartClosure ── parameters, body
├── awaits / returns ────────── DartAwait / DartReturn
├── tryStatements ───────────── DartTry ── catches: DartCatch
└── localVariables ──────────── DartLocalVariable

DartType ─────────────────── o tipo escrito de um campo, parâmetro, retorno...
└── typeArguments, returnType, parameters, recordFields
```

### Um plugin em poucas linhas

```typescript
import { DartFile, DartLayerFolder, createPlugin, sendFormattedFail } from "@types";

export default createPlugin(
  { name: "entity-final-fields", description: "Campos de entity são final", enabled: true },
  async () => {
    for (const file of DartFile.changed()) {
      if (!file.path.inFolder(DartLayerFolder.Entities) || file.path.isBarrel) continue;

      for (const cls of file.classes) {
        for (const field of cls.fields) {
          if (field.isFinal || field.isStatic || field.isConst) continue;

          sendFormattedFail({
            title: "CAMPO MUTÁVEL EM ENTITY",
            description: `\`${field.name}\` em \`${cls.name}\` não é \`final\`.`,
            problem: { wrong: field.compact, correct: `final ${field.compact}` },
            action: { text: "Declare o campo como final:", code: `final ${field.compact}` },
            objective: "Entities **imutáveis**.",
            file: file.path.path,
            line: field.nameLine,
          });
        }
      }
    }
  }
);
```

### Onde fica e como importar

| Onde o plugin está                        | Import                                                        |
| ----------------------------------------- | ------------------------------------------------------------- |
| Neste pacote (`src/plugins/`)             | `import { DartFile, ... } from "@types";`                     |
| Plugin local do projeto (`local_plugins`) | `import { DartFile, ... } from "@felipeduarte26/danger-bot";` |

O código fica em [`src/dart/`](../src/dart/), e os testes em
[`tests/dart-model.test.cjs`](../tests/dart-model.test.cjs) (`npm test`).

---

## 2. Conceitos que valem para todo nó

Todo objeto do modelo que corresponde a um trecho do arquivo (classe, campo, chamada, string,
comentário...) é um **nó** e tem as propriedades abaixo.

### Posição

| Propriedade                 | O que é                                                                         | Para que serve                                                        |
| --------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `line`                      | Linha onde o nó começa (base 1). Nas declarações, **sem** a doc e as anotações. | A linha do comentário inline.                                         |
| `endLine`                   | Última linha do nó.                                                             | Saber o tamanho, mostrar um trecho com `file.snippet(line, endLine)`. |
| `column`                    | Coluna onde o nó começa (base 1).                                               | Raramente necessário.                                                 |
| `nameLine`                  | Só em declarações: linha do **nome**.                                           | Apontar o nome quando a declaração quebra linha.                      |
| `startLine`                 | Só em declarações: primeira linha **contando** doc e anotações.                 | Saber onde a declaração "começa de verdade".                          |
| `startOffset` / `endOffset` | Posição em caracteres no `file.source` (fim exclusivo).                         | Comparar posições entre nós.                                          |
| `contains(outro)`           | `true` se o nó `outro` está dentro deste.                                       | `method.contains(call)`, `cls.contains(string)`.                      |

Para esta declaração:

```dart
  /// Identificador.            ← linha 17 (startLine)
  @JsonKey(name: 'order_id')    ← linha 18
  final int id;                 ← linha 19 (line e nameLine)
```

`startLine === 17`, `line === 19` e `nameLine === 19`. Num método com a assinatura quebrada em várias
linhas, `line` é a primeira linha da assinatura e `nameLine` é a linha do nome.

### Texto

| Propriedade | O que é                                                                                      | Quando usar                                                         |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `text`      | O texto **original** do nó, com quebras de linha e comentários.                              | Mostrar o trecho como está no arquivo.                              |
| `lineText`  | A linha `line` inteira, sem espaços nas pontas.                                              | `problem.wrong` quando o problema cabe numa linha.                  |
| `compact`   | O nó **em uma linha**: sem comentários, sem quebras e sem a vírgula final do formato "tall". | `problem.wrong` quando o nó quebra linha, e para montar a correção. |

```dart
final size = MediaQuery.of(
  context,
).size;
```

Para a chamada `MediaQuery.of(...)`, `lineText` é `final size = MediaQuery.of(` e `compact` é
`MediaQuery.of(context)`. O `compact` é igual com qualquer formatação: é o texto certo para comparar e
para mostrar na mensagem.

### Desconhecido não é falso

Quando o código não diz algo, o modelo responde **desconhecido** e não "não":

| Situação                                            | Resposta                                                      |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `var x = 1;` / `final y = f();` (sem tipo escrito)  | `type === null`, `nullability === Nullability.Unknown`        |
| `T valor` (parâmetro de tipo)                       | `nullability === Nullability.Unknown`                         |
| Classe com trecho que o parser não reconheceu       | `hasMember(...) === Presence.Unknown`, `isComplete === false` |
| Método cuja lista de parâmetros não foi reconhecida | `isComplete === false`, `parameters` vazio                    |

Compare sempre com o valor explícito:

```typescript
if (field.nullability === Nullability.Nullable) {
  /* ... */
} // ✅ só os que têm `?`
if (!field.type?.isNullable) {
  /* ... */
} // ❌ inclui os sem tipo escrito
```

### Classe incompleta e trechos não reconhecidos

O modelo nunca lança exceção. Quando encontra algo que não reconhece (sintaxe nova, arquivo truncado),
ele registra o trecho e continua:

- dentro de uma classe, o trecho vira um `DartUnknownMember` em `cls.members`/`cls.unknownMembers`, e
  `cls.isComplete` fica `false`;
- no nível superior, vira um `DartParseError` em `file.parseErrors`.

Regras do tipo "falta X" só podem reportar quando a classe está completa: use
`cls.hasMember(...) === Presence.Absent`, que já leva isso em conta.

### Ordem e cache

- Toda lista vem **na ordem do arquivo**.
- Tudo é calculado no primeiro acesso: ler um arquivo e olhar só `file.path` não analisa o código.
- `DartFile.read(caminho)` guarda o modelo até o fim da execução. Vários plugins lendo o mesmo arquivo
  fazem um parse só.

### Comentários que desligam a regra

Toda declaração (classe, campo, método, construtor, função, parâmetro, valor de enum) tem
`isIgnoredBy(plugin, linhasAcima = 5)`. Ele devolve `true` quando há, até `linhasAcima` linhas acima
da declaração ou no fim da linha dela:

- `// ignore: nome-do-plugin` (também com várias regras: `// ignore: a, nome-do-plugin`);
- `// danger:ignore`.

```typescript
if (cls.isIgnoredBy("meu-plugin")) continue;
```

---

## 3. Ler arquivos

Métodos estáticos de `DartFile`:

| Método                                  | O que faz                                                                                                                                                                         | Quando usar                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `DartFile.changed(opções?)`             | Arquivos `.dart` **modificados e criados** no PR que existem no disco, já analisados. Sem testes e sem gerados por padrão. O `ignore_files` do `danger-bot.yaml` já foi aplicado. | Ponto de partida de quase todo plugin.                                                    |
| `DartFile.read(caminho)`                | Lê um arquivo qualquer (caminho relativo à raiz do projeto). Arquivo inexistente vem com `exists === false` e listas vazias.                                                      | Ler um arquivo que não está no PR (a interface de um repositório, o barrel de uma pasta). |
| `await DartFile.readWithDiff(caminho)`  | O mesmo que `read`, e também carrega as linhas adicionadas no PR (`addedLines`, `isAdded`).                                                                                       | Regras que olham só o que o PR adicionou.                                                 |
| `DartFile.fromSource(código, caminho?)` | Modelo a partir de um texto, sem disco e sem cache. O caminho (padrão `lib/memory.dart`) define camada, pasta e feature.                                                          | Testes e experimentos.                                                                    |
| `DartFile.clearCache()`                 | Limpa o cache de arquivos e caminhos.                                                                                                                                             | O `runPlugins` já chama no início de cada execução.                                       |

Opções do `changed`:

| Opção              | Padrão  | Efeito                                                                             |
| ------------------ | ------- | ---------------------------------------------------------------------------------- |
| `includeTests`     | `false` | Inclui `_test.dart` e a pasta de testes do pacote.                                 |
| `includeGenerated` | `false` | Inclui `.g.dart`, `.freezed.dart`, `generated/`...                                 |
| `createdFirst`     | `false` | Criados antes dos modificados. A ordem dos arquivos é a ordem das mensagens no PR. |

```typescript
for (const file of DartFile.changed()) {
  /* ... */
} // o caso comum
for (const file of DartFile.changed({ includeTests: true })) {
  /* ... */
} // regra que vale para testes
const contract = DartFile.read(
  "lib/features/order/domain/repositories/order_repository_interface.dart"
);
const withDiff = await DartFile.readWithDiff(file.path.path); // só linhas do PR
```

---

## 4. `DartFile`: o arquivo

### Conteúdo e linhas

| Membro                 | Tipo       | O que é                                                                                                      |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| `path`                 | `DartPath` | O caminho e os fatos dele ([seção 5](#5-dartpath-e-dartpackage-o-caminho)).                                  |
| `exists`               | `boolean`  | O arquivo existe no disco.                                                                                   |
| `source`               | `string`   | O conteúdo inteiro.                                                                                          |
| `lines`                | `string[]` | `source.split("\n")`: `lines[i]` é a linha `i + 1`.                                                          |
| `lineCount`            | `number`   | Quantidade de linhas.                                                                                        |
| `lineAt(linha)`        | `string`   | Texto original da linha (base 1, sem `trim`).                                                                |
| `snippet(de, até)`     | `string`   | Texto original das linhas `de` a `até` (inclusive).                                                          |
| `isCode(linha)`        | `boolean`  | A linha tem código. Linha vazia ou só de comentário dá `false`; linha dentro de string multilinha dá `true`. |
| `isCommentLine(linha)` | `boolean`  | A linha está dentro de um comentário e não tem código.                                                       |

### Linhas do PR (com `readWithDiff`)

| Membro           | Tipo                  | O que é                                                                                                                           |
| ---------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `addedLines`     | `ReadonlySet<number>` | Linhas adicionadas no PR. Vazio se o arquivo não veio de `readWithDiff`.                                                          |
| `isAdded(linha)` | `boolean`             | A linha foi adicionada no PR.                                                                                                     |
| `diffError`      | `string \| null`      | Por que o diff não foi lido (exceção do Danger ou diff ausente), ou `null`. Separa "o diff falhou" de "nenhuma linha adicionada". |

### Fatos do arquivo

| Membro                    | Tipo                      | O que é                                                                           |
| ------------------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `isGenerated`             | `boolean`                 | Código gerado: pelo caminho (`path.isGenerated`) **ou** pelo conteúdo.            |
| `generatedReason`         | `GeneratedReason \| null` | Por que é gerado: sufixo, pasta, `part 'x.g.dart'` ou cabeçalho `GENERATED CODE`. |
| `languageVersionOverride` | `string \| null`          | O `// @dart=3.x` do arquivo.                                                      |
| `partOf`                  | `string \| null`          | A URI ou o nome de `part of`, se o arquivo é parte de outro.                      |
| `isComplete`              | `boolean`                 | Todo o nível superior foi reconhecido e todas as classes estão completas.         |
| `parseErrors`             | `DartParseError[]`        | Trechos de nível superior não reconhecidos.                                       |

### Declarações

| Membro                                               | Tipo                     | O que é                                                                                                   |
| ---------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `declarations`                                       | `DartClass[]`            | Todas as declarações de tipo, na ordem.                                                                   |
| `classes`                                            | `DartClass[]`            | Só `class`: inclui `abstract`, `sealed`, `base`, `interface`, `final`, `mixin class` e mixin application. |
| `enums` / `mixins` / `extensions` / `extensionTypes` | `DartClass[]`            | Por tipo de declaração.                                                                                   |
| `functions`                                          | `DartFunction[]`         | Funções, getters e setters de nível superior.                                                             |
| `variables`                                          | `DartTopLevelVariable[]` | Variáveis de nível superior (`final a = 1, b = 2;` dá duas).                                              |
| `typedefs`                                           | `DartTypedef[]`          | `typedef`.                                                                                                |
| `findClass(nome)`                                    | `DartClass \| null`      | Declaração de tipo pelo nome.                                                                             |
| `declarationAt(linha)`                               | `DartClass \| null`      | Declaração que contém a linha.                                                                            |

### Texto, diretivas e nomes

| Membro                          | Tipo               | O que é                                           |
| ------------------------------- | ------------------ | ------------------------------------------------- |
| `directives`                    | `DartDirective[]`  | Todas as diretivas.                               |
| `imports` / `exports` / `parts` | `DartDirective[]`  | Por tipo.                                         |
| `comments`                      | `DartComment[]`    | Todos os comentários.                             |
| `strings`                       | `DartString[]`     | Todas as strings literais, com o papel (`role`).  |
| `identifiers`                   | `DartIdentifier[]` | Todo nome **declarado** no arquivo (não os usos). |

### O arquivo inteiro de uma vez

Estes métodos varrem tudo o que tem código: corpos de métodos, funções e construtores, inicializadores
de campos e variáveis, initializer lists, valores padrão de parâmetros e argumentos de valores de enum.

| Método             | Tipo                  | O que é                                                                                      |
| ------------------ | --------------------- | -------------------------------------------------------------------------------------------- |
| `calls()`          | `DartCall[]`          | Todas as chamadas. Não inclui anotações.                                                     |
| `closures()`       | `DartClosure[]`       | Todas as closures e funções locais, inclusive as de inicializadores (`final onTap = () {}`). |
| `tryStatements()`  | `DartTry[]`           | Todos os `try`.                                                                              |
| `localVariables()` | `DartLocalVariable[]` | Todas as variáveis locais.                                                                   |

> [!TIP]
> Use os métodos do arquivo quando a regra vale para o arquivo inteiro ("nenhum `print`"). Use
> `cls.calls()` ou `method.body.calls` quando a regra depende de onde a chamada está ("no `dispose`").

---

## 5. `DartPath` e `DartPackage`: o caminho

`DartPath` responde perguntas sobre o **caminho** de um arquivo, sem ler o conteúdo. Serve para
qualquer arquivo do PR, inclusive deletado ou que não é Dart. Use `file.path` num `DartFile`, ou
`DartPath.of(caminho)` para um caminho solto.

### Propriedades do caminho

Exemplo: `packages/app/lib/features/order/domain/usecases/get_order_usecase.dart`.

| Propriedade        | Valor no exemplo                                                               | O que é                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `path`             | o caminho inteiro                                                              | Como veio do Danger: relativo à raiz, com `/`.                                                               |
| `fileName`         | `get_order_usecase.dart`                                                       | Nome do arquivo.                                                                                             |
| `baseName`         | `get_order_usecase`                                                            | Nome sem a extensão. Em `user.g.dart`, `user`.                                                               |
| `extension`        | `.dart`                                                                        | Extensão simples.                                                                                            |
| `compoundSuffix`   | `null`                                                                         | Sufixo de gerado (`.g.dart`, `.freezed.dart`...) ou `null`.                                                  |
| `directory`        | `packages/app/lib/features/order/domain/usecases`                              | Pasta do arquivo.                                                                                            |
| `folderName`       | `usecases`                                                                     | Nome da pasta do arquivo.                                                                                    |
| `segments`         | `["packages", "app", "lib", "features", ...]`                                  | As pastas, em ordem.                                                                                         |
| `isDart`           | `true`                                                                         | Termina em `.dart`.                                                                                          |
| `isTest`           | `false`                                                                        | `_test.dart` ou dentro da pasta de testes do pacote ([veja](#qual-a-diferença-entre-istest-e-infoldertest)). |
| `isGenerated`      | `false`                                                                        | Sufixo de gerado ou pasta `generated/`, `.dart_tool/`, `build/`.                                             |
| `generatedReason`  | `null`                                                                         | `FileSuffix` ou `Directory`, só pelo caminho.                                                                |
| `isBarrel`         | `false`                                                                        | O nome do arquivo é igual ao nome da pasta (`models/models.dart`).                                           |
| `category`         | `FileCategory.Dart`                                                            | Categoria do arquivo no PR ([veja](#filecategory)).                                                          |
| `layer`            | `DartLayer.Domain`                                                             | Primeira camada no caminho, na ordem Domain, Data, Presentation, Core.                                       |
| `layerFolder`      | `DartLayerFolder.UseCases`                                                     | Pasta de papel mais próxima do arquivo.                                                                      |
| `feature`          | `order`                                                                        | O segmento depois de `features/`.                                                                            |
| `libRelativePath`  | `features/order/domain/usecases/get_order_usecase.dart`                        | O caminho depois de `lib/`.                                                                                  |
| `packageRootPath`  | `packages/app`                                                                 | O que vem antes de `lib/` (`""` na raiz).                                                                    |
| `expectedTestPath` | `packages/app/test/features/order/domain/usecases/get_order_usecase_test.dart` | Onde o teste deveria estar.                                                                                  |
| `package`          | `DartPackage`                                                                  | O pubspec mais próximo.                                                                                      |

### Métodos do caminho

| Método                               | O que faz                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DartPath.of(caminho)`               | O `DartPath` do caminho (com cache).                                                                                                                   |
| `inLayer(DartLayer.Domain)`          | `true` se o caminho tem `/domain/`.                                                                                                                    |
| `inFolder(DartLayerFolder.Entities)` | `true` se o caminho tem `/entities/`. Aceita qualquer nome de pasta: `inFolder("enums")`, `inFolder("test")`.                                          |
| `hasTest(arquivosDoPR?)`             | Existe teste para o arquivo: no `expectedTestPath` (no disco ou no PR) ou um `x_test.dart` com o mesmo nome em qualquer subpasta de `test/` do pacote. |
| `findTest(arquivosDoPR?)`            | O **caminho** desse teste, pela mesma regra, ou `null`.                                                                                                |

> [!IMPORTANT]
> Para **regras**, use `inLayer` e `inFolder`: são a busca exata pelo nome da pasta. `layer` e
> `layerFolder` escolhem **uma** camada ou pasta e servem para relatórios e textos.

### Constantes

| Constante            | Valor                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GENERATED_SUFFIXES` | `.g.dart`, `.freezed.dart`, `.mocks.dart`, `.mock.dart`, `.gr.dart`, `.gen.dart`, `.config.dart`, `.chopper.dart`, `.mapper.dart`, `.module.dart`, `.graphql.dart`, `.reflectable.dart`, `.tailor.dart` |
| `GENERATED_DIRS`     | `generated`, `.dart_tool`, `build`                                                                                                                                                                      |
| `TEST_DIRS`          | `test`, `integration_test`, `test_driver`                                                                                                                                                               |

### `DartPackage`

O pacote Dart de um arquivo: o `pubspec.yaml` mais próximo, subindo as pastas.

| Membro                           | O que é                                                |
| -------------------------------- | ------------------------------------------------------ |
| `name`                           | O `name:` do pubspec (`""` se não houver).             |
| `root` / `pubspecPath`           | Pasta do pubspec e caminho do arquivo (absolutos).     |
| `sdkMin`                         | Mínimo de `environment.sdk`, como `"3.13"`, ou `null`. |
| `languageVersion`                | `{ major, minor }` do SDK mínimo, ou `null`.           |
| `supportsLanguage(major, minor)` | `true` se o SDK mínimo é pelo menos `major.minor`.     |
| `DartPackage.of(caminho)`        | O pacote de um arquivo. Também em `file.path.package`. |
| `DartPackage.current()`          | O pacote do diretório atual (a raiz do projeto).       |

```typescript
// recurso que só existe a partir do Dart 3.13
if (!file.path.package?.supportsLanguage(3, 13)) continue;
```

---

## 6. `DartClass`: classes, enums, mixins e extensions

Uma `DartClass` representa qualquer declaração de tipo. O `kind` diz qual:

| `kind`                                 | Exemplo                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `DartDeclarationKind.Class`            | `class A {}`, `abstract class A {}`, `sealed class A {}`, `class const Point(int x);` |
| `DartDeclarationKind.Enum`             | `enum Status { active, inactive }`                                                    |
| `DartDeclarationKind.Mixin`            | `mixin Logger on Base {}`                                                             |
| `DartDeclarationKind.Extension`        | `extension StringX on String {}`                                                      |
| `DartDeclarationKind.ExtensionType`    | `extension type UserId(int value) {}`                                                 |
| `DartDeclarationKind.MixinApplication` | `class A = B with C;`                                                                 |

### Identidade

| Membro                                                      | O que é                                                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kind`                                                      | Tipo da declaração (tabela acima).                                                                                                               |
| `name`                                                      | Nome (`""` na extension sem nome).                                                                                                               |
| `isPrivate`                                                 | Começa com `_`.                                                                                                                                  |
| `header`                                                    | O cabeçalho em uma linha, sem o primary constructor: `final class OrderModel extends OrderEntity with EquatableMixin implements Serializable {`. |
| `typeParameters`                                            | `DartTypeParameter[]`: `class Box<T extends num>` → `T`, com `bound`.                                                                            |
| `annotations` / `hasAnnotation(nome)`                       | Anotações: `cls.hasAnnotation("immutable")`.                                                                                                     |
| `doc`                                                       | A documentação `///` acima ([`DartDoc`](#dartdoc)).                                                                                              |
| `line` / `nameLine` / `startLine` / `endLine` / `lineCount` | Posição e tamanho.                                                                                                                               |
| `hasBody`                                                   | Tem `{ ... }` (mixin application e `class X(...);` não têm).                                                                                     |
| `isIgnoredBy(plugin)`                                       | Comentário de ignore acima ou na linha ([seção 2](#comentários-que-desligam-a-regra)).                                                           |

### Modificadores

Todas as combinações da [referência do Dart](https://dart.dev/language/class-modifiers) são
reconhecidas, inclusive quebradas em várias linhas ou com comentários entre as palavras.

| Membro           | `true` em                                                           |
| ---------------- | ------------------------------------------------------------------- |
| `modifiers`      | Conjunto com todos os modificadores escritos (`DartClassModifier`). |
| `isAbstract`     | `abstract class`                                                    |
| `isBase`         | `base class`, `abstract base class`                                 |
| `isInterface`    | `interface class`, `abstract interface class`                       |
| `isFinal`        | `final class`                                                       |
| `isSealed`       | `sealed class`                                                      |
| `isMixinClass`   | `mixin class`                                                       |
| `isAugmentation` | `augment class`                                                     |

### Herança

| Membro                    | O que é                                                                 | Exemplo                                |
| ------------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| `superclass`              | `DartType` do `extends` (no mixin application, o tipo antes do `with`). | `State<OrderPage>`                     |
| `interfaces`              | Tipos do `implements`.                                                  | `[Serializable]`                       |
| `mixins`                  | Tipos do `with`.                                                        | `[EquatableMixin]`                     |
| `onTypes`                 | Tipos do `on` de um mixin.                                              | `mixin M on A, B` → `[A, B]`           |
| `extendedType`            | O tipo de uma extension ou extension type.                              | `extension X on String` → `String`     |
| `extendsAny(...nomes)`    | O nome do `extends` está na lista. Ignora os genéricos.                 | `cls.extendsAny("State", "ViewState")` |
| `implementsAny(...nomes)` | Algum `implements` tem o nome.                                          | `cls.implementsAny("Exception")`       |
| `mixesIn(...nomes)`       | Algum `with` tem o nome.                                                | `cls.mixesIn("ChangeNotifier")`        |

### Membros

| Membro                    | O que é                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `members`                 | Todos os membros na ordem: `DartField`, `DartConstructor`, `DartMethod` e `DartUnknownMember`. Use `memberKind` para distinguir. |
| `fields`                  | Campos do corpo **e** os parâmetros `final`/`var` do primary constructor (veja `origin`).                                        |
| `constructors`            | Construtores: o primary (se houver) e os do corpo, inclusive factories.                                                          |
| `primaryConstructor`      | O construtor do cabeçalho (`class const Point(final int x)`), ou `null`.                                                         |
| `methods`                 | Métodos, getters, setters e operadores (veja `memberKind`).                                                                      |
| `enumValues`              | Valores do enum ([`DartEnumValue`](#dartenumvalue)). Vazio nas outras declarações.                                               |
| `unknownMembers`          | Trechos do corpo que o parser não reconheceu.                                                                                    |
| `isComplete`              | `true` quando todo o corpo foi reconhecido (`unknownMembers` vazio).                                                             |
| `findField(nome)`         | Campo pelo nome, ou `null`.                                                                                                      |
| `findMethod(nome, kind?)` | Método pelo nome (e pelo `DartMemberKind`, para separar getter de setter), ou `null`.                                            |
| `findConstructor(nome)`   | Construtor pelo nome: `findConstructor("fromJson")`, `findConstructor(null)` para o sem nome.                                    |
| `hasMember(nome, kind?)`  | `Presence.Present`, `Absent` ou `Unknown` ([veja](#ausência-segura)).                                                            |
| `calls()`                 | Chamadas dentro da declaração (corpos, inicializadores, primary constructor).                                                    |
| `containsLine(linha)`     | A linha está dentro da declaração.                                                                                               |

#### Ausência segura

`hasMember` existe para regras do tipo "falta X":

| Resposta           | Quando                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `Presence.Present` | Existe um campo, método, getter, setter ou construtor com o nome.                               |
| `Presence.Absent`  | Não existe e a classe foi lida **por inteiro**.                                                 |
| `Presence.Unknown` | Não foi encontrado, mas a classe tem um trecho não reconhecido: não dá para afirmar a ausência. |

```typescript
if (state.hasMember("dispose", DartMemberKind.Method) !== Presence.Absent) continue; // só a ausência certa
```

#### Primary constructors (Dart 3.13)

O primary constructor já vem resolvido:

```dart
class const Point(final int x, var int y);
```

- `cls.fields` tem `x` e `y`, com `origin === DartFieldOrigin.PrimaryConstructor`. O `x` é `final` e o
  `y` é `var` (`isVar`).
- `cls.primaryConstructor` é o construtor (`isPrimary === true`, `isConst === true`).
- `cls.header` é `class Point {`, o cabeçalho clássico equivalente.

### `DartUnknownMember`

Trecho do corpo de uma classe que o parser não reconheceu. Tem `owner`, `line`, `text` e `compact`.
O plugin deve pular a classe ou tratá-la como incompleta.

### `DartEnumValue`

| Membro                                  | O que é                                                    |
| --------------------------------------- | ---------------------------------------------------------- |
| `name` / `owner`                        | Nome do valor e o enum.                                    |
| `arguments`                             | Argumentos do construtor do enum: `active('A')` → `['A']`. |
| `annotations` / `hasAnnotation` / `doc` | Como nas outras declarações: `@Deprecated('x') legacy`.    |

### `DartTypedef`

| Membro                    | O que é                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `name` / `typeParameters` | `typedef Mapper<T> = ...` → `Mapper`, `[T]`.                                 |
| `aliasedType`             | O tipo depois do `=`. Também na sintaxe antiga (`typedef void Cb(bool x);`). |

---

## 7. Campos e variáveis

`DartField` (campo), `DartTopLevelVariable` (nível superior) e `DartLocalVariable` (dentro de um corpo)
compartilham a base `DartVariable`.

### Propriedades comuns

| Membro                                                   | O que é                                                                    | Exemplo                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| `name` / `isPrivate`                                     | Nome e se começa com `_`.                                                  | `_cache`, `true`                   |
| `type`                                                   | `DartType` escrito, ou `null` quando não há tipo (`var x`, `final x = 1`). | `Map<String, int>`                 |
| `nullability`                                            | `Nullable`, `NonNullable` ou `Unknown` (sem tipo escrito).                 | `String?` → `Nullable`             |
| `isFinal` / `isConst` / `isLate` / `isVar`               | Modificadores escritos.                                                    | `late final` → `isLate && isFinal` |
| `isStatic` / `isCovariant` / `isExternal` / `isAbstract` | Modificadores escritos.                                                    | `static const kMax = 10;`          |
| `initializer`                                            | `DartExpression` depois do `=`, ou `null`.                                 | `const {}`                         |
| `annotations` / `hasAnnotation(nome)`                    | Anotações.                                                                 | `@JsonKey(name: 'order_id')`       |
| `doc`                                                    | Documentação `///`.                                                        |                                    |
| `trailingComment`                                        | Comentário `//` no fim da última linha da declaração.                      | `int x; // em reais`               |
| `isIgnoredBy(plugin)`                                    | Comentário de ignore.                                                      |                                    |

Uma declaração com vários nomes (`final int a, b;`) gera um objeto para cada nome.

### `DartField`

| Membro               | O que é                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `owner`              | A `DartClass` do campo.                                                                                  |
| `origin`             | `DartFieldOrigin.Body` (corpo da classe) ou `PrimaryConstructor` (parâmetro `final`/`var` do cabeçalho). |
| `declaringParameter` | O `DartParameter` do primary constructor que declara o campo.                                            |
| `isOverride`         | O campo tem `@override`.                                                                                 |
| `memberKind`         | Sempre `DartMemberKind.Field`.                                                                           |

### `DartTopLevelVariable`

Só as propriedades comuns: `const kTimeout = Duration(seconds: 30);` no nível superior.

### `DartLocalVariable`

Variável declarada dentro de um corpo. Nunca aparece em `cls.fields`.

| Membro              | O que é                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `isLoopVariable`    | Declarada no cabeçalho de um `for`: `for (final x in xs)`, `for (var i = 0; ...)` e o `for` de coleção (`[for (final x in xs) x]`). |
| `isPatternVariable` | Declarada por um pattern (tabela abaixo). Não tem `initializer`.                                                                    |
| `insideClosure`     | A closure (ou função local) mais interna que contém a variável, ou `null`.                                                          |

| Código                                              | Variáveis declaradas                           |
| --------------------------------------------------- | ---------------------------------------------- |
| `final (nome, idade) = registro;`                   | `nome`, `idade`                                |
| `var [primeiro, ...resto] = lista;`                 | `primeiro`, `resto`                            |
| `final Point(:x, y: py) = p;`                       | `x`, `py`                                      |
| `final {'k': v} = mapa;`                            | `v`                                            |
| `for (final (k, v) in pares)`                       | `k`, `v` (também `isLoopVariable`)             |
| `if (o case final String s)`                        | `s` (com `type` `String`)                      |
| `case Foo(:final id) when id > 0:`                  | `id`                                           |
| `Sucesso(:final dado) => dado,` (switch expression) | `dado`                                         |
| `case [a, b]:` / `case Status.ativo:`               | nenhuma: nome solto num `case` é uma constante |

As variáveis declaradas depois de `case X:` e `default:` num switch statement aparecem como
declarações comuns.

---

## 8. Funções, métodos e construtores

### `DartFunction` (nível superior) e `DartMethod` (em classe)

`DartMethod` estende `DartFunction`, então tudo abaixo vale para os dois.

| Membro                                                  | O que é                                                                | Exemplo                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `memberKind`                                            | `Method`, `Getter`, `Setter` ou `Operator`.                            | `bool get isEmpty` → `Getter`                              |
| `name`                                                  | Nome; no operador, o símbolo.                                          | `load`, `==`, `[]`                                         |
| `isPrivate`                                             | Começa com `_`.                                                        |                                                            |
| `signature`                                             | Assinatura em uma linha, sem o corpo.                                  | `Future<void> load(String id, [bool force = false]) async` |
| `returnType`                                            | `DartType` do retorno, ou `null` quando omitido.                       | `Future<void>`                                             |
| `typeParameters`                                        | Parâmetros de tipo.                                                    | `T first<T>(...)` → `[T]`                                  |
| `parameters`                                            | `DartParameter[]` (vazio no getter).                                   |                                                            |
| `isComplete`                                            | A lista de parâmetros foi reconhecida.                                 |                                                            |
| `asyncKind` / `isAsync` / `isGenerator`                 | `async`, `async*`, `sync*`.                                            | `isAsync` em `async` e `async*`                            |
| `isExternal`                                            | `external`.                                                            |                                                            |
| `bodyKind`                                              | `Block` (`{ }`), `Arrow` (`=>`) ou `None` (abstrato, external).        |                                                            |
| `body`                                                  | O [`DartBody`](#10-dartbody-corpos-e-statements), ou `null` sem corpo. |                                                            |
| `lineCount`                                             | Linhas da assinatura ao fim do corpo.                                  |                                                            |
| `annotations` / `hasAnnotation` / `doc` / `isIgnoredBy` | Como nas outras declarações.                                           |                                                            |

Só em `DartMethod`:

| Membro       | O que é                               |
| ------------ | ------------------------------------- |
| `owner`      | A classe do método.                   |
| `isStatic`   | `static`.                             |
| `isAbstract` | Sem corpo e sem `external`.           |
| `isOverride` | O **próprio** método tem `@override`. |

```typescript
// métodos públicos de instância que não são override
const publicMethods = cls.methods.filter(
  (m) => m.memberKind === DartMemberKind.Method && !m.isPrivate && !m.isStatic && !m.isOverride
);
```

### `DartConstructor`

| Membro                                 | O que é                                                                  | Exemplo                               |
| -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| `name`                                 | Como escrito.                                                            | `OrderModel`, `OrderModel.fromJson`   |
| `constructorName`                      | Só o nome depois do ponto, ou `null` no construtor sem nome.             | `fromJson`                            |
| `isConst` / `isFactory` / `isExternal` | Modificadores.                                                           |                                       |
| `isPrimary`                            | Declarado no cabeçalho da classe (Dart 3.13).                            | `class const Point(final int x)`      |
| `isRedirecting` / `redirectTarget`     | `: this.other(...)` ou `factory X() = Y;` (`redirectTarget === "Y"`).    |                                       |
| `parameters` / `isComplete`            | Parâmetros e se a lista foi reconhecida.                                 |                                       |
| `initializers`                         | Itens do initializer list ([`DartInitializer`](#dartinitializer)).       | `: assert(id > 0), _cache = const {}` |
| `body`                                 | Corpo `{ }` ou `=>` (factory), ou `null`.                                |                                       |
| `declaredFields`                       | Campos declarados pelos parâmetros `final`/`var` do primary constructor. |                                       |
| `owner` / `memberKind`                 | A classe e `DartMemberKind.Constructor`.                                 |                                       |

### `DartInitializer`

Cada item do initializer list.

| Membro        | O que é                                                    | `_cache = const {}` | `assert(id > 0)` |
| ------------- | ---------------------------------------------------------- | ------------------- | ---------------- |
| `fieldName`   | Campo atribuído, ou `null`.                                | `_cache`            | `null`           |
| `isAssert`    | É um `assert`.                                             | `false`             | `true`           |
| `isSuperCall` | É `super(...)`.                                            | `false`             | `false`          |
| `isRedirect`  | É `this.outro(...)`.                                       | `false`             | `false`          |
| `value`       | O valor atribuído ou a chamada inteira (`DartExpression`). | `const {}`          | `assert(id > 0)` |

### `DartParameter`

| Membro                                | O que é                                                                                                | Exemplo                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `name`                                | Como escrito.                                                                                          | `_repository`                             |
| `publicName`                          | O nome usado na chamada.                                                                               | nomeado `this._repository` → `repository` |
| `type`                                | `DartType`, ou `null` em `this.x`/`super.x` sem tipo e em parâmetro de closure sem tipo.               | `String`                                  |
| `nullability`                         | Como nas variáveis.                                                                                    |                                           |
| `kind`                                | `RequiredPositional`, `OptionalPositional` (`[x]`) ou `Named` (`{x}`).                                 |                                           |
| `source`                              | `Plain`, `This` (`this.x`), `Super` (`super.x`) ou `Declaring` (`final int x` no primary constructor). |                                           |
| `isRequired`                          | Posicional obrigatório, ou nomeado com `required`.                                                     |                                           |
| `isFinal` / `isCovariant`             | Modificadores escritos.                                                                                |                                           |
| `isFunctionTyped`                     | Sintaxe antiga de parâmetro função: `void callback(int x)`.                                            |                                           |
| `defaultValue`                        | `DartExpression` do valor padrão, ou `null`.                                                           | `[bool force = false]` → `false`          |
| `annotations` / `doc` / `isIgnoredBy` | Como nas outras declarações.                                                                           |                                           |

### `DartTypeParameter`

| Membro  | O que é                                                                                    |
| ------- | ------------------------------------------------------------------------------------------ |
| `name`  | `T`                                                                                        |
| `bound` | O `DartType` depois do `extends` (`T extends Comparable<T>` → `Comparable<T>`), ou `null`. |
| `line`  | Linha do nome.                                                                             |

---

## 9. `DartType`: tipos

Todo tipo escrito no código (de um campo, parâmetro, retorno, argumento de tipo, `on` de um catch...)
é um `DartType`.

### Propriedades do tipo

| Membro                      | O que é                                                                                     | `Map<String, int>?`   |
| --------------------------- | ------------------------------------------------------------------------------------------- | --------------------- |
| `kind`                      | `Named`, `Function` ou `Record`.                                                            | `Named`               |
| `text`                      | O texto original (pode ter quebras e comentários).                                          |                       |
| `canonical`                 | Uma linha, no formato do `dart format`. Duas grafias do mesmo tipo têm o mesmo `canonical`. | `Map<String, int>?`   |
| `name`                      | Nome do tipo (`null` em Function e Record).                                                 | `Map`                 |
| `prefix`                    | Prefixo de import: `p.User` → `p`.                                                          | `null`                |
| `typeArguments`             | Argumentos de tipo.                                                                         | `[String, int]`       |
| `isNullable`                | Tem `?` escrito.                                                                            | `true`                |
| `nullability`               | Veja a tabela abaixo.                                                                       | `Nullable`            |
| `builtin`                   | O tipo do `dart:core`/`dart:async`, pelo nome (`DartBuiltinType`), ou `null`.               | `DartBuiltinType.Map` |
| `line`                      | Linha onde o tipo começa.                                                                   |                       |
| `returnType` / `parameters` | Só em Function: retorno e parâmetros (`DartFunctionTypeParameter`).                         |                       |
| `recordFields`              | Só em Record: os campos (`DartRecordField`).                                                |                       |

| Tipo escrito                    | `nullability` |
| ------------------------------- | ------------- |
| `String?`, `dynamic`, `Null`    | `Nullable`    |
| `String`, `List<int>`           | `NonNullable` |
| `T` (parâmetro de tipo), `void` | `Unknown`     |

### Atalhos

Todos devolvem `false` em tipos Function e Record.

| Atalho                                                 | `true` para                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `isString` / `isBool` / `isInt` / `isDouble` / `isNum` | O tipo correspondente. Dart não tem `float`: ponto flutuante é `double`. |
| `isNumeric`                                            | `int`, `double` ou `num`.                                                |
| `isDateTime` / `isDynamic` / `isVoid` / `isObject`     | O tipo correspondente.                                                   |
| `isList` / `isMap` / `isSet` / `isIterable`            | Coleções.                                                                |
| `isFuture` / `isFutureOr` / `isStream`                 | Assíncronos.                                                             |
| `isFunction`                                           | Tipo de função escrito com `Function(...)` (`kind === Function`).        |
| `isRecord`                                             | Record (`kind === Record`).                                              |

### Métodos do tipo

| Método            | O que faz                                                                            | Exemplo                             |
| ----------------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| `unwrapFuture()`  | `Future<X>` e `FutureOr<X>` → `X`; outro tipo devolve ele mesmo.                     | `returnType?.unwrapFuture().isVoid` |
| `equals(outro)`   | Compara o `canonical`. Aceita texto.                                                 | `type.equals("List<int>")`          |
| `some(predicado)` | O tipo ou algum tipo dentro dele (argumentos, retorno, parâmetros, record) satisfaz. | `type.some((t) => t.isDynamic)`     |

### Tipos de função e records

```dart
final bool Function(int index, {required String label}) filter;
final (int, {String name}) pair;
```

- `filter.type.kind === DartTypeKind.Function`, `returnType.isBool === true`, e `parameters` tem `index`
  (`RequiredPositional`) e `label` (`Named`, `isRequired`). O `isBool` do tipo de função é `false`.
- `pair.type.kind === DartTypeKind.Record`, e `recordFields` tem um campo posicional (`name === null`) e
  `name` (`isNamed`).

| `DartFunctionTypeParameter`                                                       | `DartRecordField`                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `name` (`null` em `void Function(int)`), `type`, `kind`, `isRequired`, `nameLine` | `name` (`null` no posicional), `type`, `isNamed`, `nameLine` |

---

## 10. `DartBody`: corpos e statements

`method.body`, `function.body`, `constructor.body`, `closure.body` e `catch.body` são `DartBody`.

### `DartBody`

| Membro                                       | O que é                                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kind`                                       | `Block` (`{ }`), `Arrow` (`=>`) ou `None`.                                                                                                             |
| `asyncKind` / `isAsync`                      | Como na função.                                                                                                                                        |
| `statements`                                 | Statements de primeiro nível do bloco ([`DartStatement`](#dartstatement)). Vazio no `=>`.                                                              |
| `expression`                                 | A expressão do corpo `=>`, ou `null` no bloco.                                                                                                         |
| `isEmpty`                                    | Bloco sem nenhum statement. Comentários não contam.                                                                                                    |
| `comments`                                   | Comentários dentro do corpo.                                                                                                                           |
| `calls`                                      | **Todas** as chamadas, inclusive aninhadas e dentro de closures.                                                                                       |
| `awaits`                                     | Todos os `await` (`DartAwait`).                                                                                                                        |
| `returns`                                    | Todos os `return` (`DartReturn`: `isEmpty` em `return;`).                                                                                              |
| `closures`                                   | Todas as closures e funções locais, inclusive aninhadas.                                                                                               |
| `tryStatements`                              | Todos os `try`, inclusive aninhados e em closures.                                                                                                     |
| `localVariables`                             | Todas as variáveis locais, inclusive em blocos internos, closures, `for` e patterns.                                                                   |
| `firstTopLevelReturnLine`                    | Linha do primeiro `return` fora de closures, ou `null`.                                                                                                |
| `references(nome, { includeMemberAccess? })` | Linhas onde o nome é usado (fora de strings e comentários). Por padrão `x.nome` não conta; com `includeMemberAccess: true`, conta (`context.mounted`). |
| `memberAccesses(alvo)`                       | Acessos `alvo.membro` e `alvo?.membro` (também `this.alvo.membro`), com a linha.                                                                       |

```typescript
body.references("mounted"); // [12]      → `if (!mounted) return;`
body.references("mounted", { includeMemberAccess: true }); // [10, 12]  → também `context.mounted`
body.memberAccesses("context"); // [{ member: "mounted", line: 10 }, ...]
```

### Dentro ou fora de uma closure

As listas do corpo (`calls`, `awaits`, `returns`, `tryStatements`, `localVariables`) incluem o que está
dentro de closures. Cada item tem `insideClosure`: a closure mais interna que o contém, ou `null`
quando está no próprio corpo.

```dart
Future<void> save() async {
  await repository.save();                  // await: insideClosure === null
  button.onPressed = () => setState(() {}); // setState: insideClosure === a closure () => ...
}
```

```typescript
const ownAwaits = body.awaits.filter((a) => a.insideClosure === null); // só os do método
```

### `DartStatement`

| Membro       | O que é                                                                                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`       | `DartStatementKind`: `Expression`, `VariableDeclaration`, `LocalFunction`, `Return`, `If`, `For`, `While`, `Do`, `Switch`, `Try`, `Throw`, `Rethrow`, `Yield`, `Break`, `Continue`, `Assert`, `Block` ou `Empty`. |
| `children`   | Os blocos filhos (`DartBody`): o corpo do `if` e do `else`, do `for`, do `try`...                                                                                                                                 |
| `expression` | A expressão de um statement `Expression`, `Return` ou `Throw` (sem o `;`).                                                                                                                                        |

```typescript
// statements de um corpo, descendo nos blocos internos
const all = (stmts: readonly DartStatement[]): DartStatement[] =>
  stmts.flatMap((s) => [s, ...all(s.children.flatMap((c) => c.statements))]);
```

### `DartClosure`

Função anônima (`(x) => ...`, `() async { }`) ou função local (`void validar() { }`).

| Membro                  | O que é                                                   |
| ----------------------- | --------------------------------------------------------- |
| `name`                  | Nome da função local, ou `null` na anônima.               |
| `parameters`            | `DartParameter[]`.                                        |
| `typeParameters`        | `<T>(T valor) => valor`, `T primeiro<T>(List<T> xs) { }`. |
| `returnType`            | Tipo de retorno escrito da função local, ou `null`.       |
| `asyncKind` / `isAsync` | Como na função.                                           |
| `body`                  | O `DartBody`.                                             |

### `DartTry` e `DartCatch`

| `DartTry`       | O que é                                  |
| --------------- | ---------------------------------------- |
| `body`          | O bloco do `try`.                        |
| `catches`       | Os `DartCatch`, em ordem.                |
| `finallyBody`   | O bloco do `finally`, ou `null`.         |
| `insideClosure` | A closure que contém o `try`, ou `null`. |

| `DartCatch`                        | O que é                                                              | `on FormatException catch (e, s) { }` |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------- |
| `onType`                           | O `DartType` do `on`, ou `null` em `catch (e)` puro.                 | `FormatException`                     |
| `exceptionName` / `stackTraceName` | Os nomes das variáveis.                                              | `e` / `s`                             |
| `body`                             | O bloco do catch.                                                    |                                       |
| `isEmpty`                          | Sem nenhum statement (comentários não contam: veja `body.comments`). | `true`                                |

---

## 11. Expressões e chamadas

### `DartExpression`

Uma expressão: inicializador, argumento, valor padrão, item de lista, corpo `=>`...

| Membro               | O que é                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `kind`               | `DartExpressionKind` (tabela abaixo).                                    |
| `call`               | A chamada, quando `kind === Call` (a mais externa: `a.b(c).d(e)` → `d`). |
| `elements`           | Itens de uma lista ou set literal (`children: [...]`).                   |
| `numberValue`        | O valor de um `NumberLiteral` (`-8.5` → `-8.5`), ou `null`.              |
| `strings`            | As strings de um `StringLiteral` (`'a' 'b'` → duas).                     |
| `usesThis`           | Usa `this` ou `widget` (identificador solto, não `x.widget`).            |
| `calls` / `closures` | Chamadas e closures dentro da expressão, inclusive aninhadas.            |
| `compact`            | O texto em uma linha.                                                    |

| `kind`                                                            | Exemplo                                |
| ----------------------------------------------------------------- | -------------------------------------- |
| `Call`                                                            | `Text('x')`, `repository.fetch(id)`    |
| `ListLiteral` / `MapLiteral` / `SetLiteral`                       | `[a, b]`, `{'k': v}`, `{a, b}`         |
| `StringLiteral` / `NumberLiteral` / `BoolLiteral` / `NullLiteral` | `'x'`, `8.5`, `true`, `null`           |
| `Identifier`                                                      | `valor`                                |
| `PropertyAccess`                                                  | `widget.controller.text` (sem chamada) |
| `Closure`                                                         | `(x) => x * 2`                         |
| `Conditional`                                                     | `cond ? a : b`                         |
| `Other`                                                           | o resto (operações, casts...)          |

### `DartCall`

Uma chamada: função, método, construtor (`Text(...)`) ou cascata (`..dispose()`).

| Membro                        | `MediaQuery.of(context).size` | `_controller..stop()..dispose()` (o `dispose`) | `widget.controller?.dispose()` |
| ----------------------------- | ----------------------------- | ---------------------------------------------- | ------------------------------ |
| `callee`                      | `MediaQuery.of`               | `dispose`                                      | `widget.controller.dispose`    |
| `name`                        | `of`                          | `dispose`                                      | `dispose`                      |
| `receiver`                    | `MediaQuery`                  | `null`                                         | `widget.controller`            |
| `isCascade` / `cascadeTarget` | `false` / `null`              | `true` / `_controller`                         | `false` / `null`               |
| `isNullAware`                 | `false`                       | `false`                                        | `true`                         |
| `postfixMember`               | `size`                        | `null`                                         | `null`                         |

| Membro                | O que é                                                    |
| --------------------- | ---------------------------------------------------------- |
| `arguments`           | Todos os argumentos (`DartArgument`), em ordem.            |
| `argument(rótulo)`    | Argumento nomeado: `call.argument("children")`, ou `null`. |
| `positionalArguments` | Só os posicionais, em ordem.                               |
| `typeArguments`       | `foo<int>()` → `[int]`.                                    |
| `isConst`             | `const Foo()` / `new Foo()`.                               |
| `insideClosure`       | A closure mais interna que contém a chamada, ou `null`.    |
| `line` / `nameLine`   | Início da chamada (o receptor) e linha do nome chamado.    |

Comentários e strings nunca geram chamada. Declarações também não: `void helper() {}` e
`Future<void> load()` não são chamadas.

### `DartArgument`

| Membro  | O que é                                                |
| ------- | ------------------------------------------------------ |
| `label` | O rótulo: `height: 8` → `height`; posicional → `null`. |
| `value` | A `DartExpression` do valor.                           |

```typescript
// Column(children: [...]): os itens da lista
const items = call.argument("children")?.value.elements ?? [];
const sizedBoxes = items.filter((item) => item.call?.name === "SizedBox");
```

---

## 12. Strings, comentários, documentação e anotações

### `DartString`

Cada string literal do código. Em `'a' 'b'`, cada pedaço é uma `DartString`.

| Membro                            | O que é                                                                | `Text('Total: $valor', semanticsLabel: 'x')` (a 1ª) |
| --------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| `value`                           | O conteúdo, sem `r` e sem as aspas (escapes mantidos).                 | `Total: $valor`                                     |
| `valueWithoutInterpolation`       | O conteúdo com cada `$x`/`${...}` trocado por espaços (mesmo tamanho). | `Total:` e 7 espaços                                |
| `hasInterpolation`                | Tem `$x` ou `${...}`.                                                  | `true`                                              |
| `isRaw` / `isMultiline` / `quote` | `r'...'`, aspas triplas, `'` ou `"`.                                   | `false` / `false` / `'`                             |
| `role`                            | O papel sintático (tabela abaixo).                                     | `CallArgument`                                      |
| `enclosingCallee`                 | A chamada que recebe a string.                                         | `Text`                                              |
| `argumentLabel`                   | O rótulo do argumento.                                                 | `null` (na 2ª: `semanticsLabel`)                    |

| `role`               | Exemplo                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `DirectiveUri`       | `import 'package:app/x.dart';`                                                                  |
| `AnnotationArgument` | `@JsonKey(name: 'order_id')`                                                                    |
| `MapKey`             | `{'nome': valor}`, inclusive depois de `if`/`for` de coleção. Não confunde com `c ? 'a' : 'b'`. |
| `IndexKey`           | `json['id']`, `json?['id']`                                                                     |
| `CaseLabel`          | `case 'ativo':`                                                                                 |
| `CallArgument`       | `Text('Olá')`, `print('x')`, `assert(ok, 'mensagem')`                                           |
| `Value`              | O resto: valor de variável, retorno, item de lista...                                           |

O `role` só é atribuído quando a sintaxe não deixa dúvida; senão vem `Value`.

### `DartComment`

| Membro          | O que é                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `kind`          | `Line` (`//`), `Doc` (`///`), `Block` (`/* */`) ou `DocBlock` (`/** */`).                           |
| `content`       | O texto sem os marcadores e sem espaços nas pontas. `// TODO(ana): remover` → `TODO(ana): remover`. |
| `isDoc`         | `///` ou bloco de documentação.                                                                     |
| `isTrailing`    | Há código antes do comentário na mesma linha.                                                       |
| `directive`     | Se é uma instrução para ferramenta (tabela abaixo), ou `null`.                                      |
| `directiveArgs` | Os argumentos da diretiva: `// ignore: a, b` → `["a", "b"]`.                                        |

| `directive`                | Comentário                                       |
| -------------------------- | ------------------------------------------------ |
| `Ignore` / `IgnoreForFile` | `// ignore: regra` / `// ignore_for_file: regra` |
| `Todo` / `Fixme`           | `// TODO ...` / `// FIXME ...`                   |
| `DangerIgnore`             | `// danger:ignore`                               |
| `CoverageIgnore`           | `// coverage:ignore-line` e afins                |
| `Format`                   | `// dart format off` / `on`                      |
| `LanguageVersion`          | `// @dart=3.x`                                   |

### `DartDoc`

A documentação logo acima de uma declaração (`node.doc`).

| Membro                 | O que é                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `lines` / `content`    | As linhas, sem os marcadores, e o texto completo unido por `\n`. |
| `comments`             | Os `DartComment` que formam a doc.                               |
| `macros` / `templates` | Os `{@macro nome}` usados e os `{@template nome}` definidos.     |
| `isMacroOnly`          | A doc é só um `{@macro x}`, sem texto próprio.                   |

### `DartAnnotation`

| Membro                           | O que é                    | `@p.JsonKey(name: 'id')`                   |
| -------------------------------- | -------------------------- | ------------------------------------------ |
| `name`                           | O último segmento do nome. | `JsonKey`                                  |
| `prefix`                         | O prefixo de import.       | `p`                                        |
| `arguments` / `argument(rótulo)` | Os argumentos.             | `argument("name")?.value.compact` → `'id'` |

---

## 13. Diretivas, identificadores e erros de leitura

### `DartDirective`

| Membro                             | O que é                                                          | `import 'package:app/features/order/order.dart' as order show OrderEntity;` |
| ---------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `kind`                             | `Import`, `Export`, `Part`, `PartOf` ou `Library`.               | `Import`                                                                    |
| `uri`                              | A URI sem aspas (em `part of nome;`, o nome).                    | `package:app/features/order/order.dart`                                     |
| `uriKind`                          | `Dart` (`dart:async`), `Package` ou `Relative` (`../x.dart`).    | `Package`                                                                   |
| `packageName` / `packagePath`      | O pacote e o caminho dentro dele.                                | `app` / `features/order/order.dart`                                         |
| `prefix`                           | O `as`.                                                          | `order`                                                                     |
| `show` / `hide`                    | Os nomes.                                                        | `["OrderEntity"]` / `[]`                                                    |
| `isDeferred` / `hasConfigurations` | `deferred as` / import condicional (`if (dart.library.io) ...`). | `false` / `false`                                                           |

### `DartIdentifier`

Cada nome **declarado** no arquivo (`file.identifiers`), na ordem: classes, campos, métodos,
parâmetros, variáveis locais, variáveis de `catch`, valores de enum...

| Membro      | O que é                                                                                                                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`      | O nome.                                                                                                                                                                                                                                                                      |
| `kind`      | `DartIdentifierKind`: `Class`, `Enum`, `EnumValue`, `Mixin`, `Extension`, `ExtensionType`, `Typedef`, `TypeParameter`, `Function`, `Method`, `Getter`, `Setter`, `Constructor`, `Field`, `TopLevelVariable`, `LocalVariable`, `LocalFunction`, `Parameter`, `CatchVariable`. |
| `ownerName` | A classe ou função onde foi declarado, ou `null` no nível superior.                                                                                                                                                                                                          |
| `line`      | A linha do nome.                                                                                                                                                                                                                                                             |

É a forma mais simples de verificar **nomes** (idioma, ortografia, convenção) sem percorrer cada tipo
de declaração.

### `DartParseError`

Trecho de nível superior que o parser não reconheceu (`file.parseErrors`): `line`, `text`, `compact` e
`message`.

---

## 14. `DartText`: utilitários de nomes

Métodos estáticos para trabalhar com identificadores.

| Método                              | Exemplo                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `DartText.splitWords(nome)`         | `getUserHTTPData` → `["get", "user", "http", "data"]`; `user_name` → `["user", "name"]` |
| `DartText.toSnakeCase(nome)`        | `UserEntity` → `user_entity`; `HTTPClient` → `http_client`                              |
| `DartText.toPascalCase(nome)`       | `user_entity` → `UserEntity`                                                            |
| `DartText.toCamelCase(nome)`        | `user_entity` → `userEntity`                                                            |
| `DartText.levenshtein(a, b)`        | Distância de edição: `levenshtein("color", "colour") === 1`                             |
| `DartText.stripAccents(texto)`      | `ação` → `acao`                                                                         |
| `DartText.isLikelyAcronym(palavra)` | `HTTP`, `CNPJ`, `ID` → `true`                                                           |

---

## 15. Enums

Todos são string enums: o valor é o texto que aparece no código ou no caminho
(`DartLayer.Domain === "domain"`). Em plugin local `.ts`, os enums do pacote podem ser **usados**, mas
não dá para **declarar** um enum próprio (o Node só remove os tipos).

### Caminho e arquivo

| Enum              | Valores                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DartLayer`       | `Domain`, `Data`, `Presentation`, `Core`: o nome da pasta da camada.                                                                                                                                                                 |
| `DartLayerFolder` | `Entities`, `Models`, `Repositories`, `UseCases` (`usecases`), `DataSources` (`datasources`), `Failures`, `ViewModels` (`viewmodels`): o nome **exato** da pasta. `usecase` no singular não é `UseCases`: use `inFolder("usecase")`. |
| `GeneratedReason` | `FileSuffix` (`.g.dart`...), `Directory` (`generated/`...), `GeneratedPart` (`part 'x.g.dart';`), `GeneratedHeader` (comentário `GENERATED CODE`).                                                                                   |

#### `FileCategory`

A categoria de um arquivo do PR (`path.category`), avaliada nesta ordem:

| Valor       | Arquivos                                                                                |
| ----------- | --------------------------------------------------------------------------------------- |
| `Generated` | `.g.dart`, `.freezed.dart`, `.mock.dart`, `.mocks.dart`                                 |
| `Test`      | `_test.dart`                                                                            |
| `Dart`      | outros `.dart`                                                                          |
| `Config`    | `pubspec.yaml`/`.lock`, `.gradle`, `Podfile`, `analysis_options`, `.env`, `.properties` |
| `Asset`     | imagens, fontes, `.json` e qualquer arquivo em `/assets/`                               |
| `Docs`      | `.md`, `.txt`, `README`, `CHANGELOG`, `LICENSE`                                         |
| `Other`     | o resto                                                                                 |

### Respostas

| Enum          | Valores                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `Presence`    | `Present`, `Absent`, `Unknown` (a classe tem trecho não reconhecido).   |
| `Nullability` | `Nullable`, `NonNullable`, `Unknown` (sem tipo escrito, `void` ou `T`). |

### Declarações e membros

| Enum                  | Valores                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `DartDeclarationKind` | `Class`, `Enum`, `Mixin`, `Extension`, `ExtensionType`, `MixinApplication`                          |
| `DartClassModifier`   | `Abstract`, `Base`, `Interface`, `Final`, `Sealed`, `Mixin`                                         |
| `DartMemberKind`      | `Field`, `Constructor`, `Method`, `Getter`, `Setter`, `Operator`, `Unknown`                         |
| `DartFieldOrigin`     | `Body`, `PrimaryConstructor`                                                                        |
| `DartParameterKind`   | `RequiredPositional`, `OptionalPositional` (`[x]`), `Named` (`{x}`)                                 |
| `DartParameterSource` | `Plain`, `This` (`this.x`), `Super` (`super.x`), `Declaring` (`final int x` no primary constructor) |
| `DartIdentifierKind`  | [seção 13](#dartidentifier)                                                                         |

### Tipos

| Enum              | Valores                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DartTypeKind`    | `Named` (`String`, `List<int>?`, `p.User`, `T`), `Function` (`bool Function(int)`), `Record` (`(int, String)`)                                                                                                |
| `DartBuiltinType` | `String`, `Bool`, `Int`, `Double`, `Num`, `BigInt`, `DateTime`, `Duration`, `Uri`, `Object`, `Dynamic`, `Void`, `Never`, `Null`, `List`, `Map`, `Set`, `Iterable`, `Future`, `FutureOr`, `Stream`, `Function` |

### Corpos e código

| Enum                 | Valores                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `DartBodyKind`       | `Block` (`{ }`), `Arrow` (`=>`), `None` (abstrato, `external`, `;`) |
| `DartAsyncKind`      | `Sync`, `Async`, `SyncStar` (`sync*`), `AsyncStar` (`async*`)       |
| `DartStatementKind`  | [seção 10](#dartstatement)                                          |
| `DartExpressionKind` | [seção 11](#dartexpression)                                         |

### Texto e diretivas

| Enum                   | Valores                                         |
| ---------------------- | ----------------------------------------------- |
| `DartStringRole`       | [seção 12](#dartstring)                         |
| `DartCommentKind`      | `Line`, `Doc`, `Block`, `DocBlock`              |
| `DartCommentDirective` | [seção 12](#dartcomment)                        |
| `DartDirectiveKind`    | `Library`, `Import`, `Export`, `Part`, `PartOf` |
| `DartUriKind`          | `Dart`, `Package`, `Relative`                   |

---

## 16. Cookbook

Cada exemplo do cookbook é uma função que recebe um `DartFile` e devolve os nós a reportar. No plugin, cada item
vira uma mensagem no [padrão obrigatório](CRIANDO_PLUGINS.md#5-monte-a-mensagem):

```typescript
for (const file of DartFile.changed()) {
  for (const field of mutableEntityFields(file)) {
    sendFormattedFail({
      /* title, description, problem, action, objective, reference */
      file: file.path.path,
      line: field.nameLine,
    });
  }
}
```

### Cookbook por objetivo

| Quero...                              | Exemplo                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Filtrar arquivos por camada ou pasta  | [1](#1-arquivos-de-uma-pasta-de-papel)                                   |
| Achar campos com um problema          | [2](#2-campo-mutável-em-entity)                                          |
| Exigir um membro sem falso positivo   | [3](#3-controller-sem-dispose)                                           |
| Trocar uma chamada por outra          | [4](#4-trocar-uma-api-por-outra)                                         |
| Olhar o que vem depois de uma chamada | [5](#5-propriedade-lida-logo-depois-da-chamada)                          |
| Analisar o fluxo de um método async   | [6](#6-setstate-depois-de-await-sem-mounted)                             |
| Achar `try`/`catch` em qualquer lugar | [7](#7-catch-vazio)                                                      |
| Verificar imports                     | [8](#8-domain-importando-flutter-ou-data)                                |
| Olhar só o que o PR adicionou         | [9](#9-texto-fixo-adicionado-no-pr)                                      |
| Verificar comentários                 | [10](#10-todo-sem-responsável)                                           |
| Verificar nomes                       | [11](#11-bool-com-nome-de-verbo) e [12](#12-variável-local-de-uma-letra) |
| Verificar tipos de retorno            | [13](#13-método-público-async-que-não-devolve-futurevoid)                |
| Olhar os argumentos de um widget      | [14](#14-sizedbox-entre-filhos-de-columnrow)                             |
| Respeitar `// ignore:`                | [15](#15-respeitar--ignore-do-plugin)                                    |
| Verificar se existe teste             | [16](#16-usecase-sem-teste)                                              |
| Depender da versão do Dart            | [17](#17-só-com-dart-313-ou-mais)                                        |
| Ler um arquivo que não está no PR     | [18](#18-implementação-que-não-segue-o-contrato)                         |

### 1. Arquivos de uma pasta de papel

**Objetivo:** os models do PR, sem barrel files.

```typescript
import { DartFile, DartLayerFolder } from "@types";

export function changedModels(): DartFile[] {
  return DartFile.changed().filter(
    (file) => file.path.inFolder(DartLayerFolder.Models) && !file.path.isBarrel
  );
}
```

- `DartFile.changed()` já tira testes e arquivos gerados.
- `inFolder` procura `/models/` no caminho: pega `lib/features/x/data/models/` e `lib/core/data/models/`.
- `isBarrel` tira o `models/models.dart`, que só reexporta.

### 2. Campo mutável em entity

**Objetivo:** campos de entity que não são `final`, inclusive os do primary constructor.

```typescript
import { DartField, DartFieldOrigin, DartFile, DartLayerFolder } from "@types";

export function mutableEntityFields(file: DartFile): DartField[] {
  if (!file.path.inFolder(DartLayerFolder.Entities) || file.path.isBarrel) return [];
  return file.classes.flatMap((cls) =>
    cls.fields.filter((field) => {
      if (field.isFinal || field.isConst || field.isStatic || field.isLate) return false;
      // no primary constructor, só `var int x` declara campo mutável
      return field.origin === DartFieldOrigin.Body || field.isVar;
    })
  );
}
```

- `cls.fields` já traz os campos do primary constructor (`origin === PrimaryConstructor`).
- Reporte em `field.nameLine` e mostre `field.compact` (a declaração em uma linha).

### 3. Controller sem `dispose`

**Objetivo:** `State` com um controller que nunca recebe `dispose()`, sem reportar classe que o
modelo não leu por inteiro.

```typescript
import { DartCall, DartField, DartFile, DartMemberKind, Presence } from "@types";

export function undisposedControllers(file: DartFile): DartField[] {
  const found: DartField[] = [];
  for (const state of file.classes.filter((c) => c.extendsAny("State"))) {
    const controllers = state.fields.filter((f) => f.type?.name?.endsWith("Controller") ?? false);
    if (controllers.length === 0) continue;

    const presence = state.hasMember("dispose", DartMemberKind.Method);
    if (presence === Presence.Unknown) continue; // classe incompleta: não dá para afirmar nada

    const disposeCalls: readonly DartCall[] =
      state.findMethod("dispose", DartMemberKind.Method)?.body?.calls ?? [];
    const disposed = (name: string) =>
      disposeCalls.some(
        (call) => call.name === "dispose" && (call.receiver === name || call.cascadeTarget === name)
      );
    found.push(...controllers.filter((field) => !disposed(field.name)));
  }
  return found;
}
```

- `hasMember` devolve `Unknown` quando a classe tem trecho não reconhecido: a regra pula.
- `receiver` pega `_controller.dispose()` e `_controller?.dispose()`; `cascadeTarget` pega
  `_controller..removeListener(f)..dispose()`.

### 4. Trocar uma API por outra

**Objetivo:** `Colors.white.withOpacity(0.5)` → `Colors.white.withValues(alpha: 0.5)`, com a
correção pronta.

```typescript
import { DartCall, DartFile } from "@types";

export function withOpacityCalls(
  file: DartFile
): { call: DartCall; wrong: string; fixed: string }[] {
  return file
    .calls()
    .filter((call) => call.name === "withOpacity" && call.receiver !== null)
    .map((call) => {
      const wrong = call.compact; // `Colors.white.withOpacity(0.5)`, mesmo quebrado em linhas
      return { call, wrong, fixed: wrong.replace(".withOpacity(", ".withValues(alpha: ") };
    });
}
```

- `receiver !== null` descarta uma função própria chamada `withOpacity(...)`.
- `call.compact` é o mesmo texto com qualquer formatação, então o `replace` sempre encontra o trecho.

### 5. Propriedade lida logo depois da chamada

**Objetivo:** `MediaQuery.of(context).size` e similares, que reconstroem o widget a cada mudança de
qualquer propriedade.

```typescript
import { DartCall, DartFile } from "@types";

const SPECIFIC: Record<string, string> = {
  size: "MediaQuery.sizeOf",
  padding: "MediaQuery.paddingOf",
  viewInsets: "MediaQuery.viewInsetsOf",
};

export function mediaQueryOf(file: DartFile): { call: DartCall; replacement: string }[] {
  return file.calls().flatMap((call) => {
    const property = call.postfixMember;
    if (call.callee !== "MediaQuery.of" || property === null || !(property in SPECIFIC)) return [];
    return [{ call, replacement: `${SPECIFIC[property]}(context)` }];
  });
}
```

- `postfixMember` é o membro acessado logo depois do `)`: `.size` → `size`.
- `callee` junta o receptor e o nome (`MediaQuery.of`), o que evita confundir com outro `of`.

### 6. `setState` depois de `await` sem `mounted`

**Objetivo:** em métodos async de um `State`, achar o `setState` que roda depois de um `await` sem
verificar `mounted` entre os dois.

```typescript
import { DartCall, DartFile } from "@types";

export function setStateAfterAwait(file: DartFile): DartCall[] {
  const found: DartCall[] = [];
  for (const state of file.classes.filter((c) => c.extendsAny("State"))) {
    for (const method of state.methods.filter((m) => m.isAsync)) {
      const body = method.body;
      if (!body) continue;
      const awaits = body.awaits.filter((a) => a.insideClosure === null).map((a) => a.line);
      const mountedLines = body.references("mounted", { includeMemberAccess: true });

      for (const call of body.calls) {
        if (call.name !== "setState" || call.receiver !== null || call.insideClosure !== null)
          continue;
        const lastAwait = Math.max(...awaits.filter((line) => line <= call.line));
        if (!Number.isFinite(lastAwait)) continue; // nenhum await antes
        const checked = mountedLines.some((line) => line >= lastAwait && line <= call.line);
        if (!checked) found.push(call);
      }
    }
  }
  return found;
}
```

- `insideClosure === null` separa o que é do método do que é de um callback.
- `references(..., { includeMemberAccess: true })` encontra `mounted` e `context.mounted`.
- O plugin `avoid-setstate-after-async` faz a versão completa (cada closure async é um escopo próprio).

### 7. Catch vazio

**Objetivo:** todo `catch` sem nenhum statement e sem comentário explicando, em qualquer lugar do
arquivo: métodos, construtores, funções e closures de inicializadores.

```typescript
import { DartCatch, DartFile } from "@types";

export function emptyCatches(file: DartFile): DartCatch[] {
  return file
    .tryStatements()
    .flatMap((t) => t.catches)
    .filter((c) => c.isEmpty && c.body.comments.length === 0);
}
```

- `file.tryStatements()` cobre o arquivo inteiro de uma vez, sem duplicar os `try` aninhados.
- `isEmpty` ignora comentários; `body.comments` deixa a decisão sobre eles com a regra.

### 8. Domain importando Flutter ou Data

**Objetivo:** a camada de domínio não pode depender de Flutter nem da camada de dados.

```typescript
import { DartDirective, DartFile, DartLayer, DartUriKind } from "@types";

export function forbiddenDomainImports(file: DartFile): DartDirective[] {
  if (!file.path.inLayer(DartLayer.Domain)) return [];
  return file.imports.filter((imp) => {
    if (imp.uriKind === DartUriKind.Package) {
      return imp.packageName === "flutter" || (imp.packagePath?.includes("/data/") ?? false);
    }
    return imp.uriKind === DartUriKind.Relative && imp.uri.includes("/data/");
  });
}
```

- `packageName` separa `package:flutter/...` do pacote do app; `packagePath` é o caminho dentro dele.
- Comentários nunca viram diretiva: um import comentado não é reportado.

### 9. Texto fixo adicionado no PR

**Objetivo:** texto fixo em `Text('...')`, só nas linhas que o PR adicionou.

```typescript
import { DartFile, DartString, DartStringRole } from "@types";

export async function hardcodedTexts(path: string): Promise<DartString[]> {
  const file = await DartFile.readWithDiff(path);
  if (file.diffError !== null) return []; // sem diff, não dá para saber o que é novo
  return file.strings.filter(
    (s) =>
      file.isAdded(s.line) &&
      s.role === DartStringRole.CallArgument &&
      s.enclosingCallee === "Text" &&
      s.argumentLabel === null && // o texto, não `semanticsLabel: '...'`
      !s.hasInterpolation &&
      s.value.trim().length > 0
  );
}
```

- `readWithDiff` lê o diff do Danger e já trata as diferenças do CI (prefixo `+`, `ln`/`ln2`).
- `role` e `enclosingCallee` dizem onde a string está, sem olhar o texto da linha.

### 10. TODO sem responsável

**Objetivo:** `// TODO` sem `(nome)` nem referência de issue.

```typescript
import { DartComment, DartCommentDirective, DartFile } from "@types";

const OWNER_OR_ISSUE = /^(TODO|FIXME)\s*\(\w+\)|#\d+|[A-Z]+-\d+/;

export function todosWithoutOwner(file: DartFile): DartComment[] {
  return file.comments.filter(
    (c) =>
      (c.directive === DartCommentDirective.Todo || c.directive === DartCommentDirective.Fixme) &&
      !OWNER_OR_ISSUE.test(c.content)
  );
}
```

- `directive` reconhece o TODO; um `"// TODO"` dentro de uma string nunca é comentário.
- A regex vale só para o **conteúdo** do comentário: é a regra, não a busca pelo código.

### 11. Bool com nome de verbo

**Objetivo:** campos e parâmetros `bool` cujo nome começa com verbo no imperativo (`load`, `show`),
em vez de `is`, `has`, `can`, `should`.

```typescript
import { DartField, DartFile, DartParameter, DartText } from "@types";

const IMPERATIVE = new Set(["load", "show", "enable", "disable", "use", "refresh", "allow"]);

export function badBoolNames(file: DartFile): (DartField | DartParameter)[] {
  const fields = file.classes.flatMap((c) => c.fields);
  const params = [
    ...file.functions.flatMap((f) => f.parameters),
    ...file.classes.flatMap((c) => [...c.methods, ...c.constructors]).flatMap((m) => m.parameters),
  ];
  return [...fields, ...params].filter(
    (node) => node.type?.isBool === true && IMPERATIVE.has(DartText.splitWords(node.name)[0] ?? "")
  );
}
```

- `type?.isBool === true` exclui quem não tem tipo escrito e tipos como `bool Function()`.
- `DartText.splitWords` divide `loadMore` em `["load", "more"]` e `_showAll` em `["show", "all"]`.

### 12. Variável local de uma letra

**Objetivo:** variáveis locais com nome de uma letra, exceto as de `for` (`i`, `j`) e os curingas.

```typescript
import { DartFile, DartLocalVariable } from "@types";

export function oneLetterLocals(file: DartFile): DartLocalVariable[] {
  return file
    .localVariables()
    .filter((v) => v.name.length === 1 && v.name !== "_" && !v.isLoopVariable);
}
```

- `file.localVariables()` inclui variáveis de patterns (`final (a, b) = ...`) e de closures de
  inicializadores.
- Para olhar **qualquer** nome declarado (classes, métodos, parâmetros...), use `file.identifiers`.

### 13. Método público async que não devolve `Future<void>`

**Objetivo:** em ViewModels, métodos públicos async devem devolver `Future<void>` e publicar o
resultado como estado.

```typescript
import { DartFile, DartLayerFolder, DartMemberKind, DartMethod } from "@types";

export function asyncMethodsWithResult(file: DartFile): DartMethod[] {
  if (!file.path.inFolder(DartLayerFolder.ViewModels)) return [];
  return file.classes
    .flatMap((c) => c.methods)
    .filter(
      (m) =>
        m.memberKind === DartMemberKind.Method &&
        m.isAsync &&
        !m.isPrivate &&
        !m.isOverride &&
        m.returnType !== null && // sem tipo escrito: não dá para afirmar
        !m.returnType.unwrapFuture().isVoid
    );
}
```

- `unwrapFuture()` transforma `Future<void>` em `void`, então `isVoid` responde a pergunta certa.
- `returnType === null` (omitido) é desconhecido, não errado.

### 14. `SizedBox` entre filhos de `Column`/`Row`

**Objetivo:** listas `children` que alternam widgets e `SizedBox` de espaçamento fixo, que podem usar
o parâmetro `spacing`.

```typescript
import { DartCall, DartExpressionKind, DartFile } from "@types";

export function spacingCandidates(file: DartFile): DartCall[] {
  return file.calls().filter((call) => {
    if (!["Column", "Row"].includes(call.name) || call.receiver !== null) return false;
    const children = call.argument("children")?.value;
    if (children?.kind !== DartExpressionKind.ListLiteral) return false;
    const gaps = children.elements.filter((e, i) => i % 2 === 1);
    return (
      gaps.length > 0 &&
      gaps.every((gap) => gap.call?.name === "SizedBox" && gap.call.arguments.length === 1)
    );
  });
}
```

- `argument("children")?.value.elements` dá os itens da lista, já separados.
- `item.call` é a chamada do item (`SizedBox(height: 8)`), com os argumentos dela.

### 15. Respeitar `// ignore:` do plugin

**Objetivo:** deixar o time desligar a regra numa declaração específica.

```typescript
import { DartClass, DartFile } from "@types";

export function classesToCheck(file: DartFile, plugin: string): DartClass[] {
  return file.classes.filter((cls) => !cls.isIgnoredBy(plugin));
}
```

```dart
// ignore: meu-plugin
class LegacyController { }
```

- Funciona em classe, campo, método, construtor, função, parâmetro e valor de enum.
- `// danger:ignore` desliga todas as regras na declaração.

### 16. Usecase sem teste

**Objetivo:** usecases do PR sem arquivo de teste, nem no disco nem no próprio PR.

```typescript
import { DartFile, DartLayerFolder, getAllChangedFiles } from "@types";

export function useCasesWithoutTest(): DartFile[] {
  const prFiles = getAllChangedFiles();
  return DartFile.changed().filter(
    (file) =>
      file.path.inFolder(DartLayerFolder.UseCases) &&
      !file.path.isBarrel &&
      file.path.findTest(prFiles) === null
  );
}
```

- `findTest` procura no `expectedTestPath`, nos arquivos do PR e por nome em qualquer subpasta de
  `test/`, inclusive em monorepo.
- `path.expectedTestPath` é o caminho para sugerir na mensagem.

### 17. Só com Dart 3.13 ou mais

**Objetivo:** sugerir um recurso da linguagem só para projetos que já podem usá-lo.

```typescript
import { DartClass, DartFile } from "@types";

export function primaryConstructorCandidates(file: DartFile): DartClass[] {
  if (!file.path.package?.supportsLanguage(3, 13)) return [];
  return file.classes.filter(
    (cls) => cls.primaryConstructor === null && cls.constructors.length === 1
  );
}
```

- `package` é o `pubspec.yaml` mais próximo do arquivo, também em monorepo.

### 18. Implementação que não segue o contrato

**Objetivo:** ler a interface de um repositório, que pode não estar no PR, e comparar com a
implementação.

```typescript
import { DartClass, DartFile, DartMemberKind, Presence } from "@types";

export function missingContractMethods(impl: DartClass, contractPath: string): string[] {
  const contract = DartFile.read(contractPath);
  if (!contract.exists) return [];
  const iface = contract.classes.find((c) => impl.implementsAny(c.name));
  if (!iface) return [];
  return iface.methods
    .filter((m) => m.memberKind === DartMemberKind.Method)
    .filter((m) => impl.hasMember(m.name, DartMemberKind.Method) === Presence.Absent)
    .map((m) => m.name);
}
```

- `DartFile.read` usa o mesmo cache dos outros plugins e nunca lança exceção (`exists === false`).

---

## 17. Mensagens: qual linha e qual texto usar

| O problema está em...      | `line`            | `problem.wrong`                                      |
| -------------------------- | ----------------- | ---------------------------------------------------- |
| Uma chamada                | `call.line`       | `call.compact` (ou `call.lineText` se cabe na linha) |
| Um campo ou variável       | `field.nameLine`  | `field.compact`                                      |
| Um método (assinatura)     | `method.nameLine` | `method.signature`                                   |
| Uma classe (estrutura)     | `cls.nameLine`    | `cls.header` + `// ...` + `}`                        |
| Uma string                 | `s.line`          | `s.lineText`                                         |
| Um comentário              | `comment.line`    | `comment.lineText`                                   |
| Um import                  | `imp.line`        | `imp.lineText`                                       |
| Um trecho de várias linhas | `node.line`       | `file.snippet(node.line, node.endLine)`              |
| O nome do arquivo          | `1`               | `file.path.fileName`                                 |

- O `title` da mensagem é fixo: é a chave do resumo. Dados variáveis vão na `description`.
- O `problem.correct` é o mesmo texto já corrigido: `wrong.replace(...)` sobre o `compact`.
- O padrão completo das mensagens está em [CRIANDO_PLUGINS.md](CRIANDO_PLUGINS.md#5-monte-a-mensagem).

---

## 18. O que o modelo garante

| Garantia                      | Na prática                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Linhas iguais às do arquivo   | `file.lines` é `source.split("\n")`, linhas começam em 1 e `node.lineText` é a linha sem espaços nas pontas.                      |
| Desconhecido nunca vira falso | Sem tipo escrito, `type === null` e `nullability === Unknown`.                                                                    |
| Ausência só com certeza       | `hasMember` só devolve `Absent` quando a classe foi lida por inteiro.                                                             |
| Sem sinônimos                 | `inFolder(DartLayerFolder.UseCases)` procura exatamente `/usecases/`.                                                             |
| Escopos separados             | `cls.fields` nunca tem variável local; locais estão em `body.localVariables`.                                                     |
| Nunca lança exceção           | Arquivo truncado, vazio ou com sintaxe nova devolve o que deu para reconhecer, e o resto vai para `unknownMembers`/`parseErrors`. |
| Não depende da formatação     | O mesmo código com 40, 80 ou 160 colunas dá os mesmos fatos.                                                                      |
| Fatos, não decisões           | O modelo diz o que o código **é**; listas de exceções, limites e severidade ficam no plugin.                                      |

O modelo é validado no esfera-web inteiro: os cerca de 4.700 arquivos (`lib/` e `test/`) são lidos sem
nenhum trecho não reconhecido, e os mesmos fatos saem do código reformatado em 40, 80 e 160 colunas.

---

## 19. Perguntas frequentes

### Por que `field.type` veio `null`?

Porque o campo não tem tipo escrito: `var x = 1`, `final y = f()`, `static const kMax = 10`. O modelo
não deduz tipos. A regra decide o que fazer com `null`, em geral pular.

### `hasMember` devolveu `Unknown`. E agora?

A classe tem um trecho que o parser não reconheceu (veja `cls.unknownMembers`), então não dá para
afirmar que o membro falta. Uma regra do tipo "falta X" não deve reportar nesse caso.

### Qual a diferença entre `body.calls`, `cls.calls()` e `file.calls()`?

| Fonte               | Chamadas                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| `method.body.calls` | Só as do corpo do método (inclusive em closures dele).                           |
| `cls.calls()`       | As de toda a declaração: corpos, inicializadores de campos, primary constructor. |
| `file.calls()`      | As do arquivo inteiro, inclusive fora de classes.                                |

### Qual a diferença entre `isTest` e `inFolder("test")`?

`isTest` é o arquivo de teste de verdade: `_test.dart` ou dentro da pasta de testes do pacote (`test/`,
`integration_test/`, `test_driver/` fora de `lib/`). Uma pasta chamada `test` dentro de `lib/` (como
`lib/features/test/`) é código de produção. `inFolder("test")` é "qualquer `/test/` no caminho", sem
essa distinção.

### Qual a diferença entre `line` e `nameLine`?

`line` é onde o nó começa e `nameLine` é a linha do nome. Elas diferem quando a assinatura ou a
declaração quebra linha. Para apontar uma declaração, prefira `nameLine`.

### Qual a diferença entre `text`, `lineText` e `compact`?

`text` é o trecho original (pode ter várias linhas e comentários); `lineText` é a linha onde o nó
começa; `compact` é o nó em uma linha, igual com qualquer formatação. Para comparar e para montar a
correção, use `compact`.

### Como pego só o código que o PR adicionou?

Leia com `await DartFile.readWithDiff(caminho)` e filtre com `file.isAdded(node.line)`. Verifique
`file.diffError` para saber se o diff foi lido.

### O modelo não tem o que eu preciso. O que faço?

Acrescente no modelo, em `src/dart/`, com teste em `tests/dart-model.test.cjs`, e documente aqui. Não
contorne no plugin com regex ou contagem de chaves. O passo a passo está em
[CRIANDO_PLUGINS.md](CRIANDO_PLUGINS.md#quando-o-modelo-não-tem-o-que-você-precisa).

### Como vejo o que o modelo enxerga num arquivo?

```bash
db inspect lib/features/order/data/models/order_model.dart     # tudo
db inspect lib/x.dart --line 42                                # só o que está na linha 42
db inspect lib/x.dart --only calls,strings --json              # seções escolhidas, em JSON
```

---

## 20. Como funciona por dentro

```text
src/dart/
├── internal/lexer.ts     tokens: código, strings (com interpolação), comentários (inclusive aninhados)
├── internal/syntax.ts    classes, membros, parâmetros, construtores (também usado pelo primary-constructors)
├── internal/toplevel.ts  nível superior: diretivas, mixin, extension, extension type, typedef, funções
├── internal/pubspec.ts   pubspec.yaml mais próximo
├── enums.ts              todos os enums
├── path.ts               DartPath, DartPackage
├── type.ts               DartType
├── nodes.ts              anotações, docs, comentários, strings, parâmetros, variáveis, expressões, corpos
├── declarations.ts       DartClass e membros, funções, typedefs, diretivas
├── text.ts               DartText
├── file.ts               DartFile (entrada e cache), DartIdentifier
└── index.ts              exportações públicas
```

- **Tokens, não linhas.** O lexer separa código, strings e comentários, e tudo o que vem depois trabalha
  sobre os tokens. Por isso comentários e strings nunca são confundidos com código, e a quebra de linha
  não muda nada.
- **Sob demanda.** Classes e membros são lidos no primeiro acesso; corpos, chamadas, strings e
  identificadores também.
- **Recuperação.** Um membro não reconhecido vira `DartUnknownMember` e a leitura continua no próximo `;`
  ou `}`. Um trecho de nível superior vira `DartParseError`.
- **Desempenho.** O esfera inteiro, com corpos, chamadas, strings e identificadores, leva cerca de 3 s.
- **Membros `@internal`.** `file.lexed`, `rawMember`, `*Tok`, `*TokIndex` e afins são da implementação e
  podem mudar. O `npm run lint` barra o uso deles nos plugins.

Ao mudar o modelo: caso novo em `tests/dart-model.test.cjs`, `npm run build && npm test`, e a paridade
dos plugins ([tools/parity/](../tools/parity/README.md)).
