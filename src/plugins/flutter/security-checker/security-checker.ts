/**
 * Detecta problemas de segurança
 */
import { createPlugin,  getDanger, sendFail, getDartFiles  } from '@types';

export default createPlugin(
  {
    name: 'security-checker',
    description: 'Detecta problemas de segurança',
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const dartFiles = getDartFiles();
    
    for (const file of dartFiles) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c: any) => c.content).join('\n');
        
        // Detectar API keys hardcoded
        const apiKeyPatterns = [
          /['"]AIza[0-9A-Za-z-_]{35}['"]/,  // Google API
          /['"]sk-[A-Za-z0-9]{48}['"]/,     // OpenAI
          /['"]AKIA[0-9A-Z]{16}['"]/,       // AWS
        ];
        
        for (const pattern of apiKeyPatterns) {
          if (fileText.match(pattern)) {
            sendFail(
              `## 🔒 SEGURANÇA - API KEY HARDCODED

API Key detectada no código fonte!

---

### ⚠️ RISCO CRÍTICO DE SEGURANÇA

**Consequências:**
- 🚨 Exposição de credenciais
- 💰 Uso não autorizado (custos)
- 🔓 Acesso a recursos privados
- ⚠️ Violação de segurança

---

### 🎯 AÇÃO NECESSÁRIA IMEDIATA

1. **REMOVA** a API key do código
2. **REVOGUE** a key no serviço (considere comprometida)
3. **GERE** nova key
4. **USE** variáveis de ambiente

\`\`\`dart
// ❌ PERIGO - NUNCA FAÇA ISSO
const apiKey = 'AIzaSyD-9tNTn...'; // ❌ Hardcoded!

// ✅ CORRETO - Use variáveis de ambiente
const apiKey = String.fromEnvironment('API_KEY');

// ✅ CORRETO - Use .env (com flutter_dotenv)
import 'package:flutter_dotenv/flutter_dotenv.dart';

final apiKey = dotenv.env['API_KEY'] ?? '';

// ✅ CORRETO - Use Firebase Remote Config
final apiKey = await remoteConfig.getString('api_key');
\`\`\`

**Arquivo .env.example:**
\`\`\`bash
# .env.example (commit este)
API_KEY=your_key_here
SECRET_KEY=your_secret_here

# .env (NÃO commite este - adicione ao .gitignore)
API_KEY=AIzaSyD...
SECRET_KEY=sk-...
\`\`\`

**Adicione ao .gitignore:**
\`\`\`
.env
*.env
\`\`\`

---

### 🚀 Objetivo

Proteger **credenciais** e evitar **vazamentos de segurança**.

> **IMPORTANTE:** Trate keys hardcoded como **incident de segurança**!`,
              file,
              1
            );
          }
        }
        
        // Detectar eval()
        if (fileText.includes('eval(')) {
          sendFail(
            `## 🔒 SEGURANÇA - USO DE EVAL()

Uso de \`eval()\` detectado - **ALTO RISCO**.

---

### ⚠️ PROBLEMA

\`eval()\` permite:
- 💉 Injeção de código
- 🐛 Execução de código malicioso
- 🔓 Vulnerabilidades de segurança

---

### 🎯 AÇÃO NECESSÁRIA

**Remova \`eval()\` e use alternativas seguras:**

\`\`\`dart
// ❌ PERIGO
final result = eval(userInput);  // Code injection!

// ✅ CORRETO - Parse seguro
final result = int.tryParse(userInput);

// ✅ CORRETO - Whitelist de operações
final allowedOperations = {'add': (a, b) => a + b};
final result = allowedOperations[operation]?.call(a, b);
\`\`\`

---

### 🚀 Objetivo

Prevenir **injeção de código** e manter app **seguro**.`,
            file,
            1
          );
        }
      } catch (e) {
        // Ignore
      }
    }
    }
);