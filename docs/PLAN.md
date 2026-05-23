# Vibe Vim Plan

## Goal

Build a practical Vim-style keyboard navigation extension for Chrome, Chromium, and Brave, starting with page navigation and growing toward a configurable browser control layer.

## Phase 1: Bootstrap and Core Navigation

- Create a Manifest V3 extension that can be loaded unpacked.
- Inject a content script on normal web pages.
- Support core movement keys: `h`, `j`, `k`, `l`, `u`, `d`, `gg`, and `G`.
- Avoid capturing keys while the user is typing in inputs, textareas, selects, or editable content.
- Add quick enable/disable controls in the popup.
- Add persistent settings through `chrome.storage.sync`.

## Phase 2: Link Hints

- Add `f` hints for visible links, buttons, fields, and tabindex targets.
- Keep hint labels deterministic and readable.
- Add follow-up actions for opening in a new tab, focusing fields, and copying URLs.
- Improve positioning across iframes, sticky headers, and dynamically changing pages.

## Phase 3: Keymap and Site Controls

- Add full key remapping in the options page.
- Add per-site enablement and blocklist/allowlist rules.
- Add import/export for settings.
- Add conflict handling for browser and page shortcuts.

## Phase 4: Browser Commands

- Add tab movement and tab closing commands through extension commands/background scripts.
- Add page search and mark/jump support.
- Add a command palette for less frequent actions.

## Phase 5: Testing and Packaging

- Add browser automation tests for navigation, ignored inputs, and hints.
- Add linting and formatting once the project has enough code to justify the tooling.
- Add release packaging for Chrome Web Store-compatible builds.
- Document manual verification for Chrome, Chromium, and Brave.
