# Identifier Language

> Detecta nomes de classes, métodos e variáveis em português no código Dart

---

## Visão Geral

Garante que o código siga o padrão do projeto: **identificadores 100% em inglês**.

Analisa:
- Nomes de classes (`class Pessoa` → warn)
- Nomes de métodos (`void calcularPreco()` → warn)
- Nomes de variáveis (`final String nome` → warn)
- Nomes de enums (`enum StatusPedido` → warn)

---

## Como Funciona

1. Extrai identificadores de cada arquivo `.dart` modificado
2. Quebra camelCase/PascalCase/snake_case em palavras individuais
3. Verifica cada palavra contra um dicionário de ~400 palavras portuguesas comuns em código
4. Ignora palavras ambíguas que existem em português e inglês (ex: `data`, `status`, `total`)
5. Reporta inline no PR com a lista de identificadores encontrados

---

## Exemplos

### Entrada (código Dart)

```dart
class Pessoa {
  final String nome;
  final int idade;

  void calcularPreco() { ... }
}
```

### Saída no PR

> **Identificadores em português detectados**
>
> O padrão do projeto é código em inglês.
>
> `Pessoa` (classe) — palavras: pessoa
> `nome` (variável) — palavras: nome
> `idade` (variável) — palavras: idade
> `calcularPreco` (método) — palavras: calcular, preco

---

## Configuração

```typescript
import { identifierLanguagePlugin } from "@felipeduarte26/danger-bot";

// Usar com todos os plugins
executeDangerBot([identifierLanguagePlugin]);

// Desabilitar
identifierLanguagePlugin.config.enabled = false;
```

---

## Arquivos Ignorados

- `*_test.dart` — arquivos de teste
- `*.g.dart` — código gerado
- `*.freezed.dart` — código gerado pelo Freezed

---

<div align="center">

**[Danger Bot](https://github.com/felipeduarte26/danger-bot)**

</div>
