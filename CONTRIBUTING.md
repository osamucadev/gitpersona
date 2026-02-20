# Contributing to Git Persona

Thank you for considering a contribution! This document covers how to get set up,
our conventions, and the process for submitting changes.

> **Português (Brasil):** See the [CONTRIBUINDO.md](CONTRIBUINDO.md) file.

---

## Code of Conduct

Be kind, respectful, and constructive. This is a welcoming project for developers of all experience levels.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork: `git clone https://github.com/YOUR-USERNAME/gitpersona.git`
3. Follow the [How to Run guide](docs/HOW_TO_RUN.md) to set up your environment
4. Create a **feature branch**: `git checkout -b feat/my-feature`
5. Make your changes
6. Run `npm run lint` and `npm run test`
7. Commit and push to your fork
8. Open a **Pull Request** against the `main` branch

---

## Development Workflow

### Frontend (React/TypeScript)
- Source is in `apps/desktop/src-ui/`
- Run `npm run dev` inside `apps/desktop` for isolated UI work (no Tauri)
- Hot reload is available for all UI changes

### Backend (Rust/Tauri)
- Source is in `apps/desktop/src-tauri/src/` and `crates/`
- Changes to Rust code require recompilation (automatic in `tauri:dev`)
- Commands are in `src/commands/`, each file maps to a feature area

### Credential Helper
- Source is in `crates/credential-helper/`
- This is a separate binary compiled independently
- Changes require rebuilding via `cargo build -p gitpersona-credential-helper`

---

## Code Style

### TypeScript / React
- **Formatter:** Prettier (`npm run format`)
- **Linter:** ESLint (`npm run lint`)
- Use named exports for components
- Co-locate component logic inside the component file for small components
- Use Zustand for global state; avoid prop-drilling past 2 levels

### Rust
- Follow standard Rust conventions (`rustfmt`)
- Use `anyhow::Result` for fallible functions
- Document public functions with `///` doc comments
- Avoid `unwrap()` in production code — use `?` or explicit error handling
- Use `tracing::*` macros for logging, never `println!`

---

## Adding a New Tauri Command

1. Add the handler function to the appropriate file in `src/commands/`
2. Register it in `src/lib.rs` inside `generate_handler![]`
3. Add the TypeScript wrapper in `src-ui/lib/tauri.ts`
4. Add the TypeScript types in `src-ui/types/index.ts` if new types are needed

---

## Adding a New UI Page

1. Create the component in `src-ui/pages/`
2. Add the route in `src-ui/App.tsx`
3. Add a navigation link in `src-ui/components/TopBar.tsx`

---

## Testing

- **UI logic:** `npm run test` (Vitest)
- **Rust:** `cargo test --workspace`
- Test files for UI go in `src-ui/__tests__/` or co-located as `*.test.tsx`

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add browser memory across sessions
fix: credential helper not found on first activate
docs: update HOW_TO_RUN guide
refactor: extract browser detection to separate module
chore: update dependencies
```

---

## Pull Request Checklist

- [ ] Code is formatted (`npm run format`)
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] New features have a brief description in the PR
- [ ] Security-sensitive changes are called out explicitly
- [ ] No tokens, secrets, or API keys are committed

---

## Reporting Bugs

Open a GitHub Issue with:
1. A clear title
2. Steps to reproduce
3. Expected vs actual behavior
4. Copy of diagnostics (Settings → Diagnostics → Copy — tokens are redacted)
5. OS version

---

## Security Issues

Please **do not** open a public GitHub Issue for security vulnerabilities.
Instead, email the maintainers directly or use GitHub's private security advisory feature.
