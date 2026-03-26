# Identifier Language

Exige identificadores e comentários de documentação em **inglês**: dicionário PT interno, detecção **eld** (PT/ES) e, para comentários, tradução sugerida via pacote `translate` quando disponível.

## O que verifica

- Comentários `//` e `///` (exceto curtos, `TODO`/`FIXME`/`ignore:`/`coverage:`/`{@…}`)
- Nomes de classe, enum, método e variável com tokens PT ou detectados como não inglês

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
class UsuarioViewModel { }

// ✅ Correto
class UserViewModel { }
```

## Referências

- [Effective Dart — Documentation](https://dart.dev/effective-dart/documentation)
