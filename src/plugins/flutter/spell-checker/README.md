# Spell Checker

Verifica ortografia em **nomes de identificadores** (classes, métodos, variáveis) nas linhas adicionadas do PR. Detecta dois tipos de problema:

1. **Identificador não está em inglês** — usa [eld](https://github.com/nitotm/efficient-language-detector-js) para detectar palavras em qualquer idioma que não seja inglês
2. **Erro ortográfico (typo)** — usa [cspell](https://cspell.org/) com dicionários de Dart, Flutter e termos de software para identificar palavras escritas incorretamente

## Como funciona

1. Extrai identificadores das linhas adicionadas no diff
2. Quebra camelCase/PascalCase em palavras individuais (`fetchUserData` → `fetch`, `user`, `data`)
3. Verifica cada palavra com **cspell** (dicionários + palavras customizadas)
4. Palavras desconhecidas pelo cspell são classificadas com **eld**: se não é inglês → "não está em inglês"; se é inglês mas desconhecida → "typo"

## Como ignorar falsos positivos

Adicione a palavra ao dicionário do **Code Spell Checker** no `.vscode/settings.json` do seu projeto:

```json
{
  "cSpell.words": [
    "suapalavra",
    "outrapalavra"
  ]
}
```

O plugin lê automaticamente essa lista e ignora as palavras cadastradas. Também é possível adicionar via VS Code: clique na palavra sublinhada → "Add to Workspace Dictionary".

## O que é ignorado

- Arquivos gerados (`.g.dart`, `.freezed.dart`, `.mocks.dart`, `/generated/`)
- Linhas de `import`, `export`, `part`
- Comentários e strings
- Nomes curtos (1-2 caracteres): `i`, `j`, `k`, `e`, `x`, `y`
- Métodos padrão do Flutter: `build`, `dispose`, `initState`, `toString`, etc.
- ~230 termos técnicos conhecidos: `viewmodel`, `usecase`, `bloc`, `riverpod`, `dto`, `auth`, etc.
- Palavras cadastradas no `cSpell.words` do `.vscode/settings.json`

## Severidade

- **Tipo:** `fail` (e `message` com total ao final)

## Exemplo

```dart
// ❌ Identificador em português
class UsuarioRepositorio { }

// ❌ Typo em inglês
class RecievePaymentViewModel { }

// ✅ Correto
class UserRepository { }
class ReceivePaymentViewModel { }
```

## Referências

- [cspell](https://cspell.org/)
- [eld — Efficient Language Detector](https://github.com/nitotm/efficient-language-detector-js)
- [VS Code — Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
