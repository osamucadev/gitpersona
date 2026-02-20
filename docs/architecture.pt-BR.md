# Git Persona | Arquitetura

> **English:** [architecture.md](architecture.md)

---

## Visão Geral

O Git Persona é um aplicativo desktop Tauri v2. O frontend é construído com React + TypeScript;
o backend é Rust. Eles se comunicam via ponte IPC do Tauri, não HTTP.

```
┌─────────────────────────────────────────────────────────┐
│  Git Persona Desktop App                                │
│                                                         │
│  ┌─────────────────────┐    IPC   ┌──────────────────┐  │
│  │   Frontend React    │ ◄──────► │   Backend Tauri  │  │
│  │   (WebView2)        │          │   (Rust)         │  │
│  │                     │          │                  │  │
│  │  Zustand store      │          │  Comandos        │  │
│  │  Framer Motion      │          │  Estado          │  │
│  │  Tailwind CSS       │          │  Bandeja         │  │
│  └─────────────────────┘          └────────┬─────────┘  │
│                                            │            │
└────────────────────────────────────────────┼────────────┘
                                             │
        ┌────────────────────────────────────┼────────────┐
        │  Crates Rust                       │            │
        │  ┌──────────┐  ┌─────────┐  ┌──────▼─────┐      │
        │  │   core   │  │  git    │  │    auth    │      │
        │  │  (tipos) │  │(CLI git)│  │(OAuth flow)│      │
        │  └──────────┘  └─────────┘  └────────────┘      │
        │                                                 │
        │  ┌────────────────────────────────────────────┐ │
        │  │          credential-helper                 │ │
        │  │     (binário autônomo, invocado pelo git)  │ │
        │  └────────────────────────────────────────────┘ │
        └─────────────────────────────────────────────────┘
```

---

## Fluxo de Dados

### Ativando um Perfil

```
Usuário clica em "Activate"
  → React: chama invoke("activate_profile", { id })
    → Rust: commands/git.rs: activate_profile()
      → lê o perfil do AppState
      → executa git config --global user.name "..."
      → executa git config --global user.email "..."
      → executa git config --global credential.helper "/caminho/gitpersona-helper"
      → atualiza settings.activeProfileId
      → persiste store.json no disco
      → emite evento "profile-activated"
    → React: escuta "profile-activated", atualiza a UI
```

### Autenticação HTTPS do Git

```
Usuário executa: git push origin main
  → git solicita credenciais para github.com
  → git invoca: /caminho/para/gitpersona-helper get
    → helper lê store.json do diretório de dados do app
    → lê activeProfileId
    → obtém token_ref do perfil ativo
    → recupera o token do chaveiro do SO usando token_ref
    → imprime: username=octocat\npassword=ghp_xxx
  → git usa as credenciais para a requisição HTTPS
```

### GitHub OAuth Device Flow

```
Usuário clica em "Connect GitHub"
  → React: githubStartDeviceFlow(profileId)
    → Rust: POST github.com/login/device/code
    → retorna { user_code, verification_uri, device_code }
  → React: exibe user_code, abre BrowserPickerModal
  → Usuário escolhe um navegador
  → React: openUrlInBrowser(verification_uri, browser.executable)
    → Rust: inicia o processo do navegador com a URL
  → React: faz polling a cada N segundos com githubPollDeviceFlow
    → Rust: POST github.com/login/oauth/access_token
    → no sucesso: GET github.com/user para obter o username
    → armazena o token no chaveiro do SO via crate keyring
    → armazena profile.github.username, profile.github.tokenRef (não o token)
    → persiste store.json
  → React: exibe sucesso, fecha modal
```

---

## Modelo de Segurança

### Armazenamento de Tokens

Todos os tokens de acesso GitHub são armazenados **exclusivamente** no chaveiro do SO:
- **Windows:** Windows Credential Locker (crate `keyring` via DPAPI)
- **macOS:** macOS Keychain Services
- **Linux:** libsecret (GNOME Keyring / KWallet)

O arquivo `store.json` no disco contém apenas uma **referência ao token** (`tokenRef`) —
um nome de chave usado para buscar o token no chaveiro. O token em si nunca é gravado no disco.

Se o chaveiro não estiver disponível, o app exibe um erro bloqueante e recusa continuar.

### Segurança do Credential Helper

O credential helper (`gitpersona-helper`) é um binário autônomo que:
1. Só responde à ação `get` (ignora `store` e `erase`)
2. Só fornece credenciais para hosts `github.com`
3. Lê o token do chaveiro do SO — nunca de arquivo de texto simples
4. Se não houver perfil ativo ou conta GitHub conectada, não imprime nada

### Redação de Logs

A função `redact()` em `crates/core/src/lib.rs` escaneia strings em busca de padrões
de token GitHub (`ghp_`, `gho_`, etc.) e os substitui por `[REDACTED]` antes de logar.

---

## Seleção de Navegador

### Por Que Sempre É Perguntado

Conforme os requisitos de segurança e UX, o app sempre pergunta qual navegador abrir
antes de navegar para a URL de verificação do GitHub. Isso evita redirecionamentos
silenciosos para um navegador inesperado.

### Detecção de Navegadores (Windows)

No Windows, os navegadores são detectados lendo caminhos conhecidos no registro:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\<browser>.exe
```

Navegadores verificados: Chrome, Edge, Firefox, Brave, Opera, Vivaldi.

### Fallback "System Open With"

Se o usuário selecionar "System Open With", o app usa:
```
rundll32.exe shell32.dll,OpenAs_RunDLL <url>
```

Isso aciona o diálogo do Windows "Como você deseja abrir isso?".

---

## Credential Helper — Fluxo Detalhado

### Registro

Quando `activate_profile` é executado, ele chama:
```
git config --global credential.helper /caminho/absoluto/gitpersona-helper
```

### Invocação

O git invoca helpers de credenciais como:
```
gitpersona-helper get
```

E envia payload key=value via stdin:
```
protocol=https
host=github.com
```

O helper lê stdin, verifica que o host é `github.com`, recupera e imprime as credenciais.

---

## Gerenciamento de Estado

### Estado em Memória (Rust)

`AppState` (`src/state.rs`) mantém o `AppStore` completo em um `Mutex<AppStateInner>`.
Todos os comandos Tauri bloqueiam este mutex para ler ou mutar o estado, então chamam
`persist_store()` para escrever alterações no disco como JSON.

### Persistência (disco)

`store.json` fica no diretório de dados local do app Tauri. Contém:
- Todos os perfis (sem tokens)
- Configurações do app

### Estado em Memória (React)

Zustand (`src-ui/store/useStore.ts`) espelha o estado do backend no frontend.

---

## Ícone na Bandeja

O ícone na bandeja (`src/tray.rs`) é construído usando o `TrayIconBuilder` do Tauri.
O menu é gerado dinamicamente a partir da lista de perfis atual.

---

## Inicialização Automática

A inicialização automática é gerenciada pelo plugin `tauri-plugin-autostart`.

No Windows, ele escreve em `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`.
