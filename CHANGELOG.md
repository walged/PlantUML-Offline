# Changelog

All notable changes to this project are documented in this file.

## [0.2.0]

### Added

- **AI Assistant** (bring-your-own-key). All LLM calls run from the Rust backend
  (no CORS, key never enters the webview).
  - Providers: OpenRouter (default), DeepSeek, OpenAI, Anthropic, and any
    OpenAI-compatible endpoint via a custom base URL (Qwen, Kie.AI, Ollama, …).
  - Generate a diagram from a natural-language description.
  - "Fix with AI" button on render errors.
  - Contextual chat panel about the current diagram.
  - Improve / refactor the current diagram.
- Continuous Integration workflow (`.github/workflows/ci.yml`): typecheck,
  Prettier format check, frontend build, and `cargo check`.
- Prettier configuration and `format` / `typecheck` npm scripts.
- React `ErrorBoundary` with a recovery screen and a "Reset app data" action.
- Server log capture and a `get_plantuml_server_log` command for diagnostics.

### Changed

- **Bundled PlantUML upgraded to v1.2026.6** (from 1.2024.7) so the `!pragma
  layout elk` engine works reliably with the bundled JRE 21 (issue #2).
- Render cache moved from `localStorage` to an in-memory LRU, removing pressure
  on the storage quota.
- Settings/About dialogs are now accessible (Escape to close, focus trap, ARIA),
  responsive, and scroll on short windows.
- Each open file now has its own Monaco model (independent undo/redo and cursor),
  fixing cross-tab undo corruption.
- Preview zoom is now anchored to the cursor; panning continues correctly when
  the mouse is released outside the window.

### Fixed

- **Black screen on startup (issue #1):** removed a redundant autosave copy that
  duplicated and bloated `localStorage`, added crash-proof storage wrappers, and
  the new `ErrorBoundary` shows a recovery screen instead of a blank window.
- **"PlantUML server error: 509 / 503" with ELK (issue #2):** updated the engine,
  surfaced the real JVM error instead of a masked code, and ensured the bundled
  JRE is preferred (with a warning when falling back to system Java).
- Render errors now expose the real server message; the "Restart server" button
  only appears for network/server errors when the embedded server is in use.
- Hardcoded English strings ("Offline", empty-editor text) now use translations.
- Icon-only buttons and tab close buttons have accessible labels.
- SVG previews are sanitized before injection (scripts/handlers/foreignObject
  stripped).

### Security

- Narrowed the filesystem capability scope (removed the whole-disk `**` rule).
- Added a Content-Security-Policy (previously `null`).
- Hardened the Windows port-kill logic to only target a process LISTENING on our
  local address+port.
