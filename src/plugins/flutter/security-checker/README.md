# Security Checker

Varre Dart alterado e arquivos tocados pelo PR em busca de **credenciais** e **artefatos sensíveis** (regex para keys JWT, AWS, Stripe, etc.; arquivos `.env`, keystores, plist/json do Firebase, …).

## O que verifica

- Padrões de segredo em linhas não comentadas de `.dart` (exclui testes/mocks)
- Nomes de arquivo sensíveis entre criados/modificados
- `.gitignore` sem entradas recomendadas → **`warn`** agrupado

## Severidade

- **Tipo:** `fail` (segredos / arquivos sensíveis) e `warn` (gitignore)

## Exemplo

```dart
// ❌ Errado
const apiKey = 'AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// ✅ Correto
const apiKey = String.fromEnvironment('API_KEY');
```

## Referências

- [OWASP — Secrets management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
