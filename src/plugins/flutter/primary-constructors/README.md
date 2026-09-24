# Primary Constructors

Obriga o uso de **primary constructors** (Dart 3.13+) em classes e enums que ainda declaram o construtor principal dentro do corpo. No primary constructor, construtor e campos são declarados direto no cabeçalho da classe, sem repetir o mesmo campo como declaração e como parâmetro.

## O que verifica

- Classes e enums com **exatamente um** construtor generativo não-redirecionante no corpo (factories e construtores redirecionantes podem continuar no corpo)
- Reconhece a sintaxe clássica (`Nome(...)`, `Nome.named(...)`) e a concisa do 3.13 (`new(...)`, `new named(...)`)
- A sugestão mostra a classe já convertida:
  - `this.campo` vira `final Tipo campo` (ou `var`, se o campo for mutável) e a declaração do campo sai do corpo, levando junto o `///`
  - `{required Tipo campo}) : _campo = campo` vira `{required final Tipo _campo}` (o nome público continua `campo`)
  - `super.x` e parâmetros comuns ficam como estão
  - Initializer list, corpo e `///` do construtor antigo vão para o bloco `this`
- Só roda quando o pacote do arquivo (`pubspec.yaml` mais próximo) exige `sdk` mínimo 3.13 ou superior (`^3.13.0`, `>=3.13.0 <4.0.0`, `<4.0.0 >=3.13.0`...) e o arquivo não tem `// @dart=` abaixo de 3.13
- A análise é feita sobre **tokens** (não sobre linhas): quebras de linha, indentação, CRLF, tabs e comentários em qualquer posição não mudam a decisão — cabeçalho, parâmetros e tipos podem estar numa linha só ou espalhados em várias

## Quando NÃO reporta (evita falsos positivos)

| Situação | Motivo |
| -------- | ------ |
| SDK mínimo < 3.13 ou `// @dart=3.12` | O recurso não existe nessa versão da linguagem |
| Testes (`_test.dart`, `test/`, `integration_test/`) e arquivos gerados (`.g.dart`, `.freezed.dart`, `generated/`...) | Fora do escopo do código de produção |
| Classe sem construtor explícito | Nada a converter (diferente do lint experimental `use_primary_constructors`) |
| Construtor trivial (`Foo();`) | Equivale ao construtor padrão; basta removê-lo |
| Mais de um construtor generativo | Com primary constructor, os demais precisariam redirecionar para ele |
| Construtor `external`, `mixin class`, mixin application | Não suportam primary constructor |
| Anotação de geração de código na classe (`@JsonSerializable`, `@freezed`, `@ChopperApi`...) | O gerador pode depender do formato do construtor |
| Arquivo com `part 'x.<sufixo>.dart'` (`.g.dart`, `.freezed.dart`, `.pb.dart`...), com cabeçalho de arquivo gerado (`// GENERATED CODE`, `DO NOT MODIFY`...) ou `part of` de uma biblioteca com código gerado | Código gerado depende das classes da biblioteca |
| Construtor anotado | A anotação não tem equivalente seguro |
| Inicializador de campo não-`late` que cita nome de parâmetro | Com primary constructor ele passaria a ler o **parâmetro** — muda o valor sem erro de compilação |
| Campo inicializado na declaração **e** no construtor | Vira erro de compilação com primary constructor |
| Atribuição a parâmetro no initializer list (`x++`, `x = ...`) | Vira erro de compilação com primary constructor |
| Construtor não-const em classe `@immutable` (Widgets, estados), com todos os campos `final`, sem mixin nem corpo, e superclasse chamada com construtor const | No Dart 3.13 o lint `prefer_const_constructors_in_immutables` pede `const` indevidamente após a conversão (bug do lint), o que quebraria o `flutter analyze` |
| Trecho com comentário ou string multi-linha que precisaria ser movido | O parser não junta linhas sem risco de alterar o código |
| Comentário sem lugar na sugestão: depois do último parâmetro, entre `)` e `:`/`{`, dentro de um parâmetro ou de um campo, ou no fim da linha do construtor | A sugestão (e o assist da IDE) perderiam o comentário |
| `// ignore:` acima do construtor | Ele vale para a linha seguinte: no bloco `this` deixaria de cobrir o diagnóstico, que passa a ser reportado nos parâmetros do cabeçalho |

Campos `late`, com anotação desconhecida, em declaração múltipla (`final int x, y;`) ou com tipo diferente do parâmetro continuam no corpo e o parâmetro fica como `this.campo`, que também é válido em primary constructor.

## Compatibilidade com os outros plugins

Vários plugins analisam a estrutura das classes linha a linha (nome, `extends`/`implements`, campos) e foram escritos para a sintaxe clássica. Para que o código **já convertido** não gere falsos positivos (ex.: `ENTITY VAZIA`, `DATASOURCE SEM IMPLEMENTAÇÃO`, `const` lido como nome da classe), eles passaram a usar os helpers deste módulo:

- `normalizePrimaryConstructorHeaders`: cabeçalho com primary constructor lido como o clássico equivalente, sem mudar a numeração das linhas. Usado por `domain-entities`, `domain-failures`, `domain-usecases`, `repositories`, `data-datasources`, `data-models`, `model-entity-inheritance`, `presentation-viewmodels`, `presentation-encapsulation`, `class-naming-convention`, `flutter-widgets`, `avoid-god-class`, `avoid-setstate-after-async` e `memory-leak-detector`
- `findPrimaryConstructors` / `primaryConstructorFieldsByLine`: parâmetros declarantes contados como campos. Usados por `domain-entities`, `model-entity-inheritance`, `data-models` (campo `var`), `presentation-viewmodels` (dependência proibida) e `date-type-checker` (data como `String`)

Também foram ajustados `positional-bool-params` (`@override` em parâmetro declarante), `identifier-language` e `spell-checker` (`class const Nome`).

> Efeito esperado ao migrar: o `positional-bool-params` passa a enxergar o tipo dos parâmetros do cabeçalho, então um `bool` **posicional** (`class const A(final bool enabled)`) é reportado — no código clássico, `A(this.enabled)` sem o tipo explícito escapava da regra.

Os helpers também são exportados pelo pacote, para plugins locais (veja o [Guia de Plugins](../../../../docs/GUIA_PLUGINS.md)).

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
final class BudgetViewModel extends ViewModelBase<BudgetState> {
  /// Creates a [BudgetViewModel].
  BudgetViewModel({required this._getUserUseCase}) : super(InitialBudgetState());

  final IGetUserUseCase _getUserUseCase;
}

// ✅ Correto
final class BudgetViewModel({
  required final IGetUserUseCase _getUserUseCase,
}) extends ViewModelBase<BudgetState> {
  /// Creates a [BudgetViewModel].
  this : super(InitialBudgetState());
}
```

```dart
// ❌ Errado
class BranchEntity {
  /// Default [BranchEntity] constructor.
  const BranchEntity({required this.id, required this.name});

  /// Unique identifier for the branch.
  final int id;

  /// The branch name.
  final String name;
}

// ✅ Correto
class const BranchEntity({
  /// Unique identifier for the branch.
  required final int id,

  /// The branch name.
  required final String name,
}) {
  /// Default [BranchEntity] constructor.
  this;
}
```

> O `///` do construtor fica no bloco `this;`. Sem ele, o lint `public_member_api_docs` reclama que falta documentação no primary constructor.

## Referências

- [Dart — Primary constructors](https://dart.dev/language/primary-constructors)
- [Especificação da linguagem — Primary constructors](https://github.com/dart-lang/language/blob/main/accepted/3.13/primary-constructors/feature-specification.md)
- [Bringing primary constructors to Dart](https://dart.dev/blog/bringing-primary-constructors-to-dart)
