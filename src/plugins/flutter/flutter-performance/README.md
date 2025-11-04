# Flutter Performance Plugin

Plugin que detecta operações custosas no método `build()` do Flutter, garantindo performance de 60fps.

## 📋 Descrição

O método `build()` é chamado toda vez que o widget precisa ser reconstruído (rebuild). Operações custosas como ordenação, filtragem, loops ou transformações de dados dentro do `build()` causam lentidão e quedas de FPS.

Este plugin detecta automaticamente essas operações e sugere alternativas otimizadas.

## ✨ Funcionalidades

- ✅ **Detecta Operações Custosas**: `.sort()`, `.where()`, `.map()`, `for`, `while` no build()
- ✅ **Sugestões de Cache**: Propõe uso de getters computados ou cache
- ✅ **Mensagens Educativas**: Explica o problema e mostra exemplos de correção
- ✅ **Performance First**: Foco em manter 60fps consistentes

## 📦 Instalação

```typescript
import { flutterPerformance } from "@danger-bot/flutter";

export default async () => {
  await flutterPerformance()();
};
```

## 🎯 Problemas Detectados

### 1. Ordenação no build()

```dart
// ❌ INCORRETO - Sort a cada rebuild
class ProductList extends StatelessWidget {
  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    final sorted = products.sort((a, b) => a.name.compareTo(b.name)); // ⚠️
    return ListView(
      children: sorted.map((p) => ProductCard(p)).toList(),
    );
  }
}

// ✅ CORRETO - Cache com getter
class ProductList extends StatelessWidget {
  final List<Product> products;

  List<Product>? _cachedSorted;
  List<Product> get sortedProducts {
    _cachedSorted ??= [...products]..sort((a, b) => a.name.compareTo(b.name));
    return _cachedSorted!;
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: sortedProducts.map((p) => ProductCard(p)).toList(),
    );
  }
}

// ✅ MELHOR - Ordenar antes de passar para o widget
class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final products = getProducts(); // Já vem ordenado
    return ProductList(products: products);
  }
}
```

### 2. Filtragem no build()

```dart
// ❌ INCORRETO - Filter a cada rebuild
class ActiveUsersList extends StatelessWidget {
  final List<User> users;

  @override
  Widget build(BuildContext context) {
    final activeUsers = users.where((u) => u.isActive).toList(); // ⚠️
    return ListView.builder(
      itemCount: activeUsers.length,
      itemBuilder: (ctx, i) => UserCard(activeUsers[i]),
    );
  }
}

// ✅ CORRETO - Cache com getter
class ActiveUsersList extends StatelessWidget {
  final List<User> users;

  List<User>? _cachedActive;
  List<User> get activeUsers {
    _cachedActive ??= users.where((u) => u.isActive).toList();
    return _cachedActive!;
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: activeUsers.length,
      itemBuilder: (ctx, i) => UserCard(activeUsers[i]),
    );
  }
}

// ✅ MELHOR - Usar ViewModel ou State Management
class ActiveUsersPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final viewModel = context.watch<UserViewModel>();
    final activeUsers = viewModel.activeUsers; // Já filtrado

    return ListView.builder(
      itemCount: activeUsers.length,
      itemBuilder: (ctx, i) => UserCard(activeUsers[i]),
    );
  }
}
```

### 3. Transformações com map() no build()

```dart
// ❌ INCORRETO - Map transforma dados a cada rebuild
class PriceList extends StatelessWidget {
  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    final prices = products.map((p) => p.price * 1.1).toList(); // ⚠️
    return Column(
      children: prices.map((p) => Text('\$$p')).toList(),
    );
  }
}

// ✅ CORRETO - Cache ou mova para Model
class PriceList extends StatelessWidget {
  final List<PriceItem> priceItems; // Já calculado

  @override
  Widget build(BuildContext context) {
    return Column(
      children: priceItems.map((item) => Text('\$${item.total}')).toList(),
    );
  }
}
```

### 4. Loops for/while no build()

```dart
// ❌ INCORRETO - Loop complexo no build
class StatsList extends StatelessWidget {
  final List<int> numbers;

  @override
  Widget build(BuildContext context) {
    double total = 0;
    for (var num in numbers) {  // ⚠️
      total += num;
    }
    final average = total / numbers.length;

    return Text('Average: $average');
  }
}

// ✅ CORRETO - Computed property
class StatsList extends StatelessWidget {
  final List<int> numbers;

  double get average {
    if (numbers.isEmpty) return 0;
    return numbers.reduce((a, b) => a + b) / numbers.length;
  }

  @override
  Widget build(BuildContext context) {
    return Text('Average: $average');
  }
}

// ✅ MELHOR - ViewModel com cálculo
class StatsViewModel extends ChangeNotifier {
  List<int> _numbers = [];
  double _average = 0;

  void setNumbers(List<int> numbers) {
    _numbers = numbers;
    _calculateAverage(); // Calcula uma vez
    notifyListeners();
  }

  void _calculateAverage() {
    if (_numbers.isEmpty) {
      _average = 0;
      return;
    }
    _average = _numbers.reduce((a, b) => a + b) / _numbers.length;
  }

  double get average => _average;
}
```

## 🔧 Estratégias de Otimização

### 1. Memoização com Getters

```dart
class MyWidget extends StatelessWidget {
  final List<Item> items;

  List<Item>? _cached;
  List<Item> get processedItems {
    _cached ??= expensiveOperation(items);
    return _cached!;
  }

  @override
  Widget build(BuildContext context) {
    return ListView(children: processedItems.map(...).toList());
  }
}
```

### 2. Computação no ViewModel

```dart
class ProductViewModel extends ChangeNotifier {
  List<Product> _products = [];
  List<Product> _sortedCache = [];

  void setProducts(List<Product> products) {
    _products = products;
    _sortedCache = [...products]..sort(); // Cache aqui
    notifyListeners();
  }

  List<Product> get sortedProducts => _sortedCache;
}
```

### 3. const Constructors

```dart
// ✅ Widgets const não rebuild
class MyPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        Header(), // const = não rebuild
        Footer(), // const = não rebuild
      ],
    );
  }
}
```

### 4. Builders Otimizados

```dart
// ✅ ListView.builder é lazy (só constrói o visível)
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ItemCard(items[index]),
)

// ❌ ListView com children constrói TODOS
ListView(
  children: items.map((item) => ItemCard(item)).toList(),
)
```

## 📊 Impacto de Performance

### Exemplo Real

```dart
// ❌ LENTO - 120ms por rebuild (15 FPS)
@override
Widget build(BuildContext context) {
  final sorted = List.from(products)..sort();
  final filtered = sorted.where((p) => p.inStock).toList();
  final mapped = filtered.map((p) => ProductCard(p)).toList();
  return ListView(children: mapped);
}

// ✅ RÁPIDO - 2ms por rebuild (500 FPS)
List<Product>? _cache;
List<Product> get processedProducts {
  _cache ??= List.from(products)
    ..sort()
    ..retainWhere((p) => p.inStock);
  return _cache!;
}

@override
Widget build(BuildContext context) {
  return ListView.builder(
    itemCount: processedProducts.length,
    itemBuilder: (ctx, i) => ProductCard(processedProducts[i]),
  );
}
```

**Resultado**: 60x mais rápido! 🚀

## 🎯 Boas Práticas

### ✅ FAÇA

- Use **getters** para computações caras
- Cache resultados que não mudam
- Processe dados **antes** do build()
- Use **ListView.builder** para listas grandes
- Marque widgets como **const** quando possível
- Mova lógica pesada para **ViewModel**

### ❌ NÃO FAÇA

- Ordenar/filtrar no build()
- Loops complexos no build()
- Transformações pesadas no build()
- Criar objetos novos no build()
- Fazer cálculos repetidos

## 🔍 Como Debugar Performance

### 1. Flutter DevTools

```bash
flutter run --profile
# Abra DevTools e vá para "Performance"
# Procure por frames que levam >16ms
```

### 2. Adicionar Prints de Timing

```dart
@override
Widget build(BuildContext context) {
  final start = DateTime.now();

  // seu código aqui

  final elapsed = DateTime.now().difference(start);
  print('Build took: ${elapsed.inMilliseconds}ms');

  return Container();
}
```

### 3. Performance Overlay

```dart
MaterialApp(
  showPerformanceOverlay: true, // Mostra FPS
  home: HomePage(),
)
```

## 📚 Referências

- [Flutter Performance Best Practices](https://docs.flutter.dev/perf/best-practices)
- [Flutter Performance Profiling](https://docs.flutter.dev/perf/ui-performance)
- [Render Performance](https://docs.flutter.dev/perf/rendering-performance)

## 💡 Dica Pro

> **Regra de Ouro**: Se algo não muda a cada frame, não deve estar no `build()` method!

## 📄 Licença

MIT
