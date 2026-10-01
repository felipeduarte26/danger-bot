# Identifier Language

Exige identificadores e comentários de documentação em **inglês**: dicionário PT interno, **cspell** (dicionário EN) e, para comentários, tradução sugerida via pacote `translate` (Google Translate, precisa de rede) quando disponível.

## O que verifica

- Comentários `//` e `///` (exceto curtos, `TODO`/`FIXME`/`ignore:`/`coverage:`/`{@…}`) com palavras do dicionário PT
- Nomes de classe, enum, método e variável com palavras do dicionário PT
- Palavras que o cspell não reconhece como inglês e que ficam a 1-2 letras de uma palavra PT conhecida (ex.: `filials`)

> O detector de idioma **eld** fica desligado: palavra por palavra ele reprovava textos em inglês (`listener`, `internal`, "Converts this model to a map"). No esfera-web, ligá-lo levava de 181 para 2.022 falhas.

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
