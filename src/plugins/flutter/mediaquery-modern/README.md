# Mediaquery Modern

Substitui padrões `MediaQuery.of(context).propriedade` e `final mq = MediaQuery.of(context)` por APIs **específicas** (`sizeOf`, `paddingOf`, …) quando há mapeamento, reduzindo rebuilds desnecessários (Flutter 3.10+).

## O que verifica

- `MediaQuery.of(ctx).<prop>` para propriedades conhecidas (`size`, `padding`, `orientation`, …)
- Atribuição `final/var/MediaQueryData x = MediaQuery.of(...)`
- Uso subsequente `x.<prop>` após a atribuição detectada no mesmo arquivo

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
final size = MediaQuery.of(context).size;

// ✅ Correto
final size = MediaQuery.sizeOf(context);
```

## Referências

- [MediaQuery (Flutter API)](https://api.flutter.dev/flutter/widgets/MediaQuery-class.html)
