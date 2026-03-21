# Class Naming Convention

> Verifica se nomes de classes usam substantivos, não verbos (Clean Code)

---

## Regra

**Classes devem ser substantivos. Métodos devem ser verbos.**
— Robert C. Martin, Clean Code

| Tipo | Exemplo correto | Exemplo incorreto |
| :-- | :-- | :-- |
| Repository | `UserRepository` | `GetUserRepository` |
| Datasource | `PaymentDatasource` | `FetchPaymentDatasource` |
| ViewModel | `OrderViewModel` | `CreateOrderViewModel` |

---

## Escopo

Arquivos verificados:
- `domain/repositories/**/*.dart` — interfaces
- `data/repositories/**/*.dart` — implementações
- `data/datasources/**/*.dart`
- `*_viewmodel.dart`

**Não verificado:** UseCases (por padrão arquitetural, verbos são aceitos).

---

## Detecção

Usa [wordpos](https://www.npmjs.com/package/wordpos) (WordNet) para classificação gramatical real:

1. Extrai nome da classe do código fonte
2. Remove sufixos de camada (`Repository`, `Datasource`, `ViewModel`, prefixo `I`)
3. Quebra PascalCase em palavras individuais
4. Verifica cada palavra no WordNet:
   - `isVerb(word) === true` E `isNoun(word) === false` → **verbo proibido**

### Exceções aceitas (agent nouns)

Sufixos como `-er`, `-or`, `-handler`, `-builder`, `-processor`, `-observer`, `-validator` são substantivos derivados de verbos e são permitidos.

```dart
// ✅ Aceitos (agent nouns)
class PaymentProcessor { }
class OrderHandler { }
class DataValidator { }

// ❌ Rejeitados (verbos puros)
class FetchUserRepository { }
class CreateOrderDatasource { }
class DeletePaymentViewModel { }
```

---

## Sugestões automáticas

O plugin sugere alternativas para cada verbo detectado:

| Verbo | Alternativas |
| :-- | :-- |
| `get` / `fetch` | Fetcher, Retriever |
| `create` | Creator, Factory |
| `delete` / `remove` | Deleter, Remover |
| `calculate` | Calculator |
| `validate` | Validator |
| `manage` | Manager |
| `process` | Processor |

---

## Configuração

```typescript
import { classNamingConventionPlugin } from "@felipeduarte26/danger-bot";

executeDangerBot([classNamingConventionPlugin]);
```

---

## Dependências

| Pacote | Versão | Uso |
| :-- | :-- | :-- |
| `wordpos` | 2.1.0 | Classificação gramatical via WordNet |

---

<div align="center">

**[Danger Bot](https://github.com/felipeduarte26/danger-bot)**

</div>
