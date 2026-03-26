# Spell Checker

Nas **linhas adicionadas** do diff, extrai palavras de identificadores (classes, métodos, variáveis), quebra camelCase e valida com **cspell** + dicionários Dart/Flutter/software. Palavras comuns em PT são classificadas como “português”; demais desconhecidas como possível typo.

## O que verifica

- Ignora linhas `import` / `export` / `part`
- Mescla palavras customizadas de `TECH_WORDS` e `cSpell.words` do `.vscode/settings.json`
- Agrupa relatórios por arquivo

## Severidade

- **Tipo:** `fail` (e `message` com total ao final)

## Exemplo

```dart
// ❌ Errado (palavra desconhecida / PT em identificador)
class RecievePaymentViewModel { }

// ✅ Correto
class ReceivePaymentViewModel { }
```

## Referências

- [cspell](https://cspell.org/)
- [VS Code — Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
