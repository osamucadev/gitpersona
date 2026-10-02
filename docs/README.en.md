# Git Persona Guide

Git Persona is a desktop application (Tauri v2 + Rust + React) for people who alternate between more than one Git identity on the same computer, such as a work profile and a personal one. Instead of editing `~/.gitconfig` by hand, the app keeps each profile (name, email, GitHub account, SSH key) and applies the right identity with one click.

English | [Português do Brasil](README.pt-BR.md)

## Contents

- [Features](#features)
- [Technologies](#technologies)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Running the project](#running-the-project)
- [Available scripts](#available-scripts)
- [Repository layout](#repository-layout)
- [Architecture](#architecture)
- [Security and credential storage](#security-and-credential-storage)
- [Common problems](#common-problems)
- [Troubleshooting private repositories in GitHub organizations](#troubleshooting-private-repositories-in-github-organizations)
- [Contributing](#contributing)

## Features

Based on the current implementation (`apps/desktop/src-tauri/src/commands/`):

- **Multiple Git profiles:** a label, `user.name`, and `user.email` per profile.
- **One-click activation:** writes `git config --global user.name/user.email` and registers the app's credential helper through a single Tauri command.
- **GitHub sign-in through the OAuth Device Flow:** no client secret is needed. The token never touches the disk in plain text; it goes straight to the operating system keychain.
- **Browser picker:** before opening the Device Flow verification URL, the app detects installed browsers (Windows registry, known paths on macOS, `which` on Linux) and lets you choose one, falling back to the system "Open with" dialog.
- **SSH keys per profile:** generates an `ed25519` key pair with `ssh-keygen`, registers the public key on GitHub through the API (`POST /user/keys`), and maintains a managed block in `~/.ssh/config` pointing to the key of the active profile.
- **System tray icon:** quick profile switching without opening the main window.
- **Launch at login:** optional, through `tauri-plugin-autostart`.
- **Diagnostics:** Git version, global identity, configured helper, and the active profile. Diagnostics neither collect nor display tokens. Keychain availability is checked separately at startup.

## Technologies

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 (Rust) |
| Interface | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + Radix UI |
| Animation | Framer Motion |
| State | Zustand |
| Form validation | Zod + react-hook-form |
| Secure storage | `keyring` crate (OS keychain) |
| Authentication | GitHub OAuth Device Flow |

## Prerequisites

- **Rust + Cargo:** through [rustup.rs](https://rustup.rs).
- **Node.js 20+ and npm:** the repository uses npm workspaces (`package.json` at the root).
- **Git** and **`ssh-keygen`** available on your `PATH` (on Windows, both ship with Git for Windows).
- The system dependencies Tauri requires (build tools on Windows, WebView2, system libraries on Linux). See the [official Tauri prerequisites](https://tauri.app/start/prerequisites/).

## Configuration

At the repository root:

```bash
cp .env.example .env
```

Edit `.env` and fill in `GITHUB_CLIENT_ID`:

1. Open <https://github.com/settings/developers> and choose **New OAuth App**.
2. Homepage URL and Authorization callback URL can both be `http://localhost`. The Device Flow does not use a redirect.
3. Check **Enable Device Flow** in the OAuth App settings.
4. Copy the generated **Client ID** (the Client Secret is not needed).

The `.env` file must live at the **repository root**, not in `apps/desktop`: the `tauri:dev` script loads it from there (`dotenv -e ../../.env`). Optionally, set `RUST_LOG=debug` in the same file for more verbose backend logs.

## Running the project

Install the dependencies once, from the root: `npm install`.

- **Frontend only (no Tauri):** starts just Vite, useful for working on the UI without recompiling Rust: `npm run dev`.
- **Full Tauri application:** `npm run tauri:dev`. Starts Vite, compiles the Rust backend, and opens the app window. The first Rust compilation is the slowest; later ones are incremental.
- **Production build:** `npm run tauri:build`. The generated bundles depend on the operating system used for the build. `tauri.conf.json` sets `bundle.targets: "all"`, so Tauri tries to produce every format compatible with that system and the tools installed in the environment.

> **Credential helper (`gitpersona-helper`):** the current `tauri.conf.json` does not declare `bundle.resources` or `externalBin` for this binary, so `tauri:dev` and `tauri:build` neither compile nor package it. For development, build it with `cargo build -p gitpersona-credential-helper` before running `npm run tauri:dev`. To test a release build outside an installer, use `cargo build --release -p gitpersona-credential-helper` before `npm run tauri:build`. The app looks for the helper in the resource directory and, as a fallback, next to the main executable. The generated installers do not include the helper yet and should not be published until the bundle is configured.

## Available scripts

| Command (repository root) | What it does |
|---|---|
| `npm run dev` | Frontend only (Vite, no Tauri) |
| `npm run build` | Frontend production build (`tsc && vite build`) |
| `npm run tauri:dev` | Full Tauri application in development mode |
| `npm run tauri:build` | Desktop production build |
| `npm run lint` | ESLint on the frontend |
| `npm run test` | UI tests (Vitest, single run) |
| `npm run format --workspace=apps/desktop` | Formats the frontend with Prettier (no root script) |
| `npm run test:watch --workspace=apps/desktop` | Vitest in watch mode (no root script) |
| `cargo test --workspace` | Tests for every Rust crate |
| `cargo build -p gitpersona-credential-helper` | Rebuilds only the credential helper |
| `cargo build --release -p gitpersona-credential-helper` | Rebuilds the credential helper for a release build |

## Repository layout

```
gitpersona/
├── apps/desktop/
│   ├── src-ui/            # React + TypeScript frontend
│   │   ├── components/    # Modals, profile cards, browser picker, etc.
│   │   ├── pages/         # HomePage, OnboardingPage, SettingsPage
│   │   ├── store/         # Global state (Zustand)
│   │   ├── lib/           # Tauri invocation wrappers and utilities
│   │   └── types/         # Shared TypeScript types
│   └── src-tauri/         # Rust/Tauri backend
│       └── src/
│           ├── commands/  # profiles, git, auth, browser, ssh, system
│           ├── state.rs   # Application state and persistence (store.json)
│           └── tray.rs    # Tray icon and menu
├── crates/
│   ├── core/               # Shared types (Profile, AppSettings, redact...)
│   ├── git/                # Wrapper around the git CLI
│   ├── auth/               # GitHub Device Flow client
│   └── credential-helper/  # `gitpersona-helper` binary, invoked by git
├── docs/                   # Guides, release roadmap, and images
├── CHANGELOG.md
└── Cargo.toml              # Rust workspace
```

## Architecture

The React frontend talks to the Rust backend exclusively through Tauri IPC, not HTTP:

```
React (invoke) ⇄ Tauri/Rust (commands/) → crates core / git / auth
                                          → gitpersona-helper (separate binary, called by git)
```

- **Activating a profile:** the `activate_profile` command writes `user.name`, `user.email`, and `credential.helper` to the global Git configuration, updates `~/.ssh/config` with the profile's SSH key (when it has one), and persists `store.json`.
- **Push and pull over HTTPS:** `git` itself invokes `gitpersona-helper get`. The helper reads the active profile from `store.json`, fetches the token from the OS keychain, and returns `username` and `password` to Git.
- **Connecting GitHub:** the app starts the Device Flow, shows the verification code, opens the chosen browser, and polls until it obtains the token, which is saved only in the keychain. The requested scopes are `read:user`, `repo`, and `write:public_key`.

## Security and credential storage

- GitHub tokens are **never written to disk**. They live only in the system keychain (`keyring` crate, backed by Windows Credential Locker, macOS Keychain, or a compatible Linux service such as libsecret or KWallet). `store.json` keeps only a reference (`tokenRef`), never the token itself.
- `check_keychain_available` tests writing to and reading from the keychain before allowing operations that depend on it.
- The credential helper answers only the `get` action and only for `github.com` and `*.github.com`. Any other combination of host, protocol, or action makes the binary exit with no output, letting Git move on to another helper.
- A `redact()` function exists in `crates/core/src/lib.rs` to hide some GitHub token formats, but it is not wired into the logging flow yet. The current diagnostics do not collect tokens.
- SSH keys are generated locally (`ed25519`, no passphrase). The private key is never sent anywhere; only the public key is registered on GitHub.
- `store.json` lives in the app's local data directory under the identifier `com.gitpersona.app` (for example `~/.local/share/com.gitpersona.app/store.json` on Linux).

## Common problems

**"Cannot find Rust toolchain":** run `rustup update stable` and open a new terminal.

**Link error on Windows while compiling:** install the C++ Build Tools ("Desktop development with C++" workload) and the WebView2 Runtime. See the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

**Invalid `GITHUB_CLIENT_ID` or the Device Flow does not start:** confirm that you copied the **Client ID** (not the Client Secret) and that `.env` is at the repository root, not in `apps/desktop`. The Device Flow also needs network access to `github.com`.

**Credential helper not found warning:** build it manually with `cargo build -p gitpersona-credential-helper` (see the note in [Running the project](#running-the-project)). It is not bundled automatically in the current configuration.

**SSH key generation fails:** confirm that `ssh-keygen` is on your `PATH`. On Windows it normally ships with Git for Windows.

## Troubleshooting private repositories in GitHub organizations

This is a real case met while developing the project: a private GitHub organization, a user who is a member of it, and no way to clone repositories over SSH or HTTPS. **Git Persona does not cause this.** It is how GitHub permissions behave, but the diagnosis is useful to anyone working with private organization repositories.

### Symptom 1: SSH authenticates, but the clone fails with "Repository not found"

```
ssh -T git@github.com
→ Hi <user>! You've successfully authenticated, but GitHub does not provide shell access.

git clone git@github.com:<org>/<repo>.git
→ ERROR: Repository not found.
→ fatal: Could not read from remote repository.
```

SSH authentication works (the key is registered and GitHub identifies the right user), but the clone fails for **every** repository in the organization, not just one. Confirm the behavior in isolation with:

```bash
git ls-remote git@github.com:<org>/<repo>.git
```

If the result is also "Repository not found", the problem is permissions or SSO, not the network or the local Git Persona configuration.

**Root cause:** being a **member of an organization does not grant automatic access to its private repositories**. Access to each repository must be granted separately, either by adding the user as a **direct collaborator** or by adding the user to a **team** that has access to the repository.

Organizations can also enable **SSH key restrictions** that require each key to be explicitly authorized for the organization through **SAML SSO**. When that applies, a **Configure SSO** button appears next to the key in **Settings → SSH and GPG keys** (only after the user has authenticated at least once through the organization's identity provider). To authorize: open **Settings → SSH and GPG keys**, click **Configure SSO** on the key, select the organization, and click **Authorize**. If a key's authorization is revoked, it cannot be authorized again; generate and authorize a new key instead.

> **Important:** it is entirely possible to view a private repository in the browser and still be unable to clone it over SSH. Browser access and Git access use different permission layers.

**Checklist for the organization administrator:**

1. In `github.com/<org>/<repo>` → **Settings → Collaborators and teams**, confirm that the user appears with an explicit permission (Read, Write, or Admin).
2. In `github.com/organizations/<org>/settings/security`, check for SSH key restrictions that require SSO authorization.

### Symptom 2: HTTPS clone fails with a broken credential helper and a rejected password

```
git clone https://github.com/<org>/<repo>.git

<path-to-custom-helper>.exe get: No such file or directory

Username for 'https://github.com': <user>
Password for 'https://<user>@github.com':
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed
```

Two problems at once:

1. Git was configured to use a **custom credential helper that no longer exists** at the configured path (for example, after reinstalling or moving a tool).
2. **GitHub no longer accepts the account password** for Git operations. A token is mandatory.

**Diagnose and fix `credential.helper`:**

```bash
# List every configured helper (there may be more than one)
git config --global --get-all credential.helper

# Remove the custom or broken helpers
git config --global --unset-all credential.helper
```

After cleaning up, let **Git Credential Manager (GCM)**, currently recommended by GitHub, handle authentication. On Windows it ships with Git for Windows 2.29+ and configures itself during installation. On macOS and Linux, install it separately and run `git-credential-manager configure` so it registers itself as `credential.helper`.

**Use a Personal Access Token (PAT) instead of a password:** in **github.com → Settings → Developer settings → Personal access tokens**, generate a **fine-grained** token (GitHub's current recommendation, restricted to the repository or organization you need) or, for quick diagnostics across several organization repositories, a **classic** token with the **`repo`** scope. Copy the token (it is shown only once) and, when cloning over HTTPS, enter your **username** as usual and paste the **token** in place of the password (for example `github_pat_xxxx` or `ghp_xxxx`). With a working credential helper, the token is stored securely and later operations do not prompt again until the token expires.

If the organization uses SAML SSO, the credential must also be authorized for the organization. For a classic PAT, use **Configure SSO** in the token settings. Fine-grained tokens go through the approval and access process defined by the organization.

**Token storage care:** treat a PAT like a password. Never paste it into scripts, commits, or logs; set a reasonable expiration and generate a new one when it expires. If you are building your own credential helper (like this project's `gitpersona-helper`), store the token in the system keychain, never in a plain text file, and make sure the binary path stays valid across rebuilds and relocations. That kind of invalid path is exactly what causes symptom 2 above.

| Method | Result | Reason |
|---|---|---|
| SSH clone | ❌ Repository not found | Missing repository permission or SSH key not authorized through SSO |
| HTTPS with account password | ❌ Authentication failure | GitHub no longer accepts passwords for Git |
| HTTPS with a broken helper | ❌ Helper not found | The custom credential helper path is invalid |
| HTTPS with PAT + valid helper | ✅ Success | Correct, supported authentication method |

## Contributing

1. Fork the repository, clone it, and set up the environment by following [Prerequisites](#prerequisites), [Configuration](#configuration), and [Running the project](#running-the-project) above.
2. Create a feature branch (`git checkout -b feat/my-feature`) and make your changes. TypeScript and React use Prettier + ESLint (`npm run format --workspace=apps/desktop`, `npm run lint`). Rust follows `rustfmt`, avoids `unwrap()` in production code, and uses the `tracing` macros instead of `println!`.
3. When adding a Tauri command: implement the handler in `apps/desktop/src-tauri/src/commands/`, register it in `generate_handler![]` inside `src/lib.rs`, and add the matching wrapper in `src-ui/lib/`.
4. Before opening the pull request, run `npm run lint`, `npm run test`, and `npm run build` (plus `cargo test --workspace` if you changed Rust code). Use [Conventional Commits](https://www.conventionalcommits.org/) in commit messages (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`...).
5. Record user-visible changes under `[Unreleased]` in [CHANGELOG.md](../CHANGELOG.md).
6. Open the pull request against `main`, describing the change and highlighting anything security sensitive.

**Reporting bugs:** open an issue with steps to reproduce, expected versus actual behavior, the app's Diagnostics output (which contains no tokens), and your operating system version. Do not open public issues for security vulnerabilities. Report them privately to the maintainers.

## License

This project is distributed under the MIT License. See [LICENSE](../LICENSE) for the full terms.
