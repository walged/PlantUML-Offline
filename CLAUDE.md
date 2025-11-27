# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PlantUML Offline - desktop application for creating UML diagrams with PlantUML syntax.
- Framework: React 18 + TypeScript + Tauri 2.0 (Rust)
- Editor: Monaco Editor
- State: Zustand with localStorage persistence
- Target: Windows 10/11 (x64)

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Vite dev server (port 1420)
npm run build            # TypeScript + Vite production build
npm run tauri dev        # Full Tauri development with hot reload
npm run tauri build      # Production build (creates NSIS installer)
```

Output locations:
- Frontend: `dist/`
- Desktop exe: `src-tauri/target/release/plantuml-editor.exe`
- Installer: `src-tauri/target/release/bundle/nsis/`

## Architecture

### Frontend (src/)

```
src/
├── components/
│   ├── Editor/       # Monaco editor with tab system
│   ├── Preview/      # Live SVG preview with zoom/pan
│   ├── Toolbar/      # Buttons, Settings/About modals
│   ├── Sidebar/      # File list + 8 templates
│   └── ServerStatus/ # Offline warning
├── stores/
│   ├── editorStore.ts   # Files, activeFileId, preview (persist: plantuml-editor-storage)
│   ├── settingsStore.ts # Language, theme, server config + translations (persist: plantuml-editor-settings)
│   └── serverStore.ts   # Server connection status
├── lib/plantuml/
│   ├── renderer.ts      # PlantUML rendering with LRU cache (50 entries)
│   ├── embeddedServer.ts # Tauri IPC for server control
│   └── language.ts      # Monaco syntax highlighting
└── styles/              # CSS with theme variables
```

### Backend (src-tauri/)

```
src-tauri/
├── src/
│   ├── main.rs           # Entry point
│   ├── lib.rs            # Tauri setup, plugins, server lifecycle
│   ├── commands.rs       # IPC: save_file, open_file, export_svg, server management
│   └── plantuml_server.rs # Java process management, port detection, JRE bundling
├── resources/
│   ├── plantuml.jar      # PlantUML server
│   └── jre/              # Bundled Java runtime
└── capabilities/
    └── default.json      # Tauri permissions (fs, dialog, shell)
```

### State Flow

1. **Editor** → `setContent()` → editorStore → localStorage
2. **Content change** → 500ms debounce → `renderPlantUML()` → Preview SVG
3. **Render** → Check cache → POST to server → Update `previewSvg`
4. **Server** → Auto-starts (2s delay) → Port 18123 → Health checks every 10min

### Embedded Server

- Spawns Java process with bundled JRE or system Java
- Auto-finds available port starting from 18123
- Singleton pattern (one per app)
- Graceful shutdown on app exit via Tauri `RunEvent::Exit`

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root: lifecycle, auto-save (10s), theme, server checks |
| `src/stores/editorStore.ts` | File management with zustand persist |
| `src/stores/settingsStore.ts` | Settings + EN/RU translations |
| `src/lib/plantuml/renderer.ts` | Render with 10s timeout, LRU cache |
| `src-tauri/src/plantuml_server.rs` | Java process management |
| `src-tauri/capabilities/default.json` | fs/dialog/shell permissions |

## Common Tasks

**Add template:**
Edit `src/components/Sidebar/Sidebar.tsx` → `TEMPLATES` array

**Add setting:**
1. Add to `SettingsState` interface in settingsStore.ts
2. Add setter function
3. Add to persist partialize
4. Add translations (en/ru)
5. Add UI in Toolbar.tsx SettingsPanel

**Modify rendering:**
- Timeout: `renderer.ts` fetch AbortController
- Cache size: `MAX_CACHE_SIZE` constant
- Debounce: `Preview.tsx` setTimeout (currently 500ms)

## Important Notes

- Tauri IPC via `invoke()` - not browser APIs for file operations
- PNG export: Client-side Canvas API conversion from SVG
- Server auto-starts with 2s delay in Rust thread
- Settings/files persist to localStorage automatically
- Multi-language: EN/RU via `useTranslation()` hook from settingsStore
