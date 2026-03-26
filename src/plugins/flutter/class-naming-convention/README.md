# Class Naming Convention

Em Entity, Repository, Datasource e ViewModel (por pasta ou sufixo `*_viewmodel.dart`), verifica se o **nome da classe** usa substantivos (Clean Code): detecta verbos via **wordpos** (WordNet) e lista fixa de verbos/ações. **Use cases** em `/usecases/` são ignorados.

## O que verifica

- Se `wordpos` não estiver disponível, o plugin **não roda** (apenas log)
- Palavras agentivas (`-Handler`, `-Builder`, etc.) são tratadas como substantivos aceitáveis
- Classes com verbos no núcleo do nome (ex.: primeiro termo em lista de ações) geram falha

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado (Entity em .../entities/)
class FetchUserEntity { }

// ✅ Correto
class UserEntity { }
```

## Referências

- [Clean Code — naming](https://medium.com/@mikhailhusyev/writing-clean-code-naming-variables-functions-methods-and-classes-6074a6796c7b)
