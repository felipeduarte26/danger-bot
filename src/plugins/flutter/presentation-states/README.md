# Presentation States Plugin

Plugin que valida States na camada Presentation, garantindo uso correto de sealed classes.

## 📋 Descrição

States representam os diferentes estados da UI (loading, loaded, error, etc). Devem usar `sealed class` para garantir exhaustiveness checking.

## ✨ Regras

- ✅ Primeira classe: `sealed class NomeState`
- ✅ Demais: `final class extends NomeState`
- ✅ Pattern matching exaustivo

## 📦 Uso

\`\`\`typescript
import { presentationStates } from '@danger-bot/flutter';
export default async () => { await presentationStates()(); };
\`\`\`

## 💡 Exemplo Correto

\`\`\`dart
// ✅ CORRETO
sealed class ProductState {}

final class ProductInitialState extends ProductState {}

final class ProductLoadingState extends ProductState {}

final class ProductLoadedState extends ProductState {
  final List<Product> products;
  const ProductLoadedState(this.products);
}

final class ProductErrorState extends ProductState {
  final String message;
  const ProductErrorState(this.message);
}

// Uso com pattern matching
Widget build(BuildContext context) {
  return switch (state) {
    ProductInitialState() => SizedBox(),
    ProductLoadingState() => CircularProgressIndicator(),
    ProductLoadedState(products: var p) => ProductList(products: p),
    ProductErrorState(message: var m) => ErrorWidget(message: m),
  };
}
\`\`\`

## ❌ Exemplo Incorreto

\`\`\`dart
// ❌ INCORRETO - class normal (não sealed)
class ProductState {}
final class ProductLoadedState extends ProductState {}

// ❌ INCORRETO - abstract (não sealed)
abstract class ProductState {}
\`\`\`

## 📚 Referência

- [Sealed Classes - Dart 3](https://dart.dev/language/class-modifiers#sealed)
