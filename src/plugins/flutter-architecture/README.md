# 🏗️ Flutter Architecture

## 📋 Visão Geral

Garante boas práticas de arquitetura Flutter/Dart e mantém a qualidade e consistência do código em todo o projeto.

---

## 🎯 Objetivo

Este plugin ajuda a manter:

- 🧹 Padrões de Clean Architecture
- 📂 Separação adequada de camadas
- 📋 Organização consistente do código
- ✅ Boas práticas Flutter
- 🔒 Type safety
- ⚡ Tratamento de erros robusto

---

## ⚙️ Como Funciona

Analisa arquivos `.dart` modificados e verifica:

### 1. 🔤 **Strings Hardcoded**
Detecta strings que deveriam estar em arquivos de localização

### 2. 🧠 **Lógica de Negócio na UI**
Avisa quando lógica de negócio aparece em arquivos de Widget

### 3. ⚠️ **Tratamento de Erros Ausente**
Identifica operações async sem try-catch

### 4. 📏 **Arquivos Grandes**
Alerta quando arquivos excedem 300 linhas

### 5. 📝 **Documentação Ausente**
Verifica documentação em APIs públicas

---

## 🚀 Configuração

```typescript
import { flutterArchitecturePlugin } from "@diletta/danger-bot";

const plugins = [
  flutterArchitecturePlugin,  // Habilitado por padrão
];
```

---

## 📋 Regras Detalhadas

### 1. 🔤 Strings Hardcoded

#### ❌ Errado

```dart
Text('Bem-vindo ao app')
AppBar(title: Text('Configurações'))
```

#### ✅ Correto

```dart
Text(AppLocalizations.of(context).welcome)
AppBar(title: Text(context.l10n.settings))
```

**Exceções automaticamente ignoradas:**
- URLs (`https://`, `http://`)
- Regexes
- Strings técnicas comuns (`test`, `debug`, etc)

---

### 2. 🧠 Lógica de Negócio na UI

#### ❌ Errado

```dart
class MyWidget extends StatelessWidget {
  Widget build(BuildContext context) {
    // ❌ Lógica complexa no Widget
    final result = calculateComplexDiscount(
      price: 100,
      discount: 0.15,
      tax: 0.08
    );
    return Text('$result');
  }
}
```

#### ✅ Correto

```dart
class MyWidget extends StatelessWidget {
  final String result;  // ✅ Recebe dados já processados
  
  MyWidget({required this.result});
  
  Widget build(BuildContext context) {
    return Text(result);
  }
}
```

---

### 3. ⚠️ Tratamento de Erros

#### ❌ Errado

```dart
Future<void> fetchData() async {
  // ❌ Sem tratamento de erro
  final response = await api.getData();
  return response;
}
```

#### ✅ Correto

```dart
Future<void> fetchData() async {
  try {
    final response = await api.getData();
    return response;
  } on DioException catch (e) {
    logger.error('Falha ao buscar dados', e);
    throw NetworkException(e.message);
  } catch (e) {
    logger.error('Erro inesperado', e);
    rethrow;
  }
}
```

---

### 4. 📏 Tamanho de Arquivo

#### ⚠️ Evitar

- Arquivos com 300+ linhas
- Misturar múltiplas responsabilidades
- Widgets monolíticos grandes

#### ✅ Preferir

- Arquivos pequenos e focados
- Extrair widgets reutilizáveis
- Separar responsabilidades

---

## 📊 Exemplos de Saída

### 🔤 Strings Hardcoded

```
Strings hardcoded encontradas em lib/features/home/home_page.dart (linha 45)

Considere mover para arquivos de localização:
"Bem-vindo ao app"

Use: AppLocalizations.of(context) ou context.l10n
```

### 🧠 Lógica no Widget

```
Possível lógica de negócio em arquivo de Widget

Arquivo: lib/features/product/product_widget.dart (linha 67)
Encontrado: calculateDiscount

Considere mover para:
- ViewModel/Controller
- UseCase/Service
- Repository
```

### ⚠️ Falta Tratamento de Erro

```
Operação async sem tratamento de erro

Arquivo: lib/core/services/api_service.dart (linha 123)
Método: fetchUserProfile

Adicione bloco try-catch para tratamento robusto de erros.
```

### 📏 Arquivo Grande

```
Arquivo muito grande: 456 linhas

Arquivo: lib/features/inventory/inventory_page.dart

Considere refatorar:
- Extrair widgets para arquivos separados
- Dividir em múltiplos componentes menores
- Usar composição ao invés de arquivos grandes
```

---

## 🏛️ Padrões de Arquitetura Suportados

### Clean Architecture

```
lib/
├── core/              # Utilitários compartilhados
├── features/          # Módulos por feature
│   └── feature_name/
│       ├── data/          # Camada de dados
│       │   ├── datasources/
│       │   ├── models/
│       │   └── repositories/
│       ├── domain/        # Lógica de negócio
│       │   ├── entities/
│       │   ├── repositories/
│       │   └── usecases/
│       └── presentation/  # Camada de UI
│           ├── pages/
│           ├── widgets/
│           └── bloc/
```

### BLoC Pattern

```dart
// ✅ Lógica no BLoC/Cubit
class ProductBloc extends Bloc<ProductEvent, ProductState> {
  final GetProductsUseCase getProducts;
  
  ProductBloc(this.getProducts) : super(ProductInitial()) {
    on<LoadProducts>(_onLoadProducts);
  }
  
  Future<void> _onLoadProducts(
    LoadProducts event,
    Emitter<ProductState> emit,
  ) async {
    emit(ProductLoading());
    try {
      final products = await getProducts();
      emit(ProductLoaded(products));
    } catch (e) {
      emit(ProductError(e.toString()));
    }
  }
}

// ✅ UI apenas renderiza estado
class ProductPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProductBloc, ProductState>(
      builder: (context, state) {
        if (state is ProductLoading) {
          return CircularProgressIndicator();
        }
        if (state is ProductLoaded) {
          return ProductList(products: state.products);
        }
        return ErrorWidget();
      },
    );
  }
}
```

### MVVM Pattern

```dart
// ✅ ViewModel lida com lógica
class ProductViewModel extends ChangeNotifier {
  final GetProductsUseCase getProducts;
  
  List<Product> _products = [];
  bool _loading = false;
  
  Future<void> loadProducts() async {
    _loading = true;
    notifyListeners();
    
    try {
      _products = await getProducts();
    } catch (e) {
      // Handle error
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}

// ✅ View é passiva
class ProductView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<ProductViewModel>(
      builder: (context, viewModel, child) {
        if (viewModel.loading) {
          return CircularProgressIndicator();
        }
        return ProductList(products: viewModel.products);
      },
    );
  }
}
```

---

## 💡 Boas Práticas

### ✅ Recomendado

1. **Localização**: Use `AppLocalizations` para todas as strings visíveis ao usuário
2. **Separação**: Mantenha lógica de negócio fora da camada de UI
3. **Tratamento de Erros**: Sempre trate erros em operações async
4. **Tamanho**: Mantenha arquivos abaixo de 300 linhas
5. **Documentação**: Documente todas as APIs públicas

### ❌ Evitar

- ❌ Strings hardcoded em widgets
- ❌ Cálculos complexos em métodos `build()`
- ❌ Operações async sem try-catch
- ❌ Arquivos monolíticos
- ❌ APIs públicas sem documentação

---

## 🔧 Customização

### Ajustar Limites

Modifique os limites no arquivo do plugin:

```typescript
const MAX_FILE_LINES = 300;  // Altere conforme necessário
const LARGE_METHOD_LINES = 50;
```

---

## 🌐 Plataformas Suportadas

| Plataforma | Status |
|------------|--------|
| GitHub | ✅ |
| Bitbucket Cloud | ✅ |
| GitLab | ✅ |

---

## 📦 Dependências

Nenhuma - usa apenas APIs nativas do Danger JS.

---

## 🔗 Plugins Relacionados

- [flutter-analyze](../flutter-analyze/README.md) - Análise estática
- [spell-checker](../spell-checker/README.md) - Ortografia de identificadores
- [pr-size-checker](../pr-size-checker/README.md) - Validação de tamanho do PR

---

<div align="center">

**Arquitetura limpa, código sustentável! 🏗️**

</div>
