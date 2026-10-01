# Private Named Params

Detecta construtores que usam o padrão antigo (pré-Dart 3.12) de receber um parâmetro nomeado público só para atribuí-lo a um campo privado no initializer list. Desde o Dart 3.12, `this._campo` funciona direto em parâmetro nomeado — o nome público no call site continua sem o `_`.

## O que verifica

- Construtores (com e sem nome) com parâmetros nomeados `{...}` e initializer list
- Atribuições diretas `_campo = campo` no initializer list (sem transformação), quando o construtor ainda não usa `this._campo`
- `super(...)` e `assert(...)` no initializer list são ignorados
- Ignora testes e gerados (`.g.dart`, `.freezed.dart`, `.mocks.dart`, `.gr.dart`, `.config.dart`)

## Severidade

- **Tipo:** `fail` (um por construtor, mostrando até 3 campos)

## Exemplo

```dart
// ❌ Errado
class BudgetViewModel {
  BudgetViewModel({required IGetBudgetUseCase getBudgetUseCase})
      : _getBudgetUseCase = getBudgetUseCase;

  final IGetBudgetUseCase _getBudgetUseCase;
}

// ✅ Correto (Dart 3.12+) — o call site continua BudgetViewModel(getBudgetUseCase: ...)
class BudgetViewModel {
  BudgetViewModel({required this._getBudgetUseCase});

  final IGetBudgetUseCase _getBudgetUseCase;
}
```

`dart fix --code=prefer_initializing_formals` aplica a migração automaticamente.

## Referências

- [Dart 3.12 — Private Named Parameters](https://dart.dev/to/private-named-parameters)
