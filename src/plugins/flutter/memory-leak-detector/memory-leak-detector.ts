/**
 * Detecta possíveis memory leaks
 */
import { createPlugin, getDanger, sendFail, sendWarn, getDartFiles } from "@types";

export default createPlugin(
  {
    name: "memory-leak-detector",
    description: "Detecta possíveis memory leaks",
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const dartFiles = getDartFiles();

    for (const file of dartFiles) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c: any) => c.content).join("\n");

        // Detectar Controllers sem dispose
        if (fileText.match(/\w+Controller\s+\w+/) && fileText.includes("State<")) {
          if (!fileText.includes("dispose()") || !fileText.includes(".dispose()")) {
            await sendFail(
              `## 💧 VAZAMENTO DE MEMÓRIA - CONTROLLER SEM DISPOSE

Controller detectado mas sem \`dispose()\` correspondente.

---

### ⚠️ Problema Identificado

Controllers **não dispostos** causam:
- 💾 Vazamento de memória
- 📱 App mais lento com o tempo
- 🔋 Maior consumo de bateria
- 💥 Possível crash por falta de memória

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
class MyPageState extends State<MyPage> {
  final TextEditingController controller = TextEditingController();
  // ❌ Sem dispose!
}

// ✅ CORRETO
class MyPageState extends State<MyPage> {
  late final TextEditingController controller;
  
  @override
  void initState() {
    super.initState();
    controller = TextEditingController();
  }
  
  @override
  void dispose() {
    controller.dispose();  // ✅ Limpa recursos
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return TextField(controller: controller);
  }
}
\`\`\`

---

### 🚀 Objetivo

Prevenir **vazamentos de memória** e manter app **performático**.

> **Regra:** Todo Controller/Stream/Timer deve ter dispose()!`,
              file,
              1
            );
          }
        }

        // Detectar Timer sem cancel
        if (fileText.includes("Timer.periodic") || fileText.includes("Timer(")) {
          if (!fileText.includes(".cancel()")) {
            await sendWarn(
              `## 💧 VAZAMENTO - TIMER SEM CANCEL

Timer detectado sem \`.cancel()\` correspondente.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
class MyState extends State<MyWidget> {
  Timer.periodic(Duration(seconds: 1), (timer) {
    print('tick');
  });
}

// ✅ CORRETO
class MyState extends State<MyWidget> {
  Timer? _timer;
  
  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(Duration(seconds: 1), (timer) {
      print('tick');
    });
  }
  
  @override
  void dispose() {
    _timer?.cancel();  // ✅ Cancela timer
    super.dispose();
  }
}
\`\`\``,
              file,
              1
            );
          }
        }

        // Detectar StreamSubscription sem cancel
        if (fileText.includes("StreamSubscription")) {
          if (!fileText.includes(".cancel()")) {
            await sendWarn(
              `## 💧 VAZAMENTO - STREAM SEM CANCEL

StreamSubscription sem \`.cancel()\`.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ✅ CORRETO
class MyState extends State<MyWidget> {
  StreamSubscription? _subscription;
  
  @override
  void initState() {
    super.initState();
    _subscription = stream.listen((data) {
      // handle data
    });
  }
  
  @override
  void dispose() {
    _subscription?.cancel();  // ✅ Cancela subscription
    super.dispose();
  }
}
\`\`\``,
              file,
              1
            );
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  }
);
