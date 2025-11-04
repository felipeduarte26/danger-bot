# Flutter Widgets Plugin

Plugin que verifica a organização e ordem de funções em widgets Flutter, garantindo código limpo e padronizado.

## 📋 Descrição

Mantém a organização consistente de widgets Flutter verificando:
- Funções `@override` devem vir primeiro
- Funções privadas devem vir depois
- Ordem lógica de lifecycle methods

## ✨ Funcionalidades

- ✅ **Ordem de Funções**: Verifica se `@override` vem antes de funções privadas
- ✅ **Lifecycle Methods**: Garante ordem lógica (initState → build → dispose)
- ✅ **Padrão de Código**: Mantém consistência em toda equipe
- ✅ **Mensagens Educativas**: Explica a ordem correta

## 📦 Instalação

```typescript
import { flutterWidgets } from '@danger-bot/flutter';

export default async () => {
  await flutterWidgets()();
};
```

## 📐 Ordem Correta de Funções

### StatelessWidget

```dart
// ✅ ORDEM CORRETA
class MyButton extends StatelessWidget {
  // 1. Campos/Propriedades
  final String title;
  final VoidCallback onPressed;
  
  // 2. Constructor
  const MyButton({
    Key? key,
    required this.title,
    required this.onPressed,
  }) : super(key: key);
  
  // 3. @override methods (públicos)
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      child: Text(title),
    );
  }
  
  // 4. Métodos públicos
  void publicMethod() {
    // ...
  }
  
  // 5. Métodos privados
  void _privateHelper() {
    // ...
  }
  
  // 6. Getters/Setters privados
  String get _formattedTitle => title.toUpperCase();
}
```

### StatefulWidget

```dart
// ✅ ORDEM CORRETA
class MyCounter extends StatefulWidget {
  // 1. Campos finais
  final int initialValue;
  
  // 2. Constructor
  const MyCounter({Key? key, this.initialValue = 0}) : super(key: key);
  
  // 3. createState
  @override
  State<MyCounter> createState() => _MyCounterState();
}

class _MyCounterState extends State<MyCounter> {
  // 1. Variáveis de estado
  late int _counter;
  
  // 2. Lifecycle: initState
  @override
  void initState() {
    super.initState();
    _counter = widget.initialValue;
  }
  
  // 3. Lifecycle: didUpdateWidget (se necessário)
  @override
  void didUpdateWidget(MyCounter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialValue != widget.initialValue) {
      _counter = widget.initialValue;
    }
  }
  
  // 4. Lifecycle: build
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$_counter'),
        ElevatedButton(
          onPressed: _increment,
          child: Text('Increment'),
        ),
      ],
    );
  }
  
  // 5. Lifecycle: dispose
  @override
  void dispose() {
    // cleanup
    super.dispose();
  }
  
  // 6. Métodos públicos
  void publicMethod() {
    // ...
  }
  
  // 7. Métodos privados (event handlers)
  void _increment() {
    setState(() => _counter++);
  }
  
  // 8. Build helpers privados
  Widget _buildCounter() {
    return Text('$_counter');
  }
  
  // 9. Getters/Computations
  bool get _isEven => _counter % 2 == 0;
}
```

## ❌ Erros Comuns

### Erro 1: Funções privadas antes de @override

```dart
// ❌ INCORRETO
class MyWidget extends StatelessWidget {
  // Funções privadas ANTES dos @override
  void _helper() { }  // ❌ Ordem errada
  
  String get _data => 'data';  // ❌ Ordem errada
  
  @override
  Widget build(BuildContext context) {  // Deveria vir primeiro
    return Container();
  }
}

// ✅ CORRETO
class MyWidget extends StatelessWidget {
  // @override methods primeiro
  @override
  Widget build(BuildContext context) {
    return Container();
  }
  
  // Funções privadas depois
  void _helper() { }
  
  String get _data => 'data';
}
```

### Erro 2: dispose() antes de build()

```dart
// ❌ INCORRETO - Ordem ilógica
class _MyState extends State<MyWidget> {
  @override
  void dispose() {  // ❌ dispose antes de build
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Container();
  }
  
  @override
  void initState() {  // ❌ initState depois de build
    super.initState();
  }
}

// ✅ CORRETO - Ordem lógica do lifecycle
class _MyState extends State<MyWidget> {
  @override
  void initState() {  // 1️⃣ Inicialização
    super.initState();
  }
  
  @override
  Widget build(BuildContext context) {  // 2️⃣ Build
    return Container();
  }
  
  @override
  void dispose() {  // 3️⃣ Cleanup
    super.dispose();
  }
}
```

## 📐 Template Completo

### Widget Complexo com Tudo

```dart
class UserProfile extends StatefulWidget {
  // ════════════════════════════════════════════════════════════
  // PROPRIEDADES
  // ════════════════════════════════════════════════════════════
  final String userId;
  final VoidCallback? onLogout;
  
  // ════════════════════════════════════════════════════════════
  // CONSTRUCTOR
  // ════════════════════════════════════════════════════════════
  const UserProfile({
    Key? key,
    required this.userId,
    this.onLogout,
  }) : super(key: key);
  
  // ════════════════════════════════════════════════════════════
  // CREATE STATE
  // ════════════════════════════════════════════════════════════
  @override
  State<UserProfile> createState() => _UserProfileState();
}

class _UserProfileState extends State<UserProfile> 
    with SingleTickerProviderStateMixin {
  // ════════════════════════════════════════════════════════════
  // VARIÁVEIS DE ESTADO
  // ════════════════════════════════════════════════════════════
  late AnimationController _controller;
  User? _user;
  bool _isLoading = false;
  
  // ════════════════════════════════════════════════════════════
  // LIFECYCLE: INIT
  // ════════════════════════════════════════════════════════════
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 300),
    );
    _loadUser();
  }
  
  // ════════════════════════════════════════════════════════════
  // LIFECYCLE: DID UPDATE WIDGET
  // ════════════════════════════════════════════════════════════
  @override
  void didUpdateWidget(UserProfile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.userId != widget.userId) {
      _loadUser();
    }
  }
  
  // ════════════════════════════════════════════════════════════
  // LIFECYCLE: BUILD
  // ════════════════════════════════════════════════════════════
  @override
  Widget build(BuildContext context) {
    if (_isLoading) return _buildLoading();
    if (_user == null) return _buildError();
    return _buildProfile();
  }
  
  // ════════════════════════════════════════════════════════════
  // LIFECYCLE: DISPOSE
  // ════════════════════════════════════════════════════════════
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
  
  // ════════════════════════════════════════════════════════════
  // MÉTODOS PÚBLICOS
  // ════════════════════════════════════════════════════════════
  void refresh() {
    _loadUser();
  }
  
  // ════════════════════════════════════════════════════════════
  // EVENT HANDLERS (PRIVADOS)
  // ════════════════════════════════════════════════════════════
  Future<void> _loadUser() async {
    setState(() => _isLoading = true);
    try {
      _user = await fetchUser(widget.userId);
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  void _handleLogout() {
    widget.onLogout?.call();
  }
  
  // ════════════════════════════════════════════════════════════
  // BUILD HELPERS (PRIVADOS)
  // ════════════════════════════════════════════════════════════
  Widget _buildLoading() {
    return Center(child: CircularProgressIndicator());
  }
  
  Widget _buildError() {
    return Center(child: Text('Error loading user'));
  }
  
  Widget _buildProfile() {
    return Column(
      children: [
        Text(_user!.name),
        ElevatedButton(
          onPressed: _handleLogout,
          child: Text('Logout'),
        ),
      ],
    );
  }
  
  // ════════════════════════════════════════════════════════════
  // GETTERS / COMPUTED PROPERTIES
  // ════════════════════════════════════════════════════════════
  bool get _hasUser => _user != null;
  
  String get _displayName => _user?.name ?? 'Unknown';
}
```

## 🎯 Benefícios da Ordem Correta

### 1. Leitura Mais Fácil

```dart
// ✅ Fácil encontrar o que procura
class MyWidget extends State {
  @override  // 👈 Sei que lifecycle vem primeiro
  void initState() { }
  
  @override  // 👈 build sempre após initState
  Widget build() { }
  
  @override  // 👈 dispose sempre no final
  void dispose() { }
  
  void _helper() { }  // 👈 Helpers privados depois
}
```

### 2. Code Review Mais Rápido

Reviewers sabem exatamente onde procurar cada tipo de código.

### 3. Consistência na Equipe

Todos escrevem da mesma forma = menos discussões = mais produtividade.

## 📚 Referências

- [Effective Dart: Style](https://dart.dev/guides/language/effective-dart/style)
- [Flutter Widget Lifecycle](https://api.flutter.dev/flutter/widgets/State-class.html)
- [Flutter Best Practices](https://docs.flutter.dev/perf/best-practices)

## 📄 Licença

MIT
