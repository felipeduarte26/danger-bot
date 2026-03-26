# PR Size Checker

Conta arquivos **`.dart`** alterados no PR, excluindo gerados (`.g.dart`, `.freezed.dart`, `.mocks.dart`, `.gen.dart`, etc.) e alguns artefatos de build.

## O que verifica

- Mais de **100** arquivos `.dart` → **`fail`**
- Entre **61 e 100** → **`warn`** sugerindo dividir a PR

## Severidade

- **Tipo:** `fail` (>100) ou `warn` (61–100)

## Exemplo

```text
// ❌ Errado — 101 arquivos lib/*.dart na mesma PR

// ✅ Correto — fatiar por feature, camada ou tipo de mudança
```

## Referências

- [Google eng-practices — Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)
