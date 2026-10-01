# Folder Naming Convention

Garante que as pastas de agrupamento da Clean Architecture usem o nome no **plural**. Olha os caminhos dos arquivos `.dart` criados/modificados (exceto testes) e reporta cada pasta no singular **uma vez**, mesmo que vários arquivos dela estejam na PR.

## O que verifica

| Camada | Singular (errado) | Plural (correto) |
| ------ | ----------------- | ---------------- |
| domain | `usecase/`, `entity/`, `failure/`, `repository/` | `usecases/`, `entities/`, `failures/`, `repositories/` |
| data | `datasource/`, `model/`, `repository/` | `datasources/`, `models/`, `repositories/` |
| presentation | `viewmodel/`, `view/`, `widget/` | `viewmodels/`, `views/`, `widgets/` |

A regra vale para a pasta logo abaixo da camada (`.../domain/usecase/...`).

## Severidade

- **Tipo:** `fail` (na linha 1 do primeiro arquivo encontrado na pasta)

## Exemplo

```text
❌ Errado
features/budget/
└── domain/
    └── usecase/
        └── get_budget_usecase.dart

✅ Correto
features/budget/
└── domain/
    └── usecases/
        └── get_budget_usecase.dart
```

## Referências

- [Flutter Clean Architecture — Folder Structure](https://resocoder.com/flutter-clean-architecture-tdd/)
