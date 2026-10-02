# Changelog

All notable changes to Git Persona are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

No version has been tagged yet. The manifests carry `0.1.0`, which will become the first release once the items in the [release roadmap](docs/PROXIMOS_PASSOS_RELEASE.md) are done.

### Added

- Multiple Git profiles, each with a label, `user.name`, and `user.email`.
- One-click profile activation that writes the global Git identity and registers the Git Persona credential helper.
- GitHub sign-in through the OAuth Device Flow. Tokens are stored only in the operating system keychain.
- Browser picker for the Device Flow verification page, with per-platform browser detection and a system "Open with" fallback.
- `gitpersona-helper`, a Git credential helper that serves the active profile's token for `github.com` over HTTPS.
- SSH key management per profile: `ed25519` key generation, public key registration on GitHub, and a managed `github.com` block in `~/.ssh/config`.
- System tray icon with quick profile switching.
- Optional launch at login.
- Diagnostics for the Git version, global identity, configured helper, and active profile, without collecting tokens.
- Keychain availability check at startup, with an in-app warning when the keychain cannot be used.
- English and Brazilian Portuguese documentation, a changelog, and a release roadmap for Windows and Linux.
- MIT license.

### Changed

- The root `README.md` is now in English. The previous Portuguese guide moved to `docs/README.pt-BR.md`.
- npm is the only package manager. The stray `apps/desktop/pnpm-lock.yaml` was removed in favor of the root `package-lock.json`.

### Fixed

- The frontend production build (`npm run build`) and `npm run lint` no longer fail on unused imports and an unused, mistyped resolver module.
- GitHub sign-in no longer starts two polling loops after the browser is chosen, which doubled the request rate against the Device Flow endpoint.
- Removed dead code that produced Rust compiler warnings.

### Known limitations

- No installers are published. Generated bundles do not include `gitpersona-helper`, and the OAuth Client ID is not embedded in production builds.
- Activating a profile replaces the global `credential.helper` instead of preserving existing helpers.
- Only `github.com` is supported.
- Generated SSH keys have no passphrase.
- macOS is untested.

[Unreleased]: https://github.com/osamucadev/gitpersona/commits/main
