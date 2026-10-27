# Paridade dos plugins (antes × depois)

Ferramenta de manutenção: roda os plugins de duas versões do código sobre o mesmo esfera-web e compara
tudo o que eles publicam (mensagem, arquivo, linha, comandos externos e envios HTTP). Foi usada na
migração dos plugins para o modelo Dart e serve para validar qualquer mudança em `src/dart/` ou num
plugin. Os dados ficam em `.parity/` (ignorada pelo git) ou em `PARITY_DIR`.

## Preparar (uma vez, ~5 min)

```bash
npm install
tools/parity/setup.sh <ref-de-referência>   # ex.: main, HEAD~1, um hash; padrão HEAD
```

Cria o clone do esfera (`ESFERA=...`, padrão `../../Diletta/esfera-web`), compila a referência
(`.parity/base-dist`) e roda o baseline em todos os cenários:

| Cenário                          | O que é                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `full-created` / `full-modified` | os ~4.970 arquivos do esfera como criados/modificados; diff = arquivo inteiro |
| `pr1`..`pr6`                     | PRs reais do esfera, com o diff real (`PARITY_PRS` troca os merges usados)    |
| `pr4-solo`                       | o `pr4` sem nenhum outro plugin ativo (ex.: changelog-checker)                |
| `fmt40` / `fmt160`               | o esfera passado no `dart format` com 40 e 160 colunas                        |

## Comparar uma versão nova

```bash
tools/parity/build.sh novo                       # compila o src/ atual em .parity/novo-dist
tools/parity/ab.sh novo [plugin...]              # roda (sem plugins: todos)
tools/parity/cmp-all.sh novo [--only a,b] [--detail plugin|all]
node tools/parity/self-consistency.cjs novo <plugin>   # mesmos achados em 80/40/160 colunas
```

Critério usado na migração:

- nos cenários reais (`full-*`, `pr*`), saída idêntica — ou só remoção de falso positivo, explicada;
- nenhum report novo nos cenários reais sem decisão do dono;
- autoconsistência 0/0: o resultado não pode depender de quebra de linha.

No ambiente do harness, `flutter`/`dart`/`git fetch|merge-tree|blame` respondem vazio (o comando fica
registrado), o Google Translate fica offline e Gemini/webhook respondem vazio (o envio fica registrado).
