# Criando plugins Flutter

Guia de quem vai escrever ou alterar um plugin, do pacote ou local do projeto. Ele ensina **como montar
um plugin** sobre o modelo Dart. A lista completa de classes e propriedades está em
[MODELO_DART.md](MODELO_DART.md), e a forma das mensagens em
[GUIA_PLUGINS.md](GUIA_PLUGINS.md#padrao-de-mensagens-dos-plugins).

> **A regra:** todo plugin lê o código Dart pelo modelo (`DartFile`, `DartClass`, `DartCall`...). Não
> escreva parser próprio, regex para achar código nem função utilitária para ler Dart dentro do plugin.
> Se o modelo não tem o que a regra precisa, o modelo ganha a propriedade nova, com teste, e todos os
> plugins passam a usá-la ([veja como](#quando-o-modelo-não-tem-o-que-você-precisa)).
>
> O `npm run lint` faz valer a regra em `src/plugins/`: barra `split("\n")` no texto do arquivo,
> `readFileSync` de `.dart`, regex sobre `source`/`text`/`lineText`, contagem de `{`/`}`, membros
> `@internal` e os helpers legados ([veja](#o-lint-barra-o-padrão-antigo)).

## Sumário

- [A ideia](#a-ideia)
- [Passo a passo](#passo-a-passo)
- [Preciso de... → use](#preciso-de--use)
- [Antes × depois: o que não fazer](#antes--depois-o-que-não-fazer)
- [Regras que evitam falso positivo](#regras-que-evitam-falso-positivo)
- [Exemplos completos](#exemplos-completos)
- [Plugin local do projeto](#plugin-local-do-projeto)
- [Testando](#testando)
- [Quando o modelo não tem o que você precisa](#quando-o-modelo-não-tem-o-que-você-precisa)
- [Checklist de revisão](#checklist-de-revisão)

## A ideia

Um plugin tem três partes, sempre nesta ordem:

1. **Quais arquivos:** `DartFile.changed()` e filtros de caminho (`file.path.inLayer(...)`, `inFolder(...)`).
2. **A regra:** perguntas sobre fatos do modelo (`cls.fields`, `call.name`, `field.type?.isString`...).
3. **A mensagem:** `sendFormattedFail` (regra do time) ou `sendFormattedWarn` (heurística), com o código
   real, a correção, a ação, o objetivo e a referência.

```typescript
for (const file of DartFile.changed()) {
  // 1. arquivos
  if (!file.path.inFolder(DartLayerFolder.Entities)) continue;
  for (const cls of file.classes) {
    for (const field of cls.fields) {
      if (field.isFinal) continue; // 2. regra
      sendFormattedFail({ /* ... */ file: file.path.path, line: field.nameLine }); // 3. mensagem
    }
  }
}
```

O que o modelo já resolve para você:

- comentários e strings nunca são confundidos com código;
- quebras de linha e formatação não mudam nada (o mesmo arquivo com 40 ou 160 colunas dá os mesmos fatos);
- genéricos aninhados, records, tipos de função, primary constructors (Dart 3.13), patterns, cascatas
  (`..dispose()`), closures e funções locais;
- testes e arquivos gerados ficam de fora;
- cada arquivo é lido e analisado **uma vez por execução**, e todos os plugins compartilham o mesmo resultado.

## Passo a passo

### 1. Veja se a regra já existe

Confira a [lista de plugins](GUIA_PLUGINS.md#lista-completa-de-plugins). Uma regra parecida pode virar
um caso a mais num plugin existente, em vez de um plugin novo.

### 2. Gere o esqueleto

```bash
node bin/cli.js create-plugin      # dentro deste repositório
```

A CLI pergunta o **tipo de regra** e gera o `.ts` com o template dele, já sobre o modelo e no padrão
das mensagens:

| Tipo                    | O template                                                            | Troque                                                  |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| 1. Call                 | `file.calls()`: a chamada errada e a mesma chamada corrigida (`fail`) | `WRONG_CALL`, `RIGHT_CALL`                              |
| 2. Class/structure      | `file.classes` + `cls.hasMember(...) !== Presence.Absent` (`fail`)    | `TARGET_FOLDER`, `REQUIRED_MEMBER`, o membro de exemplo |
| 3. Text added in the PR | `readWithDiff` + `file.strings` + `isAdded` (`warn`)                  | `TARGET_CALLEE`, o valor da correção                    |
| 4. Path/file            | `file.path`: nome do arquivo na pasta de papel (`fail`)               | `TARGET_FOLDER`, `REQUIRED_SUFFIX`                      |

Ela também cria o `index.ts` e o README (com a severidade e o exemplo do tipo) e registra o plugin em
`src/index.ts`. Falta só colocá-lo num array de categoria. Troque as constantes e os textos de exemplo
pela regra real; o que ficar do exemplo vai para o PR.

### 3. Escolha a entrada

| A regra olha...            | Comece por                                                                | Exemplo de plugin                                |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| caminho ou nome do arquivo | `file.path` (`inLayer`, `inFolder`, `fileName`, `isBarrel`)               | file-naming, barrel-files-enforcer               |
| classes, campos, métodos   | `file.classes` → `cls.fields`, `cls.methods`, `cls.constructors`          | domain-entities, data-models                     |
| chamadas                   | `file.calls()` (ou `method.body.calls`)                                   | mediaquery-modern, print-statement-detector      |
| corpo de métodos           | `method.body` (`awaits`, `tryStatements`, `localVariables`, `statements`) | avoid-setstate-after-async, empty-catch-detector |
| imports                    | `file.imports` (`uriKind`, `packagePath`)                                 | clean-architecture                               |
| textos e comentários       | `file.strings`, `file.comments`                                           | spell-checker-ptbr, comments-checker             |
| nomes declarados           | `file.identifiers`                                                        | identifier-language, boolean-naming-convention   |
| só o que o PR adicionou    | `await DartFile.readWithDiff(caminho)` + `file.isAdded(linha)`            | spell-checker, comments-checker                  |

### 4. Escreva a regra sobre propriedades

Use as propriedades do modelo e deixe no plugin só o que é decisão do time: listas de nomes, limites,
exceções. Regex só no **conteúdo** da regra, aplicada a um fato do modelo: o formato de `field.name`,
o padrão de um segredo em `string.value`. Nunca use regex para **achar** código.

### 5. Monte a mensagem

| Campo             | De onde vem                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `title`           | Texto fixo em CAPS: é a chave do resumo, então nada variável aqui                         |
| `description`     | O porquê, citando o trecho (`` `${call.callee}()` ``)                                     |
| `problem.wrong`   | `node.lineText` (a linha real) ou `node.compact` (o nó em uma linha, quando quebra linha) |
| `problem.correct` | O mesmo código corrigido: `wrong.replace(...)`                                            |
| `action`          | `text` (o que fazer) + `code` (a correção pronta, obrigatório)                            |
| `objective`       | O benefício em uma frase                                                                  |
| `reference`       | Link oficial (dart.dev, docs.flutter.dev, api.flutter.dev, linter rules)                  |
| `file` / `line`   | `file.path.path` e `node.line` (ou `node.nameLine` para apontar o nome da declaração)     |

Severidade:

- `sendFormattedFail` quando a regra é padrão do time; o `fail` reprova o PR;
- `sendFormattedWarn` quando é heurística e pode errar;
- `sendMarkdown`/`sendMessage` para relatório ou informação.

### 6. README, registro e CHANGELOG

- README do plugin: `## O que verifica`, `## Severidade`, `## Exemplo` (❌/✅), `## Referências`.
- Entrada em `## [Não publicado]` no [CHANGELOG](../CHANGELOG.md). Uma regra nova que reprova diz isso no item.
- Siga a [checklist de entrega do CLAUDE.md](../CLAUDE.md#checklist-de-entrega-plugin-novo-ou-alterado):
  tabelas do README e do GUIA_PLUGINS, contagem de plugins, array de categoria.

### 7. Teste

Teste o caso que deve ser reportado **e** o que não deve. Veja [Testando](#testando).

## Preciso de... → use

### Arquivos e caminhos

| Preciso de                              | Use                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `.dart` do PR, sem testes e sem gerados | `DartFile.changed()`                                                                              |
| incluir testes / gerados                | `DartFile.changed({ includeTests: true, includeGenerated: true })`                                |
| criados antes dos modificados           | `DartFile.changed({ createdFirst: true })`                                                        |
| um arquivo qualquer                     | `DartFile.read(caminho)` (nunca lança exceção; `file.exists`)                                     |
| camada                                  | `file.path.inLayer(DartLayer.Domain)` (= `includes("/domain/")`)                                  |
| pasta de papel                          | `file.path.inFolder(DartLayerFolder.UseCases)` ou `inFolder("enums")`                             |
| nome do arquivo / sem extensão          | `file.path.fileName` / `file.path.baseName`                                                       |
| barrel file                             | `file.path.isBarrel`                                                                              |
| feature                                 | `file.path.feature` (`lib/features/<feature>/...`)                                                |
| é teste / é gerado                      | `path.isTest` / `path.isGenerated` (qualquer `/test/` no caminho: `inFolder("test")`)             |
| arquivo que não é `.dart`               | `DartPath.of(caminho)` (só o caminho, sem ler)                                                    |
| teste do arquivo                        | `path.hasTest(getAllChangedFiles())` / `path.findTest(...)` (o caminho) / `path.expectedTestPath` |
| versão do SDK do pacote                 | `file.path.package?.supportsLanguage(3, 13)`                                                      |

### Classes

| Preciso de                            | Use                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| classes / enums / mixins / extensions | `file.classes`, `file.enums`, `file.mixins`, `file.extensions` (`file.declarations` = todas) |
| uma classe pelo nome                  | `file.findClass("OrderModel")`                                                               |
| a classe de uma linha                 | `file.declarationAt(linha)`                                                                  |
| herança                               | `cls.extendsAny("State", "ViewState")`, `cls.implementsAny(...)`, `cls.mixesIn(...)`         |
| superclasse com genéricos             | `cls.superclass` (`DartType`: `name`, `typeArguments`)                                       |
| modificadores                         | `cls.isAbstract`, `isSealed`, `isFinal`, `isBase`, `isInterface`, `isMixinClass`             |
| anotação                              | `cls.hasAnnotation("immutable")`                                                             |
| cabeçalho em uma linha                | `cls.header` (`final class Foo extends Bar {`, também com primary constructor)               |
| membro existe?                        | `cls.hasMember("dispose", DartMemberKind.Method)` → `Present` / `Absent` / `Unknown`         |
| membro pelo nome                      | `cls.findField("x")`, `cls.findMethod("build")`, `cls.findConstructor("fromJson")`           |
| chamadas dentro da classe             | `cls.calls()`                                                                                |
| a classe foi toda reconhecida?        | `cls.isComplete`                                                                             |
| ignorada por comentário               | `cls.isIgnoredBy("meu-plugin")` (`// ignore: meu-plugin` ou `// danger:ignore`)              |

### Campos, variáveis e parâmetros

| Preciso de                                | Use                                                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| campos (inclusive do primary constructor) | `cls.fields` (`field.origin`: `Body` ou `PrimaryConstructor`)                                                                                         |
| tipo escrito                              | `field.type` (`null` sem tipo); `field.type?.isString`, `isBool`, `isList`, `isFuture`...                                                             |
| nulo?                                     | `field.nullability === Nullability.Nullable` (há também `NonNullable` e `Unknown`)                                                                    |
| modificadores                             | `isFinal`, `isLate`, `isConst`, `isStatic`, `isPrivate`                                                                                               |
| valor inicial                             | `field.initializer` (`DartExpression`: `kind`, `call`, `numberValue`, `compact`)                                                                      |
| variáveis de nível superior               | `file.variables`                                                                                                                                      |
| variáveis locais                          | `body.localVariables` ou `file.localVariables()` (todas do arquivo)                                                                                   |
| local de `for` / de pattern               | `local.isLoopVariable` / `local.isPatternVariable` (`final (a, b) = ...`, `case Foo(:final x)`)                                                       |
| parâmetros                                | `method.parameters` (`kind`: `RequiredPositional`, `OptionalPositional`, `Named`; `isRequired`, `type`, `defaultValue`, `source`: `This`, `Super`...) |

### Métodos, funções e tipos

| Preciso de                    | Use                                                                    |
| ----------------------------- | ---------------------------------------------------------------------- |
| métodos / getters / setters   | `cls.methods` (`memberKind`: `Method`, `Getter`, `Setter`, `Operator`) |
| funções de nível superior     | `file.functions`                                                       |
| override                      | `method.isOverride` (a anotação do próprio método)                     |
| async                         | `method.isAsync`, `method.asyncKind`                                   |
| retorno `void`/`Future<void>` | `method.returnType?.unwrapFuture().isVoid`                             |
| assinatura em uma linha       | `method.signature`                                                     |
| comparar tipos                | `type.equals("Map<String, dynamic>")`, `type.canonical`                |
| procurar dentro do tipo       | `type.some((t) => t.isDynamic)`                                        |

### Corpos

| Preciso de                    | Use                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| chamadas                      | `body.calls` / `file.calls()` (`callee`, `name`, `receiver`, `arguments`, `argument("child")`)               |
| chamada em cascata            | `call.isCascade` + `call.cascadeTarget` (`_c..stop()..dispose()`)                                            |
| `MediaQuery.of(context).size` | `call.postfixMember === "size"`                                                                              |
| `await` / `return`            | `body.awaits`, `body.returns` (com `insideClosure`)                                                          |
| closures e funções locais     | `body.closures` / `file.closures()` (`parameters`, `isAsync`, `body`, `typeParameters`, `returnType`)        |
| try/catch                     | `body.tryStatements` / `file.tryStatements()` → `catches` (`isEmpty`, `onType`, `body.comments`)             |
| uso de um nome                | `body.references("mounted")` (linhas; `{ includeMemberAccess: true }` conta `context.mounted`)               |
| acessos `alvo.membro`         | `body.memberAccesses("context")` → `[{ member: "mounted", line }]`                                           |
| statements                    | `body.statements` (`kind`: `If`, `For`, `Return`, `VariableDeclaration`...; `children` para blocos internos) |
| um nó dentro de outro         | `method.contains(call)`                                                                                      |
| itens de `children: [...]`    | `call.argument("children")?.value.elements`                                                                  |

### Strings, comentários e imports

| Preciso de                  | Use                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| strings literais            | `file.strings` (`value`, `isRaw`, `isMultiline`, `hasInterpolation`, `valueWithoutInterpolation`)              |
| papel da string             | `s.role`: `DirectiveUri`, `AnnotationArgument`, `MapKey`, `IndexKey`, `CaseLabel`, `CallArgument`, `Value`     |
| dentro de qual chamada      | `s.enclosingCallee` (`"Text"`, `"print"`, `"assert"`) e `s.argumentLabel` (`semanticsLabel`)                   |
| comentários                 | `file.comments` (`content`, `isDoc`, `isTrailing`, `directive`: `Todo`, `Ignore`, `DangerIgnore`...)           |
| doc `///` de uma declaração | `node.doc` (`content`, `lines`)                                                                                |
| imports                     | `file.imports` (`uri`, `uriKind`: `Dart`/`Package`/`Relative`, `packageName`, `packagePath`, `prefix`, `show`) |
| nomes declarados            | `file.identifiers` (`kind`: `Class`, `Field`, `LocalVariable`, `Parameter`...)                                 |
| a linha é código?           | `file.isCode(linha)` / `file.isCommentLine(linha)`                                                             |

### PR e mensagem

| Preciso de                       | Use                                                                         |
| -------------------------------- | --------------------------------------------------------------------------- |
| só as linhas adicionadas         | `const file = await DartFile.readWithDiff(caminho)` + `file.isAdded(linha)` |
| o diff falhou?                   | `file.diffError` (`null` quando leu)                                        |
| outro plugin já cobre            | `isPluginActive("outro-plugin")`                                            |
| código real para `problem.wrong` | `node.lineText` (linha) ou `node.compact` (o nó em uma linha)               |
| linha do comentário inline       | `node.line` (início do nó) ou `node.nameLine` (linha do nome)               |
| trecho original                  | `node.text` / `file.snippet(de, até)`                                       |
| log de debug                     | `verboseLog(...)` (só com `-v` ou `settings.verbose`)                       |

## Antes × depois: o que não fazer

O código antigo dos plugins fazia isto. Não volte a fazer:

| ❌ Não faça                                                                      | ✅ Faça                                                                     |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `fs.readFileSync(f, "utf8")` + `split("\n")` para varrer código                  | `DartFile.read(f)` / `DartFile.changed()`                                   |
| `[...git.modified_files, ...git.created_files].filter(f => f.endsWith(".dart"))` | `DartFile.changed()`                                                        |
| `f.endsWith("_test.dart") \|\| /\.g\.dart$/.test(f)`                             | já excluídos pelo `changed()`; `path.isTest` / `path.isGenerated`           |
| `f.includes("/domain/")`                                                         | `file.path.inLayer(DartLayer.Domain)`                                       |
| `/class\s+(\w+)\s+extends\s+(\w+)/`                                              | `file.classes` → `cls.name`, `cls.superclass?.name`, `cls.extendsAny(...)`  |
| contar `{` e `}` para achar o fim de classe ou método                            | `cls.endLine`, `method.body`, `node.contains(...)`                          |
| `line.trim().startsWith("//")`                                                   | `file.isCode(linha)`, `file.comments`                                       |
| `/final\s+(\w+)\s+(\w+);/`                                                       | `cls.fields` (`type`, `name`, `isFinal`)                                    |
| `/print\(/.test(line)`                                                           | `file.calls().filter((c) => c.name === "print" && c.receiver === null)`     |
| `/(\w+)\.\.dispose\(\)/`                                                         | `call.isCascade && call.cascadeTarget === "_controller"`                    |
| `/'([^']*)'/g` para achar textos                                                 | `file.strings` (`value`, `role`, `enclosingCallee`)                         |
| `/import\s+'package:[^']*\/data\//`                                              | `file.imports` + `imp.packagePath?.includes("/data/")`                      |
| `/\bawait\b/` e procurar `mounted` nas linhas seguintes                          | `body.awaits` + `body.references("mounted", { includeMemberAccess: true })` |
| `normalizePrimaryConstructorHeaders(...)`                                        | `cls.fields`, `cls.header`, `cls.primaryConstructor`                        |
| ler `structuredDiffForFile` e tratar `+`, `ln`, `ln2`                            | `DartFile.readWithDiff(caminho)` + `file.isAdded(linha)`                    |
| `if (!field.type)` para "não tem tipo"                                           | `field.type === null` (e para nulidade, o enum `Nullability`)               |
| função utilitária de parse dentro do plugin                                      | propriedade nova no modelo (`src/dart/`), com teste                         |
| membros `@internal` (`file.lexed`, `rawMember`, `*TokIndex`)                     | a propriedade pública equivalente, ou uma nova no modelo                    |

### O lint barra o padrão antigo

O `npm run lint` (e o pre-push) reprova em `src/plugins/`:

- `split("\n")` sobre `source`/`text` e `readFileSync` com caminho variável (leia com `DartFile`);
- regex (`test`/`exec`/`match`/`search`) sobre `source`, `text` ou `lineText`;
- comparação com `"{"`/`"}"` (contagem de chaves);
- membros `@internal` (`lexed`, `raw`, `rawMember`, `*Tok`, `*TokIndex`...) e imports de `dart/internal`;
- os helpers legados (`getDartFiles`, `isInLayer`, `normalizePrimaryConstructorHeaders`...).

As regras ficam no `eslint.config.js`. O primary-constructors fica de fora, porque reescreve o código e
trabalha com os tokens. Quando o uso é legítimo, desligue a regra só naquela linha e escreva o motivo.
Exemplos: a saída do `flutter analyze`, um arquivo que não é Dart (`lcov.info`), regex no texto de um
comentário.

```typescript
// eslint-disable-next-line no-restricted-syntax -- lcov.info, não é código Dart
const lcovContent = fs.readFileSync(lcovPath, "utf-8");
```

## Regras que evitam falso positivo

**Desconhecido não é `false`.** Tipo não escrito (`var x = 1`, `final y = f()`) é `type === null` e
`nullability === Nullability.Unknown`. Compare com o enum, nunca com `!`:

```typescript
if (field.nullability !== Nullability.Nullable) continue; // ✅ Unknown não vira "não nulo"
if (!field.type?.isNullable) {
  /* ... */
} // ❌ sem tipo escrito cai aqui
```

**Ausência só com certeza.** Regra do tipo "falta X" só reporta com `Presence.Absent`. Um trecho que o
parser não reconheceu deixa a classe incompleta e a resposta vira `Unknown`:

```typescript
if (cls.hasMember("dispose", DartMemberKind.Method) !== Presence.Absent) continue; // Present ou Unknown
```

**Escopo.** `cls.fields` nunca tem variável local; locais ficam em `body.localVariables`. Chamadas,
`await`, `return` e `try` dentro de closures têm `insideClosure`. Um `setState` dentro de um callback não
é do método:

```typescript
const awaits = body.awaits.filter((a) => a.insideClosure === null);
```

**Título fixo.** O `title` agrupa o resumo (`**TÍTULO** — N ocorrência(s)`). Nome de classe, arquivo
ou número no título quebra o agrupamento; dados variáveis vão na `description`.

**A linha certa.** `node.line` é onde o nó começa (sem doc e anotações) e `node.nameLine` é a linha do
nome. Numa declaração em várias linhas, aponte o nome. `node.lineText` é sempre a linha `line`; quando
a chamada ou a declaração quebra linha, mostre `node.compact`.

**Exclusões.** `DartFile.changed()` já tira testes e gerados. Barrel files (`file.path.isBarrel`) e
`// ignore: meu-plugin` (`node.isIgnoredBy("meu-plugin")`) ficam por conta da regra.

**Não dependa da formatação.** Se a regra muda de resultado quando o arquivo passa no `dart format`, ela
está lendo texto em vez de fatos.

## Exemplos completos

### Chamada com correção mecânica (fail)

Exemplo didático: `Color.withOpacity()` está obsoleto desde o Flutter 3.27.

```typescript
/**
 * Color WithOpacity
 * `withOpacity(x)` está obsoleto (Flutter 3.27): use `withValues(alpha: x)`.
 * Só chamadas com receptor (`Colors.white.withOpacity`), não um método próprio com o mesmo nome.
 */
import { DartFile, createPlugin, sendFormattedFail } from "@types";

export default createPlugin(
  {
    name: "color-with-opacity",
    description: "Troca withOpacity() por withValues(alpha:)",
    enabled: true,
  },
  async () => {
    for (const file of DartFile.changed()) {
      for (const call of file.calls()) {
        if (call.name !== "withOpacity" || call.receiver === null) continue;

        // o nó em uma linha: igual com a chamada quebrada em várias linhas
        const wrong = call.compact; // Colors.white.withOpacity(0.5)
        const fixed = wrong.replace(".withOpacity(", ".withValues(alpha: ");

        sendFormattedFail({
          title: "WITHOPACITY OBSOLETO — USE WITHVALUES",
          description: `\`${call.receiver}.withOpacity()\` está **obsoleto** e perde precisão de cor.`,
          problem: { wrong, correct: fixed },
          action: { text: "Substitua por:", code: fixed },
          objective: "Usar a API atual de cores, sem perda de precisão.",
          reference: {
            text: "Color.withValues",
            url: "https://api.flutter.dev/flutter/dart-ui/Color/withValues.html",
          },
          file: file.path.path,
          line: call.line,
        });
      }
    }
  }
);
```

### Regra estrutural com ausência segura (fail)

```typescript
/**
 * Model FromJson
 * Todo model público e concreto da pasta models/ tem `fromJson`.
 * Classe com trecho não reconhecido (Presence.Unknown) não é reportada.
 */
import { DartFile, DartLayerFolder, Presence, createPlugin, sendFormattedFail } from "@types";

export default createPlugin(
  { name: "model-from-json", description: "Models têm fromJson", enabled: true },
  async () => {
    for (const file of DartFile.changed()) {
      if (!file.path.inFolder(DartLayerFolder.Models) || file.path.isBarrel) continue;

      for (const cls of file.classes) {
        if (cls.isAbstract || cls.isPrivate || cls.isIgnoredBy("model-from-json")) continue;
        if (cls.hasMember("fromJson") !== Presence.Absent) continue;

        const factory = `  factory ${cls.name}.fromJson(Map<String, dynamic> json) => ${cls.name}(/* ... */);`;
        sendFormattedFail({
          title: "MODEL SEM FROMJSON",
          description: `\`${cls.name}\` não tem \`fromJson\`: a conversão do JSON fica espalhada pelo código.`,
          problem: {
            wrong: `${cls.header}\n  // ...\n}`,
            correct: `${cls.header}\n${factory}\n}`,
          },
          action: { text: "Adicione o construtor:", code: factory.trim() },
          objective: "Centralizar a conversão do JSON no model.",
          reference: {
            text: "JSON and serialization",
            url: "https://docs.flutter.dev/data-and-backend/serialization/json",
          },
          file: file.path.path,
          line: cls.nameLine,
        });
      }
    }
  }
);
```

### Strings só nas linhas do PR (warn)

```typescript
/**
 * Hardcoded Text
 * Texto fixo em `Text('...')` adicionado no PR: sugere a tradução (l10n).
 * Heurística (warn): fora strings com interpolação e com rótulo (`semanticsLabel:`).
 */
import { DartFile, DartStringRole, createPlugin, sendFormattedWarn } from "@types";

export default createPlugin(
  { name: "hardcoded-text", description: "Texto fixo em Text()", enabled: true },
  async () => {
    for (const changed of DartFile.changed()) {
      const file = await DartFile.readWithDiff(changed.path.path);

      for (const s of file.strings) {
        if (!file.isAdded(s.line)) continue; // só o que o PR adicionou
        if (s.role !== DartStringRole.CallArgument || s.enclosingCallee !== "Text") continue;
        if (s.argumentLabel !== null || s.hasInterpolation) continue;

        const wrong = s.lineText; // child: Text('Olá, mundo', style: s),
        const fixed = wrong.replace(s.text, "context.l10n.saudacao");

        sendFormattedWarn({
          title: "TEXTO FIXO NA TELA",
          description: `\`${s.text}\` está fixo no código e não é traduzido.`,
          problem: { wrong, correct: fixed },
          action: { text: "Mova o texto para o arquivo de tradução (.arb) e use:", code: fixed },
          objective: "Telas traduzíveis, com os textos num lugar só.",
          reference: {
            text: "Internationalizing Flutter apps",
            url: "https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization",
          },
          file: file.path.path,
          line: s.line,
        });
      }
    }
  }
);
```

Plugins reais para usar de modelo:

- [mediaquery-modern](../src/plugins/flutter/mediaquery-modern/mediaquery-modern.ts): chamadas e `postfixMember`;
- [domain-entities](../src/plugins/flutter/domain-entities/domain-entities.ts): regra estrutural;
- [avoid-setstate-after-async](../src/plugins/flutter/avoid-setstate-after-async/avoid-setstate-after-async.ts): corpo async, `insideClosure`;
- [empty-catch-detector](../src/plugins/flutter/empty-catch-detector/empty-catch-detector.ts): `try`/`catch`;
- [spell-checker-ptbr](../src/plugins/flutter/spell-checker-ptbr/spell-checker-ptbr.ts): strings e linhas do PR.

## Plugin local do projeto

O plugin local é o mesmo código, com três diferenças:

- importa de `"@felipeduarte26/danger-bot"` em vez de `"@types"`;
- fica no repositório do projeto, apontado em `local_plugins` no `danger-bot.yaml`, sem registro;
- em `.ts`, o Node só apaga os tipos:
  - os enums do pacote (`DartLayer.Domain`) funcionam, mas `enum` próprio, `namespace` e parameter properties não;
  - import relativo leva a extensão (`"./util.ts"`).

Detalhes em [CONFIGURACAO.md](CONFIGURACAO.md).

## Testando

### Explore o modelo de um arquivo

Antes de escrever a regra, veja o que o modelo entrega para um arquivo real. O `inspect` mostra cada
nó com a linha e as propriedades pelo nome exato da API:

```bash
db inspect lib/features/order/data/models/order_model.dart            # no projeto Flutter
db inspect lib/x.dart --line 42                                       # só o que está na linha 42
db inspect lib/x.dart --only calls,strings                            # só algumas seções
node bin/cli.js inspect ../esfera-web/lib/x.dart                      # neste repositório (rode o build antes)
```

```text
file.calls() — 6
  L29       DateTime.parse(json['holiday_date'] as String)
            callee=DateTime.parse  name=parse  receiver=DateTime  arguments=[…]
file.strings — 10
  L29       'holiday_date'
            value=holiday_date  role=indexKey
```

Para saber qual propriedade usar, procure o fato na saída: a chamada que a regra pega (`name`,
`receiver`), o papel da string (`role`), o tipo do campo (`type`, `nullability`). Seções, opções e JSON:
[CLI.md](CLI.md#danger-bot-inspect). Para um trecho avulso, use `DartFile.fromSource(codigo,
"lib/features/x/data/models/x.dart")`; o caminho define camada, pasta e feature.

### Rode o plugin

- **Num projeto real:**
  - `node bin/cli.js dry-run --project ../esfera-web --base develop --plugins meu-plugin -v`;
  - use uma branch diferente da base, numa cópia do projeto.
- **Em arquivos soltos:** o harness da seção [Testando um plugin](../CLAUDE.md#testando-um-plugin) do
  CLAUDE.md roda um plugin do `dist/` sobre arquivos `.dart` escolhidos, com o diff simulado.
- **O que testar:** o caso que deve ser reportado e os que não devem:
  - o mesmo código em comentário e em string;
  - quebrado em várias linhas;
  - em teste ou em arquivo gerado.

### Alterou um plugin existente ou o modelo?

Use a ferramenta de paridade ([tools/parity/](../tools/parity/README.md)). Ela roda as duas versões sobre
o esfera inteiro e PRs reais e compara cada mensagem e cada linha:

```bash
tools/parity/build.sh novo && tools/parity/ab.sh novo meu-plugin
tools/parity/cmp-all.sh novo --only meu-plugin --detail meu-plugin
node tools/parity/self-consistency.cjs novo meu-plugin   # o mesmo resultado com 40, 80 e 160 colunas
```

## Quando o modelo não tem o que você precisa

Não contorne no plugin com regex, tokens ou contagem de chaves. Acrescente no modelo:

1. Escreva a propriedade em `src/dart/` (classe certa: `nodes.ts`, `declarations.ts`, `file.ts`, `path.ts`),
   com comentário de uma linha e as regras do modelo:
   - desconhecido é `null` ou `Unknown`;
   - nunca lança exceção;
   - o resultado não depende da formatação.
2. Adicione o caso em [tests/dart-model.test.cjs](../tests/dart-model.test.cjs), inclusive o que **não**
   deve ser reconhecido, e rode `npm run build && npm test`.
3. Documente em [MODELO_DART.md](MODELO_DART.md) e, se for útil como exemplo, acrescente-o ao [cookbook](MODELO_DART.md#16-cookbook).
4. Rode a paridade de **todos** os plugins (`tools/parity/ab.sh novo` sem nomes): uma propriedade nova
   pode mudar o que outros plugins já usam.

## Checklist de revisão

Para quem escreve e para quem revisa o PR de um plugin:

- [ ] Lê o código pelo modelo: sem `fs`, sem `split("\n")` e sem regex para achar classe, campo, método,
      chamada, import, string ou comentário.
- [ ] Nenhuma função utilitária de parse no plugin; o que faltou foi para o `src/dart/`, com teste.
- [ ] Sem membros `@internal`.
- [ ] Desconhecido tratado como desconhecido (`=== null`, `Nullability`, `Presence`); regra de ausência só
      com `Presence.Absent`.
- [ ] `sendFormattedFail`/`sendFormattedWarn` com título fixo, código real, correção, `action.code`,
      objetivo e referência; severidade adequada.
- [ ] `line` aponta o lugar do problema; o `wrong` é o código do arquivo.
- [ ] Testado com o caso que reporta e com os que não reportam (comentário, string, quebra de linha, teste,
      gerado).
- [ ] README do plugin, registro, docs e CHANGELOG atualizados.
