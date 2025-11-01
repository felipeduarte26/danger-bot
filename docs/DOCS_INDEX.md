# 📚 Documentação do Danger Bot

## 🎯 Índice de Guias

### Para Começar

1. **[README.md](../README.md)** - Visão geral do projeto

   - O que é o Danger Bot
   - Lista de plugins
   - **Nova CLI incluída!**
   - Exemplo de uso rápido

2. **[INSTALLATION.md](INSTALLATION.md)** ⭐ **RECOMENDADO PARA INICIANTES**

   - **Guia completo passo a passo**
   - **Especial para projetos Flutter sem package.json**
   - Configuração do zero
   - Estrutura de arquivos
   - Scripts npm
   - Solução de problemas

3. **[CLI_GUIDE.md](CLI_GUIDE.md)** ⭐ **NOVO!**
   - **Guia completo da CLI**
   - Criar plugins interativamente
   - Listar e validar plugins
   - Gerar dangerfile automaticamente
   - Exemplos práticos

### Para Usar em Produção

4. **[PIPELINE_GUIDE.md](PIPELINE_GUIDE.md)** - Guia completo de pipelines

   - Configuração de CI/CD
   - GitHub Actions, Bitbucket, GitLab, CircleCI, etc
   - Variáveis de ambiente
   - Requisitos do ambiente
   - Exemplos práticos

5. **[SIMPLIFIED_INSTALL.md](SIMPLIFIED_INSTALL.md)** - Instalação simplificada
   - Por que danger é incluído automaticamente
   - Estrutura de instalação
   - Comparação antes/depois

### Para Entender o Projeto

6. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Guia de configuração

   - Como o projeto está estruturado
   - Opções de publicação (NPM, Git, GitHub Packages)
   - Desenvolvimento local
   - Criação de novos plugins

7. **[PIPELINE_READY.md](PIPELINE_READY.md)** - Resumo executivo

   - Confirmação de que está pronto para pipelines
   - Checklist de funcionamento
   - Requisitos
   - Conclusão

8. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitetura dos plugins
   - Estrutura modular
   - Barrel files
   - Documentação integrada
   - Padrões de nomenclatura

---

## 🚀 Início Rápido por Caso de Uso

### 📱 "Tenho um projeto Flutter e quero adicionar Danger Bot"

👉 Leia: **[INSTALLATION.md](INSTALLATION.md)**

**Você vai aprender:**

- Como inicializar Node.js no projeto Flutter
- Como instalar o danger-bot
- Como criar dangerfile.ts
- Como configurar tudo do zero

---

### 🔧 "Já tenho package.json, só quero instalar"

👉 Leia: **[README.md](README.md)** (seção Instalação)

**Comando:**

```bash
npm install --save-dev danger-bot@git+https://github.com/diletta/danger-bot.git#v1.0.0
```

---

### 🏗️ "Quero configurar no meu CI/CD"

👉 Leia: **[PIPELINE_GUIDE.md](PIPELINE_GUIDE.md)**

**Você vai aprender:**

- Configuração para cada CI/CD
- Variáveis de ambiente necessárias
- Requisitos do ambiente
- Troubleshooting

---

### 🎓 "Quero entender como funciona"

👉 Leia: **[SETUP_GUIDE.md](SETUP_GUIDE.md)**

**Você vai aprender:**

- Arquitetura do projeto
- Como criar novos plugins
- Como contribuir
- Opções de distribuição

---

### ✅ "Quero confirmar se funciona em pipeline"

👉 Leia: **[PIPELINE_READY.md](PIPELINE_READY.md)**

**Você vai ver:**

- Confirmação de que está 100% pronto
- O que foi feito para funcionar em pipeline
- Checklist completo
- Compatibilidade

---

## 📋 Estrutura dos Documentos

```
danger-bot/
├── 📘 README.md                    # Visão geral e uso rápido
├── 📗 INSTALLATION.md              # ⭐ Guia completo de instalação
├── 📙 PIPELINE_GUIDE.md            # Configuração de CI/CD
├── 📕 SIMPLIFIED_INSTALL.md        # Por que danger vem incluído
├── 📓 SETUP_GUIDE.md               # Estrutura e desenvolvimento
├── 📔 PIPELINE_READY.md            # Confirmação de prontidão
└── 📖 DOCS_INDEX.md                # Este arquivo
```

---

## 🎯 Fluxo de Leitura Recomendado

### Para Novos Usuários:

```
1. README.md (5 min)
   ↓
2. INSTALLATION.md (15 min) ⭐
   ↓
3. PIPELINE_GUIDE.md (10 min)
   ↓
4. Começar a usar!
```

### Para Desenvolvedores:

```
1. README.md (5 min)
   ↓
2. SETUP_GUIDE.md (10 min)
   ↓
3. src/plugins/ (explorar código)
   ↓
4. Criar seu plugin!
```

### Para DevOps/CI:

```
1. PIPELINE_GUIDE.md (15 min) ⭐
   ↓
2. PIPELINE_READY.md (5 min)
   ↓
3. Configurar CI/CD
```

---

## 🔍 Busca Rápida

### Preciso de:

| O que                                           | Documento                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| Instalar do zero                                | [INSTALLATION.md](INSTALLATION.md)                                        |
| Configurar GitHub Actions                       | [PIPELINE_GUIDE.md](PIPELINE_GUIDE.md#github-actions)                     |
| Criar plugin personalizado                      | [README.md](README.md#personalizar-plugins)                               |
| Entender por que só preciso instalar danger-bot | [SIMPLIFIED_INSTALL.md](SIMPLIFIED_INSTALL.md)                            |
| Ver lista de plugins                            | [README.md](README.md#-funcionalidades)                                   |
| Troubleshooting                                 | [INSTALLATION.md](INSTALLATION.md#-solução-de-problemas)                  |
| Variáveis de ambiente                           | [PIPELINE_GUIDE.md](PIPELINE_GUIDE.md#-variáveis-de-ambiente-necessárias) |
| Verificar compatibilidade                       | [PIPELINE_READY.md](PIPELINE_READY.md#-compatibilidade)                   |

---

## 💡 Dicas de Navegação

- **Iniciantes**: Comece pelo INSTALLATION.md
- **Experientes**: README.md é suficiente
- **DevOps**: Vá direto ao PIPELINE_GUIDE.md
- **Curiosos**: Leia tudo! 😄

---

## 🆘 Ainda com Dúvidas?

1. 🔍 Pesquise nos documentos (Ctrl+F)
2. 📖 Veja os exemplos nos guias
3. 🐛 Abra uma issue no GitHub

---
