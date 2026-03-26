# PR Summary

Gera um **comentário Markdown** com visão da PR: contagens de arquivos, linhas +/-, breakdown por tipo (Dart, testes, gerados, config, …), camadas (domain/data/presentation/core), risco heurístico, arquivos em destaque e checklist de testes/plataformas.

## O que verifica

- Não é regra de código: agrega `git.created_files`, `modified_files`, `deleted_files`, `insertions`, `deletions`

## Severidade

- **Tipo:** `message`

## Exemplo

```markdown
<!-- Exemplo de saída (conceito) -->
🟡 Resumo da PR — Média

| Métrica | Valor |
| :-- | :-- |
| Arquivos | 12 (**+2** novo(s) · **10** modificado(s)) |
| Dart | **8** arquivo(s) |
```

## Referências

— (plugin interno de sumarização)
