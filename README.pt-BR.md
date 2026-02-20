<p align="center">
  <img src="docs/assets/logo-placeholder.png" alt="Git Persona Logo" width="80" />
</p>

<h1 align="center">Git Persona</h1>
<p align="center">
  <strong>Gerencie múltiplas identidades Git por meio de uma interface gráfica elegante.</strong><br />
  Alterne entre perfis de trabalho, pessoal e freelance com um único clique.<br />
  Nenhum uso de terminal necessário para o usuário final.
</p>

---

> 📖 **English:** [README.md](README.md)

---

## Capturas de Tela

> 📸 _Em breve. Veja [docs/screenshots.md](docs/screenshots.md) para instruções de geração._

---

## Funcionalidades

- 🪪 **Múltiplos perfis Git**: rótulo, nome e e-mail por perfil (ex.: TRABALHO, PESSOAL)
- ⚡ **Ativação com um clique**: define `git config --global` instantaneamente
- 🐙 **OAuth GitHub**: login via Device Flow, token armazenado no chaveiro do sistema operacional (nunca em texto simples)
- 🌐 **Seletor de navegador**: sempre pergunta qual navegador abrir para OAuth
- 🔐 **Seguro**: Windows Credential Locker, macOS Keychain, Linux libsecret
- 🛠️ **Credential helper**: binário embutido que faz operações HTTPS git funcionarem
- 🖥️ **Ícone na bandeja**: troca rápida de perfil direto na barra de tarefas
- 🚀 **Inicialização automática**: pode ser iniciado junto com o sistema operacional
- 🧩 **Código aberto**: licença MIT

---

## Início Rápido

```bash
git clone https://github.com/osamucadev/gitpersona.git
cd gitpersona
cp .env.example .env           # Adicione seu GITHUB_CLIENT_ID
cd apps/desktop && npm install
npm run tauri:dev
```

Veja o [**guia detalhado de Como Executar**](docs/COMO_EXECUTAR.md) para instruções passo a passo, incluindo como configurar Rust, Node.js e obter um Client ID do GitHub.

---

## Estrutura do Repositório

```
gitpersona/
├── apps/
│   └── desktop/
│       ├── src-ui/          # Frontend React + TypeScript
│       │   ├── components/  # Componentes de UI
│       │   ├── pages/       # Componentes de página
│       │   ├── store/       # Estado Zustand
│       │   ├── lib/         # Utilitários e wrappers de API
│       │   └── types/       # Interfaces TypeScript
│       └── src-tauri/       # Backend Tauri em Rust
│           └── src/
│               └── commands/ # Handlers de comandos Tauri
├── crates/
│   ├── core/                # Tipos Rust compartilhados
│   ├── git/                 # Wrapper para CLI do git
│   ├── auth/                # Cliente GitHub Device Flow
│   └── credential-helper/   # Binário autônomo de credenciais git
├── docs/                    # Documentação e guias
└── Cargo.toml               # Workspace Rust
```

---

## Modelo de Segurança

- Tokens GitHub **nunca são armazenados em texto simples**
- Todos os tokens usam o chaveiro do sistema operacional
- Se o chaveiro não estiver disponível, o app exibe um aviso bloqueante e recusa continuar
- O credential helper só responde para `github.com`, nunca vaza credenciais para outros hosts
- Logs de diagnóstico ocultam strings com formato de token

---

## Licença

MIT © Contribuidores do Git Persona
