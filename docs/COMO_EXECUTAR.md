# Como Executar o Git Persona | Guia do Desenvolvedor

Este guia explica tudo o que você precisa para executar o Git Persona a partir do código-fonte,
partindo de uma máquina completamente zerada até o aplicativo rodando.

---

## Pré-requisitos

Você precisa de três coisas instaladas antes de começar:

### 1. Rust (com Cargo)

Rust alimenta o backend Tauri e toda a lógica nativa.

**Instale o Rust:** https://rustup.rs

No Windows, execute no PowerShell:
```powershell
winget install Rustlang.Rustup
# OU acesse https://rustup.rs e execute o instalador
```

Após instalar, abra um **novo terminal** e verifique:
```bash
rustc --version   # deve exibir ex.: rustc 1.78.0
cargo --version   # deve exibir ex.: cargo 1.78.0
```

### 2. Node.js (v20 ou posterior)

Node.js alimenta a compilação do frontend React.

**Instale o Node.js:** https://nodejs.org (escolha a versão LTS)

Ou use `winget` no Windows:
```powershell
winget install OpenJS.NodeJS.LTS
```

Verifique:
```bash
node --version    # deve exibir v20.x ou posterior
npm --version     # deve exibir 10.x ou posterior
```

### 3. Git

O Git deve estar instalado e no PATH do sistema.

**Instale o Git:** https://git-scm.com/downloads

Verifique:
```bash
git --version     # deve exibir git version 2.x
```

### 4. Pré-requisitos do Tauri (específico para Windows)

No **Windows**, o Tauri requer:
- **Microsoft C++ Build Tools** ou **Visual Studio** com o componente "Desenvolvimento para Desktop com C++"
- **WebView2** (geralmente pré-instalado no Windows 11)

Instale as Build Tools:
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
# Execute o instalador e selecione "Desenvolvimento para Desktop com C++"
```

Lista completa de requisitos: https://tauri.app/start/prerequisites/

---

## Passo 1: Clonar o Repositório

```bash
git clone https://github.com/osamucadev/gitpersona.git
cd gitpersona
```

---

## Passo 2: Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Abra o arquivo `.env` em um editor de texto e preencha seu `GITHUB_CLIENT_ID`.

### Como Obter um Client ID do GitHub

1. Acesse https://github.com/settings/developers
2. Clique em **"New OAuth App"**
3. Preencha:
   - **Application name:** `Git Persona Dev`
   - **Homepage URL:** `http://localhost`
   - **Authorization callback URL:** `http://localhost`
4. Clique em **Register application**
5. Copie o **Client ID** e cole no arquivo `.env`

```env
GITHUB_CLIENT_ID=Ov23liABCDEF1234567890
```

> **Nota:** O Client Secret **não** é necessário. O Git Persona usa o Device Flow, que não precisa de segredo.

---

## Passo 3: Instalar Dependências do Frontend

```bash
cd apps/desktop
npm install
```

---

## Passo 4: Executar em Modo de Desenvolvimento

Na pasta `apps/desktop`:

```bash
npm run tauri:dev
```

Este comando:
1. Inicia o servidor de desenvolvimento Vite (frontend React, hot reload)
2. Compila o backend Rust (leva ~1-2 minutos na primeira vez)
3. Compila o binário do credential helper
4. Abre a janela Tauri

> **A primeira compilação é lenta (2–5 minutos).** Execuções posteriores são rápidas.

---

## Passo 5: Compilar para Produção (Opcional)

```bash
npm run tauri:build
```

O instalador estará em:
- `apps/desktop/src-tauri/target/release/bundle/`
- Windows: `.msi` e `.exe`
- macOS: `.dmg` e `.app`
- Linux: `.deb` e `.AppImage`

---

## Problemas Comuns

### "Cannot find Rust toolchain"
Execute `rustup update stable` e reinicie o terminal.

### Windows: Erro de link durante compilação
Instale as C++ Build Tools. Veja o Pré-requisito 4 acima.

### "WebView2 not found" no Windows
Baixe e instale o WebView2 da Microsoft:
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### GitHub Client ID mostra "Bad credentials"
Verifique se copiou o **Client ID** (não o Client Secret) corretamente. O arquivo `.env` deve estar na **raiz do projeto**, não dentro de `apps/desktop`.

### Credential helper não encontrado
Certifique-se de ter compilado o projeto com `tauri:build` ou `tauri:dev` primeiro.

---

## Dicas de Desenvolvimento

- **Hot reload:** Mudanças no React aparecem instantaneamente.
- **Mudanças no Rust:** O backend reinicia automaticamente no modo dev.
- **Logs:** Configure `RUST_LOG=debug` no `.env` para logs verbosos.
- **Testes:** Execute `npm run test` em `apps/desktop`.
- **Formatação:** Execute `npm run format`.
- **Lint:** Execute `npm run lint`.
