# Git Persona | Architecture

> **Português (Brasil):** [architecture.pt-BR.md](architecture.pt-BR.md)

---

## Overview

Git Persona is a Tauri v2 desktop application. The frontend is built with React + TypeScript;
the backend is Rust. They communicate via Tauri's IPC bridge, not HTTP.

```
┌────────────────────────────────────────────────────────┐
│  Git Persona Desktop App                               │
│                                                        │
│  ┌─────────────────────┐    IPC   ┌─────────────────┐  │
│  │   React Frontend    │ ◄──────► │   Tauri/Rust    │  │
│  │   (WebView2)        │          │   Backend       │  │
│  │                     │          │                 │  │
│  │  Zustand store      │          │  Commands       │  │
│  │  Framer Motion      │          │  State          │  │
│  │  Tailwind CSS       │          │  Tray           │  │
│  └─────────────────────┘          └────────┬────────┘  │
│                                            │           │
└────────────────────────────────────────────┼───────────┘
                                             │
        ┌────────────────────────────────────┼───────────┐
        │  Rust Crates                       │           │
        │  ┌──────────┐  ┌─────────┐  ┌─────▼──────┐     │
        │  │   core   │  │  git    │  │    auth    │     │
        │  │  (types) │  │(git CLI)│  │(OAuth flow)│     │
        │  └──────────┘  └─────────┘  └────────────┘     │
        │                                                │
        │  ┌──────────────────────────────────────────┐  │
        │  │          credential-helper               │  │
        │  │     (standalone binary, invoked by git)  │  │
        │  └──────────────────────────────────────────┘  │
        └────────────────────────────────────────────────┘
```

---

## Data Flow

### Activating a Profile

```
User clicks "Activate"
  → React: calls invoke("activate_profile", { id })
    → Rust: commands/git.rs: activate_profile()
      → reads profile from AppState
      → calls git config --global user.name "..."
      → calls git config --global user.email "..."
      → calls git config --global credential.helper "/path/to/gitpersona-helper"
      → updates settings.activeProfileId
      → persists store.json to disk
      → emits "profile-activated" event
    → React: listens for "profile-activated", refreshes UI
```

### HTTPS Git Authentication

```
User runs: git push origin main
  → git asks for credentials for github.com
  → git invokes: /path/to/gitpersona-helper get
    → helper reads store.json from app data dir
    → reads activeProfileId
    → looks up token_ref from the active profile
    → retrieves token from OS keychain using token_ref
    → outputs: username=octocat\npassword=ghp_xxx
  → git uses the credentials for the HTTPS request
```

### GitHub OAuth Device Flow

```
User clicks "Connect GitHub"
  → React: githubStartDeviceFlow(profileId)
    → Rust: POST github.com/login/device/code
    → returns { user_code, verification_uri, device_code }
  → React: shows user_code, opens BrowserPickerModal
  → User picks a browser
  → React: openUrlInBrowser(verification_uri, browser.executable)
    → Rust: spawns the browser process with the URL as argument
  → React: polls githubPollDeviceFlow every N seconds
    → Rust: POST github.com/login/oauth/access_token
    → on success: calls GET github.com/user for username
    → stores token in OS keychain via keyring crate
    → stores profile.github.username, profile.github.tokenRef (not the token)
    → persists store.json
  → React: shows success, closes modal
```

---

## Security Model

### Token Storage

All GitHub access tokens are stored **exclusively** in the OS keychain:
- **Windows:** Windows Credential Locker (`keyring` crate via Windows DPAPI)
- **macOS:** macOS Keychain Services
- **Linux:** libsecret (GNOME Keyring / KWallet)

The `store.json` file on disk contains a **token reference** (`tokenRef`), a key name
used to look up the token in the keychain. The token itself is never written to disk.

If the keychain is unavailable, the app shows a blocking error screen and refuses to proceed.

### Credential Helper Security

The credential helper (`gitpersona-helper`) is a standalone binary that:
1. Only responds to `get` action (ignores `store` and `erase`)
2. Only outputs credentials for hosts matching `github.com`
3. Reads the token from the OS keychain, never from a plain-text file
4. If no active profile or no connected GitHub account, outputs nothing
   (allowing git to fall back to other credential helpers)

### Log Redaction

The `redact()` function in `crates/core/src/lib.rs` scans strings for GitHub token
patterns (`ghp_`, `gho_`, etc.) and replaces them with `[REDACTED]` before logging.

---

## Browser Selection

### Why It's Always Asked

Per the security and UX requirements, the app always asks which browser to open
before navigating to the GitHub verification URL. This prevents silent redirects
to an unexpected browser (e.g., a work-managed browser that might log the URL).

### Browser Detection (Windows)

On Windows, browsers are detected by reading known registry paths under:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\<browser>.exe
```

Known browsers checked: Chrome, Edge, Firefox, Brave, Opera, Vivaldi.

The detected executable path is then used to spawn the browser directly:
```rust
std::process::Command::new(&exe_path).arg(&url).spawn()
```

### System Open With Fallback

If the user selects "System Open With", the app uses:
```
rundll32.exe shell32.dll,OpenAs_RunDLL <url>
```

This triggers the Windows "How do you want to open this?" dialog, letting the user
choose any installed browser at the OS level.

---

## Credential Helper — Detailed Flow

### Registration

When `activate_profile` runs, it calls:
```
git config --global credential.helper /absolute/path/to/gitpersona-helper
```

This replaces any previous credential helper. The path points to the binary bundled
inside the Tauri app's resource directory.

### Invocation

Git invokes credential helpers as:
```
gitpersona-helper get
```

And passes a key=value payload via stdin:
```
protocol=https
host=github.com
```

The helper reads stdin, checks that host is `github.com` and protocol is `https/http`,
then retrieves and outputs the credentials.

### Store Lookup

The helper resolves the app data directory platform-specifically:
- Windows: `%APPDATA%\gitpersona\store.json`
- macOS: `~/Library/Application Support/gitpersona/store.json`
- Linux: `~/.local/share/gitpersona/store.json`

---

## State Management

### In-Memory State (Rust)

`AppState` (`src/state.rs`) holds the full `AppStore` in a `Mutex<AppStateInner>`.
All Tauri commands lock this mutex to read or mutate state, then call `persist_store()`
to write changes to disk as JSON.

### Persistence (disk)

`store.json` is stored in the Tauri app's local data directory. It contains:
- All profiles (without tokens)
- App settings

### In-Memory State (React)

Zustand (`src-ui/store/useStore.ts`) mirrors the backend state in the frontend.
The store is populated on startup via `loadAll()` and refreshed after mutations.

---

## Tray Icon

The tray icon (`src/tray.rs`) is built using Tauri's `TrayIconBuilder`.
The menu is dynamically generated from the current profile list.

Left-clicking the tray icon shows/focuses the main window.
Quick-switch menu items trigger `activate_profile_impl()` directly from Rust.

---

## Autostart

Autostart is managed by the `tauri-plugin-autostart` plugin.

On Windows, it writes to `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`.

The toggle in Settings calls `set_autostart(enabled)` which both updates the registry
and persists the preference to `store.json`.
