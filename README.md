# Vibe Vim

Vibe Vim is a Chrome/Chromium/Brave extension for keyboard-first page navigation with Vim-style keys.

## Current Scope

- Manifest V3 unpacked extension.
- Normal-mode scrolling with `h`, `j`, `k`, `l`.
- Page movement with `u`, `d`, `gg`, and `G`.
- Browser history movement with `H` and `L`.
- Link hints with `f`.
- Popup toggles for enablement, smooth scroll, and hints.
- Options page for scroll tuning and key remapping.

## Load Locally

1. Open `chrome://extensions`, `brave://extensions`, or `edge://extensions`.
2. Enable developer mode.
3. Choose "Load unpacked".
4. Select this repository folder.

## Development Plan

See [docs/PLAN.md](docs/PLAN.md).

## File Layout

- `manifest.json` defines the extension entrypoints.
- `src/content.js` runs Vim-style navigation on web pages.
- `src/popup.html` and related files provide quick toggles.
- `src/options.html` and related files provide persistent configuration.
