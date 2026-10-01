# Spell Checker PT-BR

Verifica **acentuação e cedilha** em strings literais em português nas **linhas adicionadas** do PR — os textos que o usuário vê na tela.

## O que verifica

- Strings `'...'`, `"..."` e `'''...'''` das linhas adicionadas (raw strings e interpolações `$x`/`${...}` ficam de fora)
- Cada palavra é comparada com:
  1. Uma lista de palavras que precisam de acento (`titulo` → `título`, `numero` → `número`, `codigo` → `código`...)
  2. Padrões de sufixo: `-cao` → `-ção`, `-coes` → `-ções`, `-avel` → `-ável`, `-ivel` → `-ível`, `-encia` → `-ência`, `-ario` → `-ário`, `-orio` → `-ório`... (com exceções como `categoria`, `auditoria`)
- Até 15 ocorrências por arquivo

> O Hunspell (`nodehun` + `dictionary-pt`) fica desligado: em strings de código ele reprovava chaves, URLs e termos em inglês (`'sku'`, `'name'`, `'products/varieties'`). No esfera-web, ligá-lo levava de 5 para 78 falhas.

## O que é ignorado

- Linhas de comentário, `import`/`export`/`part`, anotações, `assert`, `print`/`debugPrint`/`log.*`, `RegExp` e `case '...':`
- Strings que não são texto: URLs, caminhos (`assets/`, `/api/x`), `package:`, chaves de mapa (`'id':`, `json['id']`), `Key('...')`, identificadores (`camelCase`, `snake_case`, `CONSTANTE`), datas, cores, UUIDs, números
- Palavras curtas, com acento, com números, termos técnicos (`login`, `token`, `widget`...) e palavras com cara de inglês (`-ing`, `-tion`, `-ment`, `-able`...)
- Testes, arquivos gerados e pastas `/generated/`, `/l10n/`, `/build/`, `/test/`, `/integration_test/`

## Severidade

- **Tipo:** `fail` por palavra, mais uma `message` com o total

## Exemplo

```dart
// ❌ Errado
Text('Configuracao do numero da nota');

// ✅ Correto
Text('Configuração do número da nota');
```

## Referências

- VOLP — Vocabulário Ortográfico da Língua Portuguesa (Academia Brasileira de Letras)
