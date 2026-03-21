"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Detecta uso de late final
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "late-final-checker",
    description: "Detecta uso de late final",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const dartFiles = (0, _types_1.getDartFiles)();
    for (const file of dartFiles) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c) => c.content).join("\n");
        // Detectar late final sem inicialização
        const lateMatches = fileText.matchAll(/late\s+final\s+(\w+)\s+(\w+);/g);
        for (const match of lateMatches) {
          await (0, _types_1.sendWarn)(
            `## ⚠️ USO DE LATE FINAL DETECTADO

Uso de \`late final\` encontrado: \`${match[0]}\`

---

### ⚠️ Problema Identificado

\`late final\` pode causar:
- 🐛 Runtime errors se acessado antes de inicializar
- 📉 Código menos seguro
- 🤔 Dificuldade de debug

---

### 🎯 AÇÃO NECESSÁRIA

**Prefira alternativas mais seguras:**

\`\`\`dart
// ❌ EVITE (se possível)
class MyClass {
  late final String name;
  
  void init() {
    name = 'John';  // Pode esquecer de chamar init()
  }
}

// ✅ MELHOR: Inicialização no constructor
class MyClass {
  final String name;
  
  MyClass({required this.name});
}

// ✅ MELHOR: Nullable + inicialização tardia
class MyClass {
  String? _name;
  String get name => _name ?? throw StateError('Not initialized');
  
  void init(String value) {
    _name = value;
  }
}

// ✅ ACEITÁVEL: late final com garantia de inicialização
class _MyWidgetState extends State<MyWidget> {
  late final AnimationController controller;
  
  @override
  void initState() {
    super.initState();
    controller = AnimationController(vsync: this);  // ✓ Sempre inicializado
  }
}
\`\`\`

---

### 🚀 Objetivo

Evitar **runtime errors** e tornar código mais **previsível**.

> **Dica:** Use \`late final\` apenas quando absolutamente necessário!`,
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
