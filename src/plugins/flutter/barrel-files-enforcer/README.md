# Barrel Files Enforcer

Lê `pubspec.yaml` para obter o nome do pacote e, em cada arquivo Dart alterado, agrupa imports `package:<seu_app>/...` que apontam para **dois ou mais arquivos na mesma pasta** — sugere criar um barrel (`<pasta>.dart`) e unificar em um único import.

## O que verifica

- Ignora `dart:`, imports relativos `../` e pacotes externos
- Só age quando há **≥2** imports do mesmo diretório do próprio pacote
- Não reporta se já existe import de barrel (`pasta.dart` ou `pasta/pasta.dart`)

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
import 'package:app/features/auth/login_page.dart';
import 'package:app/features/auth/login_controller.dart';

// ✅ Correto
import 'package:app/features/auth/auth.dart';
```

## Referências

- [Barrel files in Dart/Flutter (guia)](https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter-a-guide-to-simplifying-imports-9b245dbe516a)
