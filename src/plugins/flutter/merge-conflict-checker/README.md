# Merge Conflict Checker

Faz `git fetch` e simula merge com `git merge-tree --write-tree HEAD origin/<branch_base>` para detectar **conflitos** entre a branch atual e a base do PR (GitHub, Bitbucket Cloud ou GitLab).

## O que verifica

- Saída do `merge-tree` com marcadores `CONFLICT` e arquivos afetados
- Linha aproximada do conflito a partir dos hunks da saída

## Severidade

- **Tipo:** `fail`

## Exemplo

```text
// ❌ Errado (conteúdo após merge problemático)
<<<<<<< HEAD
  return a;
=======
  return b;
>>>>>>> main

// ✅ Correto
  return resolved();
```

## Referências

- [Resolving merge conflicts (GitHub)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line)
