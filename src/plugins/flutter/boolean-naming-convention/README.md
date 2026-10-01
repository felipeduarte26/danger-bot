# Boolean Naming Convention

Verifica se campos, variáveis e getters `bool` seguem o Effective Dart: nome como frase verbal **não imperativa** (`isVisible`, `hasError`, `canEdit`), nunca um comando (`showPopup`, `deleteItem`).

## O que verifica

- Declarações `bool nome` / `bool? nome` (campos e variáveis) e `bool get nome` em arquivos Dart alterados
- Aceita prefixos `is`, `has`, `can`, `should`, `was`, `will`, `must`, `does`, `did` (e `allows`, `needs`, `contains`, `supports`...) e adjetivos como `visible`, `enabled`, `loading`, `selected`
- Falha quando a primeira palavra é um verbo imperativo conhecido (`show`, `delete`, `load`, `toggle`...) ou, pelo **wordpos** (WordNet), é verbo e não é substantivo nem adjetivo
- Ignora comentários, strings, testes, gerados (`.g.dart`, `.freezed.dart`, `/generated/`) e nomes com menos de 3 letras
- Sugere um nome (`showPopup` → `shouldShowPopup`, `load` → `isLoaded`, demais → `is...`)

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
bool showPopup = false;
bool get deleteItem => _items.isEmpty;

// ✅ Correto
bool shouldShowPopup = false;
bool get isDeleted => _items.isEmpty;
```

## Referências

- [Effective Dart: PREFER a non-imperative verb phrase for a boolean](https://dart.dev/effective-dart/design#prefer-a-non-imperative-verb-phrase-for-a-boolean-property-or-variable)
