# Screenshots Guide

This file explains how to generate screenshots for the documentation.

## What Screenshots Are Needed

| File | Description |
|------|-------------|
| `docs/assets/screenshot-home.png` | Home page with a few profile cards |
| `docs/assets/screenshot-onboarding.png` | First-run onboarding form |
| `docs/assets/screenshot-settings.png` | Settings page with diagnostics |
| `docs/assets/screenshot-github-connect.png` | GitHub connect modal step 1 |
| `docs/assets/screenshot-browser-picker.png` | Browser selection modal |
| `docs/assets/logo-placeholder.png` | App logo (80×80 px) |

## How to Generate

1. Run the app in dev mode: `npm run tauri:dev`
2. Set up 2–3 sample profiles (WORK, PERSONAL, FREELANCE)
3. Activate one profile so the active indicator is visible
4. Use the Tauri window screenshot shortcut or your OS screenshot tool:
   - **Windows:** Win+Shift+S, crop to the app window
   - **macOS:** Cmd+Shift+4, click on the app window
5. Save each screenshot to `docs/assets/` with the filename above

## Tips

- Use the default dark theme
- Make sure the "Active: WORK" pill is visible in the top bar
- Connect a GitHub account to at least one profile so the "Connected" badge shows
- Resize the window to exactly 960×680 (default size) for consistency
- On Windows, capture with 150% DPI scaling for HiDPI screenshots
