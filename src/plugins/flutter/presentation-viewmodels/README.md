# Presentation ViewModels Plugin

Plugin que valida ViewModels na camada Presentation.

## 📋 Descrição

ViewModels gerenciam estado e lógica de apresentação. Devem depender de UseCases, não Repositories.

## ✨ Regras

- ✅ ViewModels usam **UseCases**
- ❌ ViewModels **NÃO** usam Repositories diretamente
- ✅ Separação de responsabilidades

## 📦 Uso

\`\`\`typescript
import { presentationViewModels } from '@danger-bot/flutter';
export default async () => { await presentationViewModels()(); };
\`\`\`

## 💡 Exemplo Correto

\`\`\`dart
// ✅ CORRETO - ViewModel usa UseCase
final class ProductViewModel extends ChangeNotifier {
  final IGetProductsUseCase getProductsUseCase;
  final IDeleteProductUseCase deleteProductUseCase;
  
  ProductViewModel({
    required this.getProductsUseCase,
    required this.deleteProductUseCase,
  });
  
  ProductState _state = ProductInitialState();
  ProductState get state => _state;
  
  Future<void> loadProducts() async {
    _state = ProductLoadingState();
    notifyListeners();
    
    final result = await getProductsUseCase();
    result.fold(
      (failure) => _state = ProductErrorState(failure.message),
      (products) => _state = ProductLoadedState(products),
    );
    notifyListeners();
  }
  
  Future<void> deleteProduct(String id) async {
    final result = await deleteProductUseCase(id);
    // handle result
  }
}
\`\`\`

## ❌ Exemplo Incorreto

\`\`\`dart
// ❌ INCORRETO - ViewModel usando Repository
final class ProductViewModel extends ChangeNotifier {
  final IProductRepository repository; // ❌ Pula UseCase!
  
  Future<void> loadProducts() async {
    final result = await repository.getProducts(); // ❌ Direto no repo
  }
}
\`\`\`

## 🎯 Por Quê?

ViewModels devem usar UseCases porque:
1. **Separação**: Lógica de negócio fica no UseCase
2. **Testabilidade**: Mais fácil mockar UseCases
3. **Reuso**: UseCases podem ser usados por múltiplos ViewModels

## 📚 Referência

- [Clean Architecture](https://resocoder.com/flutter-clean-architecture-tdd/)
