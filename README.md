# PlantUML Offline

A modern desktop application for creating UML diagrams using PlantUML syntax. Write code, see live preview.

## Features

- **Monaco Editor** - Professional code editor with PlantUML syntax highlighting
- **Live Preview** - See your diagrams update in real-time as you type
- **8 Built-in Templates** - Class, Sequence, Use Case, Activity, State, Component, ER, and Mind Map diagrams
- **Export Options** - Export diagrams to SVG and PNG formats
- **Zoom & Pan** - Navigate large diagrams with mouse wheel zoom and drag-to-pan
- **Embedded PlantUML Server** - Works offline with bundled Java runtime and PlantUML server
- **Multi-language Support** - English and Russian interfaces
- **Dark/Light Themes** - Choose your preferred visual style
- **Auto-save** - Never lose your work

## System Requirements

- Windows 10/11 (x64)
- No additional software required (Java runtime is bundled)

## Installation

### From Installer
1. Download the latest `.exe` installer from Releases
2. Run the installer
3. Launch PlantUML Editor from Start Menu

### From Source
```bash
# Clone the repository
git clone https://github.com/your-username/plantuml-editor.git
cd plantuml-editor

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Usage

### Creating Diagrams
1. Click "New" in the toolbar or use a template from the sidebar
2. Write PlantUML code in the editor
3. See the live preview on the right panel
4. Export to SVG or PNG when done

### Keyboard Shortcuts
- `Ctrl+S` - Save current file
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- Mouse wheel over preview - Zoom in/out
- Alt+Click and drag - Pan the preview

### Templates
The sidebar includes templates for common diagram types:
- **Class Diagram** - Classes, interfaces, and relationships
- **Sequence Diagram** - Object interactions over time
- **Use Case Diagram** - System functionality from user perspective
- **Activity Diagram** - Workflow and process flows
- **State Diagram** - State machines and transitions
- **Component Diagram** - System components and dependencies
- **ER Diagram** - Entity-relationship for databases
- **Mind Map** - Hierarchical brainstorming

### Server Settings
The app includes an embedded PlantUML server that starts automatically. You can also:
- Use the public PlantUML server (requires internet)
- Configure a custom server URL

Access server settings via the Settings button in the toolbar.

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Desktop Framework**: Tauri 2.0 (Rust)
- **Editor**: Monaco Editor
- **State Management**: Zustand
- **PlantUML Server**: Embedded picoweb mode
- **Java Runtime**: Eclipse Temurin JRE 21 (bundled)

## Project Structure

```
plantuml-editor/
├── src/                    # React frontend source
│   ├── components/         # UI components
│   ├── stores/            # Zustand state stores
│   └── lib/               # PlantUML utilities
├── src-tauri/             # Tauri/Rust backend
│   ├── src/               # Rust source code
│   └── resources/         # Bundled resources
│       ├── plantuml.jar   # PlantUML server
│       └── jre/           # Bundled Java runtime
└── public/                # Static assets
```

## Development

### Prerequisites
- Node.js 18+
- Rust (latest stable)
- For Windows: Visual Studio Build Tools

### Setup
```bash
# Install frontend dependencies
npm install

# Run development server
npm run tauri dev
```

### Building
```bash
# Build production release
npm run tauri build
```

The installer will be created in `src-tauri/target/release/bundle/nsis/`.

## Bundled Components

This application bundles:
- **PlantUML** (https://plantuml.com/) - Diagram generation engine
- **Eclipse Temurin JRE 21** (https://adoptium.net/) - Java runtime
- **Monaco Editor** (https://microsoft.github.io/monaco-editor/) - Code editor

## License

MIT License

## Acknowledgments

- [PlantUML](https://plantuml.com/) - The amazing diagram tool
- [Tauri](https://tauri.app/) - Desktop app framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - VS Code's editor
- [Eclipse Adoptium](https://adoptium.net/) - OpenJDK distribution
