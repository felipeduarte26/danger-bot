# AI Code Review

Envia o conteúdo de arquivos `.dart` alterados para o **Google Gemini** (`gemini-2.5-flash-lite`) e publica no PR avisos com sugestões de revisão (bugs, SOLID, Clean Architecture, segurança, Flutter). Ignora gerados, testes, `l10n` e arquivos muito curtos. Suporta rotação de API keys e limites de taxa.

## O que verifica

- Arquivos criados/modificados em `.dart` (com filtros do código)
- Resposta da IA: se não for “aprovado”, emite aviso com o texto retornado
- Ausência de keys: apenas log (não falha o PR)

## Severidade

- **Tipo:** `warn` (e `message` para resumos finais)

## Exemplo

```dart
// ❌ Errado (a IA pode apontar)
await fetch();
setState(() => _x = 1); // sem mounted após await

// ✅ Correto
if (!mounted) return;
setState(() => _x = 1);
```

## Referências

- [Google AI — Gemini API](https://ai.google.dev/)
