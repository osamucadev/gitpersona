# Git Persona

<p align="center">
  <img src="docs/assets/git-persona.png" width="112" alt="Git Persona official icon">
</p>

**A desktop switcher for the Git identities you already use on one machine.**

Git Persona is for developers who alternate between more than one Git identity on the same computer, such as a work profile and a personal one. Instead of editing `~/.gitconfig` by hand, the app keeps each profile (name, email, GitHub account, SSH key) and applies the right identity with one click.

It changes only the Git and SSH settings a profile needs. Tokens stay in your operating system keychain.

> **Project status:** Git Persona is in development and has **no published installers yet**. It runs from source on Linux and Windows. macOS is untested. Contributions, ports, and forks are very welcome.

## Why Git Persona

- Keep work, personal, and client identities side by side without touching `~/.gitconfig`.
- Know which identity is active before you commit with the wrong name or email.
- Sign in to GitHub with the OAuth Device Flow, with no client secret and no token on disk.
- Give each profile its own SSH key, registered on GitHub for you.
- Switch profiles from the system tray without opening the main window.

## What it does

### Profiles

Each profile holds a label, `user.name`, and `user.email`, plus an optional GitHub account and SSH key. Activating a profile writes `user.name` and `user.email` to your global Git configuration and registers the Git Persona credential helper, all in a single step.

### GitHub sign-in

Profiles connect to GitHub through the OAuth Device Flow. The app shows the verification code, opens the verification page in the browser you choose, and waits for approval. Installed browsers are detected per platform, with the system "Open with" dialog as a fallback. The requested scopes are `read:user`, `repo`, and `write:public_key`.

### SSH keys per profile

Git Persona generates an `ed25519` key pair with `ssh-keygen`, registers the public key on GitHub through the API, and maintains a managed block in `~/.ssh/config` that points `github.com` at the key of the active profile.

### Tray, autostart, and diagnostics

- A system tray icon switches profiles quickly.
- Launch at login is optional.
- Diagnostics report the Git version, the global identity, the configured helper, and the active profile. They never collect or display tokens.

## Install and run

### Prerequisites

- Git and `ssh-keygen` available on your `PATH` (on Windows, both ship with Git for Windows)
- Node.js 20 or later, with npm
- Rust stable, installed with [rustup](https://rustup.rs)
- The system dependencies Tauri v2 requires for your platform. See the [official Tauri prerequisites](https://tauri.app/start/prerequisites/).

### Configure the GitHub OAuth App

```bash
cp .env.example .env
```

Fill in `GITHUB_CLIENT_ID` with the Client ID of a GitHub OAuth App that has **Enable Device Flow** checked. No Client Secret is needed. The `.env` file must live at the repository root. The [full guide](docs/README.en.md#configuration) walks through creating the OAuth App.

### Development build

```bash
git clone https://github.com/osamucadev/gitpersona.git
cd gitpersona
npm install
cargo build -p gitpersona-credential-helper
npm run tauri:dev
```

The credential helper is a separate binary and is not built by `tauri:dev`, so build it once before running the app.

### Production package

```bash
cargo build --release -p gitpersona-credential-helper
npm run tauri:build
```

Tauri writes the bundles supported by the host system under `target/release/bundle/`. These bundles do not include the credential helper yet and should not be distributed. See [Current limitations](#current-limitations).

### Test the project

```bash
npm run lint
npm test
npm run build
cargo test --workspace
```

## Safety and privacy

GitHub tokens are never written to disk. They live only in the operating system keychain (Windows Credential Locker, macOS Keychain, or a Secret Service provider such as libsecret or KWallet on Linux). The app's own `store.json` keeps a reference to the token, never the token itself.

SSH keys are generated locally. The private key never leaves your machine; only the public key is sent to GitHub.

The credential helper answers only the `get` action and only for `github.com` and `*.github.com`. Any other host, protocol, or action makes it exit silently so Git can fall through to another helper.

Git Persona has no account, server, telemetry, or synchronization service of its own.

## Current limitations

- There are no published installers. The generated bundles omit the `gitpersona-helper` binary, and the OAuth Client ID is read from `.env` at run time instead of being embedded in the build.
- Activating a profile replaces the global `credential.helper` value. Helpers you already use, such as Git Credential Manager, are not preserved yet.
- Only `github.com` is supported. GitHub Enterprise Server, GitLab, and Bitbucket are not.
- Generated SSH keys have no passphrase.
- macOS has not been tested, and no macOS support is claimed.
- The interface is available in English only.

The work required before a first release is tracked in the [release roadmap](docs/PROXIMOS_PASSOS_RELEASE.md) (in Portuguese).

## Contributing and forks

Git Persona is intentionally friendly to experimentation. Please feel free to open an issue, submit a pull request, create a platform port, or make your own copy. The project is available under the permissive [MIT License](LICENSE).

Please do not open public issues for security vulnerabilities. Report them privately to the maintainers.

Notable changes are recorded in the [changelog](CHANGELOG.md). For a fuller product and technical guide, see:

- [English documentation](docs/README.en.md)
- [Documentação em português do Brasil](docs/README.pt-BR.md)
