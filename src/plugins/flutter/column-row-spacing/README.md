# Column Row Spacing

Detecta padrão **alternado** `Widget`, `SizedBox(height|width: N)`, `Widget`, … em `Column`/`Row` quando **N é literal** e igual em todos os espaçadores — sugere `spacing: N` (Flutter 3.27+). Abordagem conservadora: se o padrão não for claro, não reporta.

## O que verifica

- `Column`/`Row` com `children: [ ... ]` parseável
- Pelo menos dois `SizedBox` com o mesmo valor numérico literal entre filhos, sem `SizedBox` nas pontas, padrão estritamente intercalado

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
Column(
  children: [
    Text('a'),
    SizedBox(height: 8),
    Text('b'),
    SizedBox(height: 8),
    Text('c'),
  ],
)

// ✅ Correto
Column(
  spacing: 8,
  children: [Text('a'), Text('b'), Text('c')],
)
```

## Referências

- [Row/Column spacing (Flutter 3.27)](https://codewithandrea.com/tips/spacing-row-column/)
