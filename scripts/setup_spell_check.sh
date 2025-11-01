#!/bin/bash
# Setup spell check durante pipeline - não deixa arquivos no projeto final

set -e

echo "🔤 Configurando cspell (VSCode Spell Checker) para pipeline..."

# 1. Verificar se Node.js existe
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado! Certifique-se de que Node.js foi instalado."
    exit 1
fi

# 2. REMOVIDO: Não criar package.json - ele já existe na raiz!
# O npm install já foi executado no step anterior com cspell incluído

# 3. Extrair palavras personalizadas do VSCode settings.json
echo "📝 Extraindo palavras do VSCode settings.json..."
VSCODE_WORDS=""
if [ -f ".vscode/settings.json" ]; then
    # Usar Node.js para extrair cSpell.words do JSON
    VSCODE_WORDS=$(node -e "
        try {
            const fs = require('fs');
            const settings = JSON.parse(fs.readFileSync('.vscode/settings.json', 'utf8'));
            const words = settings['cSpell.words'] || [];
            console.log(JSON.stringify(words));
        } catch(e) {
            console.log('[]');
        }
    ")
else
    VSCODE_WORDS="[]"
fi

# 4. Criar lista combinada de palavras (base + VSCode)
BASE_WORDS='["viewmodel", "usecase", "datasource", "dto", "auth", "config", "admin", "navbar", "sidebar", "dropdown", "popup", "integrator", "dashboard", "analytics", "workflow", "notification", "realtime", "offline", "sync", "async", "api", "endpoint", "serializable"]'

COMBINED_WORDS=$(node -e "
    const base = $BASE_WORDS;
    const vscode = $VSCODE_WORDS;
    const combined = [...new Set([...base, ...vscode])];
    console.log(JSON.stringify(combined));
")

echo "✅ Palavras encontradas no VSCode: $VSCODE_WORDS"
echo "✅ Total de palavras no dicionário: $(echo $COMBINED_WORDS | node -e 'console.log(JSON.parse(require("fs").readFileSync("/dev/stdin", "utf8")).length)')"

# 5. Criar configuração cspell com palavras combinadas
cat > cspell.config.json << EOF
{
  "version": "0.2",
  "language": "en",
  "languageSettings": [
    {
      "languageId": "dart",
      "includeRegExpList": [
        "\\\\b[A-Z][a-zA-Z0-9]*\\\\b",
        "\\\\b[a-z][a-zA-Z0-9]*\\\\b",
        "\\\\b_[a-zA-Z0-9]+\\\\b"
      ]
    }
  ],
  "dictionaries": [
    "software-terms",
    "dart",
    "flutter",
    "custom-terms"
  ],
  "dictionaryDefinitions": [
    {
      "name": "custom-terms",
      "words": $COMBINED_WORDS
    }
  ],
  "ignoreWords": [],
  "import": [],
  "overrides": []
}
EOF

echo "✅ cspell configurado com sucesso!"

