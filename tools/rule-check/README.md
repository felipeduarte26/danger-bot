# rule-check: falso positivo de uma regra num projeto real

Roda **uma regra** sobre um projeto Flutter inteiro, como se o PR tivesse criado todos os arquivos
`.dart`, e confere se os achados são os mesmos com o código formatado em outras larguras. Serve para
um plugin do pacote e para uma regra local do projeto. Diferente da [paridade](../parity/README.md),
não depende do esfera: funciona em qualquer projeto.

```bash
npm run build   # a ferramenta usa o dist/

# plugin do pacote, pelo nome
node tools/rule-check/check.cjs --project ../meu-app --rule positional-bool-params --widths 40,160

# regra local (.ts ou .js), importada no dangerfile.ts ou apontada em local_plugins
node tools/rule-check/check.cjs --project ../meu-app --rule ../meu-app/danger/rules/minha-regra.ts --widths 40,160 --lint
```

| Opção                    | O que faz                                                                                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--project <dir>`        | O projeto: os `.dart` versionados no git (fora do git, os de `lib/` e `test/`).                                                                                                                             |
| `--rule <nome\|arquivo>` | Plugin do pacote (`mediaquery-modern`) ou caminho de uma regra local.                                                                                                                                       |
| `--widths 40,160`        | Formata uma cópia com `dart format --page-width` em cada largura e compara os achados (arquivo + título, sem o número da linha).                                                                            |
| `--lint`                 | Só para regra local: aplica as proibições do `eslint.config.js` do pacote (regex no código, `split("\n")`, contar chaves, helpers legados, membros `@internal`), com a configuração de `eslint.config.mjs`. |
| `--full`                 | Imprime a mensagem inteira de cada achado (título, Errado/Correto, ação, referência).                                                                                                                       |
| `--dist <dir>`           | Outro build (ex.: o de um `git worktree`, para comparar versões). Padrão: `dist/` deste repo.                                                                                                               |
| `-v`                     | Mostra o log da regra.                                                                                                                                                                                      |

O código de saída é `0` quando tudo bate, `1` quando o lint falha ou a regra quebra, e `2` quando
alguma largura muda o resultado.

## Como roda

- **cwd:** o diretório do projeto, então o `danger-bot.yaml` dele vale (`paths.features`, por exemplo). O
  `ignore_files` não entra: todos os arquivos são analisados.
- **Danger simulado:** `created_files` com todos os `.dart`, e o `structuredDiffForFile` com o
  arquivo inteiro adicionado, no formato do CI (prefixo `+`). Não há PR: `danger.github` não existe, e
  regra que lê o PR (título, commits) não tem o que analisar.
- **Regra local:** o import de `@felipeduarte26/danger-bot` aponta para o `dist/`, e o `.ts` é
  transpilado na hora, só apagando os tipos. Import relativo entre regras funciona.
- **Sem rede:** o `fetch` falha na hora (o identifier-language não fica esperando o Google Translate).
- **Fora do alcance:** regra que depende de saída de ferramenta (`flutter test`, `flutter analyze`,
  `lcov.info`, `CHANGELOG.md`) roda, mas sem esses dados não aponta nada. Para essas, use o
  `dry-run` ou o `danger pr` do projeto.

## O que conferir no resultado

1. **Projeto inteiro:** cada achado tem de ser um problema de verdade. Um só que esteja errado já é um
   falso positivo a corrigir antes de entregar.
2. **Larguras:** `igual` em todas. Se mudar, a regra depende de quebra de linha. A exceção é uma regra
   que mede linhas (ex.: o tamanho de uma classe), e aí a diferença tem de ser explicada.
3. **Casos montados:** crie uma pasta temporária com a estrutura do projeto (`lib/modules/x/...`,
   o `danger-bot.yaml` se a regra usar `paths.features`), com os casos que devem ser apontados e os
   que não devem, e rode a ferramenta nela também.
