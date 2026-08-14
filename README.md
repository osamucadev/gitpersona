<p align="center">
  <img src="docs/assets/git-persona.png" alt="Git Persona" width="96" />
</p>

<h1 align="center">Git Persona</h1>

<p align="center">
  <strong>Gerencie múltiplas identidades Git a partir de uma interface desktop.</strong>
</p>

Git Persona é um aplicativo desktop (Tauri v2 + Rust + React) para quem alterna entre
mais de uma identidade Git no mesmo computador, como um perfil de trabalho e
um pessoal. Em vez de editar `~/.gitconfig` na mão, o app guarda cada perfil (nome,
e-mail, conta GitHub, chave SSH) e aplica a identidade correta com um clique.

---

## Funcionalidades

Com base na implementação atual (`apps/desktop/src-tauri/src/commands/`):

- **Múltiplos perfis Git:** rótulo, `user.name` e `user.email` por perfil.
- **Ativação com um clique:** grava `git config --global user.name/user.email` e
  registra o credential helper do app, tudo via um único comando Tauri.
- **Login no GitHub via OAuth Device Flow:** dispensa client secret. O token não passa
  pelo disco em texto simples, é salvo direto no chaveiro do sistema operacional.
- **Seletor de navegador:** antes de abrir a URL de verificação do Device Flow, o app
  detecta navegadores instalados (registro do Windows, caminhos conhecidos no macOS,
  `which` no Linux) e deixa o usuário escolher qual usar, com fallback para o diálogo
  "Abrir com" do sistema.
- **Chaves SSH por perfil:** gera um par de chaves `ed25519` via `ssh-keygen`,
  registra a chave pública no GitHub pela API (`POST /user/keys`) e mantém um bloco
  gerenciado em `~/.ssh/config` apontando para a chave do perfil ativo.
- **Ícone na bandeja do sistema:** troca rápida de perfil sem abrir a janela principal.
- **Inicialização automática:** opcional, via `tauri-plugin-autostart`.
- **Diagnósticos:** versão do git, identidade global, helper configurado e
  identificação do perfil ativo. O diagnóstico não coleta nem exibe tokens. A
  disponibilidade do chaveiro é verificada separadamente na inicialização do app.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Shell desktop | Tauri v2 (Rust) |
| Interface | React 18 + Vite + TypeScript |
| Estilo | Tailwind CSS + Radix UI |
| Animação | Framer Motion |
| Estado | Zustand |
| Validação de formulários | Zod + react-hook-form |
| Armazenamento seguro | crate `keyring` (chaveiro do SO) |
| Autenticação | GitHub OAuth Device Flow |

## Pré-requisitos

- **Rust + Cargo:** via [rustup.rs](https://rustup.rs).
- **Node.js 20+ e npm:** o repositório usa npm workspaces (`package.json` na raiz).
- **Git** e **`ssh-keygen`** disponíveis no `PATH` (no Windows, ambos vêm com o Git
  for Windows).
- Dependências de sistema exigidas pelo Tauri (build tools no Windows, WebView2,
  bibliotecas de sistema no Linux). Consulte os
  [pré-requisitos oficiais do Tauri](https://tauri.app/start/prerequisites/).

## Configuração

Na raiz do repositório:

```bash
cp .env.example .env
```

Edite `.env` e preencha `GITHUB_CLIENT_ID`:

1. Acesse <https://github.com/settings/developers> → **New OAuth App**.
2. Homepage URL e Authorization callback URL podem ser `http://localhost`. O Device
   Flow não usa redirecionamento.
3. Marque **Enable Device Flow** nas configurações do OAuth App.
4. Copie o **Client ID** gerado (o Client Secret não é necessário).

O `.env` precisa ficar na **raiz do repositório**, não em `apps/desktop`: o script
`tauri:dev` o carrega a partir de lá (`dotenv -e ../../.env`). Opcionalmente, defina
`RUST_LOG=debug` no mesmo arquivo para logs mais verbosos do backend.

## Executando o projeto

Instale as dependências uma vez, a partir da raiz: `npm install`.

- **Frontend isolado (sem Tauri):** sobe só o Vite, útil para trabalhar na UI sem
  recompilar Rust: `npm run dev`.
- **Aplicação Tauri completa:** `npm run tauri:dev`. Inicia o Vite, compila o
  backend Rust e abre a janela do app. A primeira compilação Rust é a mais demorada;
  as seguintes são incrementais.
- **Build de produção:** `npm run tauri:build`. Os bundles gerados dependem do sistema
  operacional usado na build. O `tauri.conf.json` define `bundle.targets: "all"`,
  portanto o Tauri tenta gerar todos os formatos compatíveis com esse sistema e com
  as ferramentas instaladas no ambiente.

> **Credential helper (`gitpersona-helper`):** o `tauri.conf.json` atual não declara
> `bundle.resources`/`externalBin` para esse binário, então ele não é compilado nem
> empacotado automaticamente por `tauri:dev`/`tauri:build`. Para desenvolvimento,
> compile-o com `cargo build -p gitpersona-credential-helper` antes de executar
> `npm run tauri:dev`. Para testar a aplicação de release fora de um instalador, use
> `cargo build --release -p gitpersona-credential-helper` antes de
> `npm run tauri:build`. O app procura o helper no diretório de recursos e, como
> fallback, ao lado do executável principal. Os instaladores gerados ainda não
> incluem o helper e não devem ser publicados até que o bundle seja configurado.

## Scripts disponíveis

| Comando (raiz do repositório) | O que faz |
|---|---|
| `npm run dev` | Frontend isolado (Vite, sem Tauri) |
| `npm run build` | Build de produção do frontend (`tsc && vite build`) |
| `npm run tauri:dev` | Aplicação Tauri completa em modo desenvolvimento |
| `npm run tauri:build` | Build de produção do desktop |
| `npm run lint` | ESLint no frontend |
| `npm run test` | Testes de UI (Vitest, execução única) |
| `npm run format --workspace=apps/desktop` | Formata o frontend com Prettier (sem script na raiz) |
| `npm run test:watch --workspace=apps/desktop` | Vitest em modo watch (sem script na raiz) |
| `cargo test --workspace` | Testes de todas as crates Rust |
| `cargo build -p gitpersona-credential-helper` | Recompila só o credential helper |
| `cargo build --release -p gitpersona-credential-helper` | Recompila o credential helper para uma build de release |

## Estrutura resumida do repositório

```
gitpersona/
├── apps/desktop/
│   ├── src-ui/            # Frontend React + TypeScript
│   │   ├── components/    # Modais, cartões de perfil, seletor de navegador etc.
│   │   ├── pages/         # HomePage, OnboardingPage, SettingsPage
│   │   ├── store/         # Estado global (Zustand)
│   │   ├── lib/           # Wrappers das invocações Tauri e utilitários
│   │   └── types/         # Tipos TypeScript compartilhados
│   └── src-tauri/         # Backend Rust/Tauri
│       └── src/
│           ├── commands/  # profiles, git, auth, browser, ssh, system
│           ├── state.rs   # Estado da aplicação e persistência (store.json)
│           └── tray.rs    # Ícone e menu da bandeja
├── crates/
│   ├── core/               # Tipos compartilhados (Profile, AppSettings, redact...)
│   ├── git/                # Wrapper para a CLI do git
│   ├── auth/                # Cliente do GitHub Device Flow
│   └── credential-helper/    # Binário `gitpersona-helper`, invocado pelo git
├── docs/assets/            # Imagens usadas na documentação
└── Cargo.toml               # Workspace Rust
```

## Arquitetura em alto nível

O frontend React se comunica com o backend Rust exclusivamente via IPC do Tauri, não
HTTP. Fluxo resumido:

```
React (invoke) ⇄ Tauri/Rust (commands/) → crates core / git / auth
                                          → gitpersona-helper (binário separado, chamado pelo git)
```

- **Ativar um perfil:** o comando `activate_profile` grava `user.name`,
  `user.email` e `credential.helper` no git global, atualiza `~/.ssh/config` com a
  chave SSH do perfil (se houver) e persiste `store.json`.
- **Push/pull via HTTPS:** o próprio `git` invoca `gitpersona-helper get`; o helper
  lê o perfil ativo em `store.json`, busca o token no chaveiro do SO e devolve
  `username`/`password` ao git.
- **Conectar GitHub:** o app inicia o Device Flow, mostra o código de verificação,
  abre o navegador escolhido e faz *polling* até obter o token, que é salvo apenas
  no chaveiro. Os escopos solicitados são `read:user`, `repo` e `write:public_key`.

## Segurança e armazenamento de credenciais

- Tokens GitHub **nunca são gravados em disco**: ficam só no chaveiro do sistema
  (crate `keyring`, com os serviços de credenciais disponíveis em cada sistema, como
  Windows Credential Locker, macOS Keychain e serviços compatíveis no Linux, como
  libsecret ou KWallet). `store.json` guarda apenas uma referência (`tokenRef`),
  nunca o token em si.
- `check_keychain_available` testa a escrita/leitura no chaveiro antes de permitir
  operações que dependem dele.
- O credential helper só responde à ação `get` e só para `github.com`/
  `*.github.com`; qualquer outra combinação de host/protocolo/ação faz o binário
  encerrar sem saída, deixando o git seguir para outro helper.
- Existe uma função `redact()` em `crates/core/src/lib.rs` para ocultar alguns
  formatos de token do GitHub, mas ela ainda não está ligada ao fluxo de logs. Os
  diagnósticos atuais não coletam tokens.
- Chaves SSH são geradas localmente (`ed25519`, sem senha); a chave privada nunca é
  enviada a lugar nenhum, só a pública é registrada no GitHub.
- `store.json` fica no diretório de dados local do app sob o identificador
  `com.gitpersona.app` (ex.: `~/.local/share/com.gitpersona.app/store.json` no Linux).

## Problemas comuns

**"Cannot find Rust toolchain":** rode `rustup update stable` e abra um terminal novo.

**Erro de link (Windows) ao compilar:** instale as C++ Build Tools (workload
"Desktop development with C++") e o WebView2 Runtime; veja os
[pré-requisitos do Tauri](https://tauri.app/start/prerequisites/).

**`GITHUB_CLIENT_ID` inválido / Device Flow não inicia:** confirme que copiou o
**Client ID** (não o Client Secret) e que o `.env` está na raiz do repositório, não
em `apps/desktop`. O Device Flow também precisa de acesso de rede a `github.com`.

**Aviso de credential helper não encontrado:** compile-o manualmente com
`cargo build -p gitpersona-credential-helper` (veja a nota na seção
[Executando o projeto](#executando-o-projeto)); ele não é bundlado
automaticamente na configuração atual.

**Falha ao gerar chave SSH:** confirme que `ssh-keygen` está no `PATH`. No Windows,
ele normalmente vem com a instalação do Git for Windows.

## Troubleshooting: acesso a repositórios privados em organizações do GitHub

Este é um caso real enfrentado durante o desenvolvimento do projeto: uma organização
privada no GitHub, usuário membro da organização, sem conseguir clonar repositórios
via SSH nem via HTTPS. **Isso não é causado pelo Git Persona.** É um comportamento de
permissões do próprio GitHub, mas o diagnóstico é útil para qualquer pessoa que
trabalhe com repositórios privados de organizações.

### Sintoma 1: SSH autentica, mas o clone falha com "Repository not found"

```
ssh -T git@github.com
→ Hi <usuario>! You've successfully authenticated, but GitHub does not provide shell access.

git clone git@github.com:<org>/<repo>.git
→ ERROR: Repository not found.
→ fatal: Could not read from remote repository.
```

A autenticação SSH funciona (a chave está registrada e o GitHub identifica o usuário
correto), mas o clone falha em **todos** os repositórios da organização, não só em um.
Confirme o comportamento isoladamente com:

```bash
git ls-remote git@github.com:<org>/<repo>.git
```

Se o resultado também for "Repository not found", o problema é de permissão/SSO, não
de rede ou de configuração local do Git Persona.

**Causa raiz:** ser **membro de uma organização não garante acesso automático aos
repositórios privados dela**. O acesso a cada repositório precisa ser concedido
separadamente:

- adicionando o usuário como **colaborador direto** do repositório, ou
- adicionando o usuário a um **team** que tenha acesso ao repositório.

Além disso, organizações podem ativar **restrições de chave SSH** que exigem que cada
chave seja explicitamente autorizada para a organização via **SAML SSO**. Quando isso
se aplica, um botão **"Configure SSO"** aparece ao lado da chave em
**Settings → SSH and GPG keys** (só aparece depois que o usuário já se autenticou ao
menos uma vez pelo provedor de identidade da organização). Para autorizar: abra
**Settings → SSH and GPG keys**, clique em **Configure SSO** na chave, selecione a
organização e clique em **Authorize**. Se a autorização de uma chave for revogada,
não é possível reautorizá-la. Nesse caso, é preciso gerar e autorizar uma chave nova.

> **Importante:** é perfeitamente possível visualizar um repositório privado pelo
> navegador e, ainda assim, não conseguir cloná-lo via SSH. Acesso pelo navegador e
> acesso via Git usam camadas de permissão diferentes.

**Checklist para o administrador da organização:**

1. Em `github.com/<org>/<repo>` → **Settings → Collaborators and teams**, confirme
   que o usuário aparece com permissão explícita (Read, Write ou Admin).
2. Em `github.com/organizations/<org>/settings/security`, verifique se há
   restrições de chave SSH exigindo autorização via SSO.

### Sintoma 2: clone HTTPS falha por credential helper quebrado + senha recusada

```
git clone https://github.com/<org>/<repo>.git

<caminho-do-helper-customizado>.exe get: No such file or directory

Username for 'https://github.com': <usuario>
Password for 'https://<usuario>@github.com':
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed
```

Dois problemas ao mesmo tempo:

1. O Git estava configurado para usar um **credential helper customizado que não
   existe mais** no caminho apontado (por exemplo, depois de reinstalar ou mover uma
   ferramenta).
2. O **GitHub não aceita mais a senha da conta** para operações Git. É obrigatório
   usar um token.

**Diagnosticar e corrigir o `credential.helper`:**

```bash
# Lista todos os helpers configurados (pode haver mais de um)
git config --global --get-all credential.helper

# Remove os helpers customizados/quebrados
git config --global --unset-all credential.helper
```

Depois de limpar, deixe o **Git Credential Manager (GCM)**, recomendado atualmente
pelo GitHub, cuidar da autenticação. No Windows ele já vem
com o Git for Windows 2.29+ e se configura sozinho na instalação; no macOS/Linux,
instale-o separadamente e rode `git-credential-manager configure` para que ele
registre a si mesmo como `credential.helper`.

**Usar um Personal Access Token (PAT) em vez de senha:** em
**github.com → Settings → Developer settings → Personal access tokens**, gere um
token **fine-grained** (recomendação atual do GitHub, com acesso restrito ao
repositório/organização necessários) ou, para diagnósticos rápidos envolvendo vários
repositórios da organização, um token **classic** com o escopo **`repo`**. Copie o
token exibido (só aparece uma vez) e, ao clonar via HTTPS, use o **username**
normalmente e cole o **token** no lugar da senha (ex.: `github_pat_xxxx` ou
`ghp_xxxx`). Com um credential helper funcional, o token é salvo com segurança (Git
Credential Manager, Keychain do macOS ou o backend escolhido no Linux) e as próximas
operações não pedem autenticação novamente até o token expirar.

Se a organização usar SAML SSO, a credencial também precisa estar autorizada para a
organização. No caso de um PAT classic, use **Configure SSO** nas configurações do
token. Tokens fine-grained passam pelo processo de aprovação e acesso definido pela
organização.

**Cuidados com o armazenamento do token:** trate um PAT como uma senha. Nunca o
cole em scripts, commits ou logs; defina uma expiração razoável e gere um novo
quando o atual expirar. Se você estiver desenvolvendo um credential helper próprio
(como o `gitpersona-helper` deste projeto), armazene o token no chaveiro do sistema,
nunca em arquivo de texto simples, e garanta que o caminho do binário permaneça
válido entre rebuilds e relocações. É exatamente esse tipo de caminho inválido que
causa o sintoma 2 acima.

| Método | Resultado | Motivo |
|---|---|---|
| Clone SSH | ❌ Repository not found | Falta de permissão no repositório ou chave SSH não autorizada via SSO |
| HTTPS com senha da conta | ❌ Falha de autenticação | GitHub não aceita mais senha para Git |
| HTTPS com helper quebrado | ❌ Helper não encontrado | Caminho do credential helper customizado é inválido |
| HTTPS com PAT + helper válido | ✅ Sucesso | Método de autenticação correto e suportado |

## Como contribuir

1. Faça um fork, clone-o e prepare o ambiente seguindo
   [Pré-requisitos](#pré-requisitos), [Configuração](#configuração) e
   [Executando o projeto](#executando-o-projeto) acima.
2. Crie uma branch de feature (`git checkout -b feat/minha-feature`) e faça as
   alterações. TypeScript/React usa Prettier + ESLint (`npm run format`,
   `npm run lint`); Rust segue `rustfmt`, evita `unwrap()` em código de produção e usa
   as macros de `tracing` em vez de `println!`.
3. Ao adicionar um comando Tauri: implemente o handler em
   `apps/desktop/src-tauri/src/commands/`, registre-o em `generate_handler![]` dentro
   de `src/lib.rs`, e adicione o wrapper correspondente em `src-ui/lib/`.
4. Antes de abrir o PR, rode `npm run lint` e `npm run test` (e `cargo test
   --workspace` se alterou código Rust). Use
   [Conventional Commits](https://www.conventionalcommits.org/pt-br/) nas mensagens
   (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`...).
5. Abra o PR contra `main`, descrevendo a mudança e destacando qualquer alteração
   sensível à segurança.

**Reportando bugs:** abra uma Issue com passos para reproduzir, comportamento
esperado vs. real, a saída de Diagnósticos do app (que não inclui tokens) e a
versão do sistema operacional. Não abra Issues públicas para vulnerabilidades de
segurança. Faça o relato de forma privada aos mantenedores.

## Licença

Este projeto é distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE)
para conhecer os termos completos.
