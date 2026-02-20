# How to Run Git Persona | Developer Guide

This guide walks you through everything needed to run Git Persona from source,
from a completely fresh machine to a running app.

---

## Prerequisites

You need three things installed before you start:

### 1. Rust (with Cargo)

Rust powers the Tauri backend and all native logic.

**Install Rust:** https://rustup.rs

On Windows, run in PowerShell:
```powershell
winget install Rustlang.Rustup
# OR visit https://rustup.rs and run the installer
```

After installing, open a **new terminal** and verify:
```bash
rustc --version   # should print e.g. rustc 1.78.0
cargo --version   # should print e.g. cargo 1.78.0
```

### 2. Node.js (v20 or later)

Node.js powers the React frontend build.

**Install Node.js:** https://nodejs.org (choose the LTS version)

Or use `winget` on Windows:
```powershell
winget install OpenJS.NodeJS.LTS
```

Verify:
```bash
node --version    # should print v20.x or later
npm --version     # should print 10.x or later
```

### 3. Git

Git must be installed and on your PATH (the app manages git identities through it).

**Install Git:** https://git-scm.com/downloads

Verify:
```bash
git --version     # should print git version 2.x
```

### 4. Tauri Prerequisites (Windows-specific)

On **Windows**, Tauri requires:
- **Microsoft C++ Build Tools** or **Visual Studio** with the "Desktop development with C++" workload
- **WebView2** (usually pre-installed on Windows 11)

Install Build Tools:
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
# Then run the installer and select "Desktop development with C++"
```

For a full list of platform requirements: https://tauri.app/start/prerequisites/

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/osamucadev/gitpersona.git
cd gitpersona
```

---

## Step 2: Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` in a text editor and fill in your `GITHUB_CLIENT_ID`.

### How to Get a GitHub Client ID

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** `Git Persona Dev`
   - **Homepage URL:** `http://localhost`
   - **Authorization callback URL:** `http://localhost`  
     _(Not actually used — Device Flow doesn't redirect)_
4. Click **Register application**
5. Copy the **Client ID** and paste it into your `.env` file

```env
GITHUB_CLIENT_ID=Ov23liABCDEF1234567890
```

> **Note:** The Client Secret is NOT needed. Git Persona uses the Device Flow which is client-secret-free.

---

## Step 3: Install Frontend Dependencies

```bash
cd apps/desktop
npm install
```

This downloads all React, TypeScript, and Tauri CLI packages.

---

## Step 4: Run in Development Mode

From the `apps/desktop` directory:

```bash
npm run tauri:dev
```

This command:
1. Starts the Vite dev server (React frontend, hot reload)
2. Compiles the Rust backend (takes ~1-2 minutes on first run)
3. Compiles the credential helper binary
4. Launches the Tauri window

> **First compilation is slow (2–5 minutes).** Subsequent runs are fast because Rust caches compiled code.

You should see the Git Persona window open. If this is your first run, the onboarding screen appears.

---

## Step 5: Build for Production (Optional)

To create a distributable installer:

```bash
npm run tauri:build
```

The installer will be in:
- `apps/desktop/src-tauri/target/release/bundle/`
- Windows: `.msi` and `.exe` installers
- macOS: `.dmg` and `.app`
- Linux: `.deb` and `.AppImage`

---

## Project Structure Walkthrough

```
gitpersona/
├── apps/desktop/            # The desktop application
│   ├── src-ui/              # React frontend (TypeScript)
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page-level views
│   │   ├── store/           # Zustand global state
│   │   ├── lib/             # API wrappers (tauri.ts), utilities
│   │   └── types/           # Shared TypeScript types
│   └── src-tauri/           # Rust/Tauri backend
│       └── src/
│           ├── commands/    # Commands exposed to the UI
│           ├── state.rs     # App state management
│           └── tray.rs      # System tray logic
├── crates/
│   ├── core/                # Shared types (Profile, AppSettings, etc.)
│   ├── git/                 # Git CLI wrapper functions
│   ├── auth/                # GitHub Device Flow HTTP client
│   └── credential-helper/   # Standalone binary invoked by git
└── docs/                    # All documentation
```

---

## Common Issues

### "Cannot find Rust toolchain"
Run `rustup update stable` and restart your terminal.

### Windows: "LINK : fatal error" during build
Install the C++ Build Tools. See Step 0 above.

### "WebView2 not found" on Windows
Download and install WebView2 from Microsoft:
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### GitHub Client ID shows "Bad credentials"
Check that you copied the **Client ID** (not Client Secret) correctly. Ensure the `.env` file is in the **project root**, not inside `apps/desktop`.

### App opens but GitHub connect fails
The Device Flow requires network access to `github.com`. Check your firewall or VPN settings.

### Credential helper not found
On first `activate_profile`, if you see a warning about the credential helper, make sure you built the project with `tauri:build` or `tauri:dev` first, which compiles and bundles the helper binary.

---

## Development Tips

- **Hot reload:** The React frontend supports hot reload — UI changes appear instantly without restarting.
- **Rust changes:** Any changes to Rust code restart the Tauri backend automatically in dev mode.
- **Logs:** Set `RUST_LOG=debug` in your `.env` for verbose Rust logging in the terminal where you ran `tauri:dev`.
- **Tests:** Run `npm run test` in `apps/desktop` to run Vitest unit tests.
- **Format:** Run `npm run format` to apply Prettier formatting.
- **Lint:** Run `npm run lint` for ESLint checks.
