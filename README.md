<p align="center">
  <img src="docs/assets/logo-placeholder.png" alt="Git Persona Logo" width="80" />
</p>

<h1 align="center">Git Persona</h1>
<p align="center">
  <strong>Manage multiple Git identities from a polished desktop UI.</strong><br />
  Switch between work, personal, and freelance Git profiles in one click.<br />
  No terminal required for end users.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-to-run">How to Run</a> •
  <a href="docs/architecture.md">Architecture</a> •
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

> 📖 **Português (Brasil):** [README.pt-BR.md](README.pt-BR.md)

---

## Screenshots

> 📸 _Screenshots coming soon. See [docs/screenshots.md](docs/screenshots.md) for generation instructions._

| Home — Profile List | Onboarding | Settings |
|---|---|---|
| _placeholder_ | _placeholder_ | _placeholder_ |

---

## Features

- 🪪 **Multiple Git profiles**: label, name, email per profile (e.g., WORK, PERSONAL)
- ⚡ **One-click activation**: sets `git config --global` values instantly
- 🐙 **GitHub OAuth**: Device Flow login, token stored in OS keychain (never plain text)
- 🌐 **Browser picker**: always asks which browser to open for OAuth
- 🔐 **Secure**: Windows Credential Locker, macOS Keychain, Linux libsecret
- 🛠️ **Credential helper**: bundled binary makes HTTPS git operations just work
- 🖥️ **System tray**: quick profile switch from the taskbar
- 🚀 **Autostart**: optionally launch on login
- 🧩 **Open source**: MIT licensed

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri v2 (Rust) |
| UI framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (Radix) |
| Animation | Framer Motion |
| State | Zustand |
| Validation | Zod + react-hook-form |
| Secure storage | OS keychain via `keyring` crate |
| Auth | GitHub OAuth Device Flow |

---

## Quick Start

```bash
git clone https://github.com/osamucadev/gitpersona.git
cd gitpersona
cp .env.example .env           # Add your GITHUB_CLIENT_ID
cd apps/desktop && npm install
npm run tauri:dev
```

See the [**detailed How-to-Run guide**](docs/HOW_TO_RUN.md) for step-by-step instructions, including how to set up Rust, Node.js, and get a GitHub Client ID.

---

## Repository Structure

```
gitpersona/
├── apps/
│   └── desktop/
│       ├── src-ui/          # React + TypeScript frontend
│       │   ├── components/  # UI components
│       │   ├── pages/       # Page-level components
│       │   ├── store/       # Zustand state
│       │   ├── lib/         # Utilities and API wrappers
│       │   └── types/       # TypeScript interfaces
│       └── src-tauri/       # Tauri Rust backend
│           └── src/
│               └── commands/ # Tauri command handlers
├── crates/
│   ├── core/                # Shared Rust types
│   ├── git/                 # Git CLI wrapper
│   ├── auth/                # GitHub Device Flow client
│   └── credential-helper/   # Standalone git credential helper binary
├── docs/                    # Documentation and guides
└── Cargo.toml               # Rust workspace
```

---

## Security Model

- GitHub tokens are **never stored in plain text**
- All tokens use the OS keychain (Windows Credential Locker on Windows)
- If the keychain is unavailable, the app shows a blocking warning and refuses to proceed
- The credential helper only responds for `github.com`, it never leaks credentials to other hosts
- Diagnostic logs redact any token-shaped strings

---

## License

MIT © Git Persona Contributors
