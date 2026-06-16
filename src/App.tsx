import { useEffect, useRef, useCallback, useState } from "react";
import Split from "react-split";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { Editor } from "./components/Editor/Editor";
import { Preview } from "./components/Preview/Preview";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ServerStatus } from "./components/ServerStatus/ServerStatus";
import { UpdateNotification } from "./components/UpdateNotification/UpdateNotification";
import { AiPanel } from "./components/AiPanel/AiPanel";
import { useEditorStore } from "./stores/editorStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useServerStore } from "./stores/serverStore";
import { useUiStore } from "./stores/uiStore";
import { checkForUpdates, UpdateInfo } from "./lib/updater";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import "./styles/App.css";

function App() {
  const { initializeStore } = useEditorStore();
  const theme = useSettingsStore((state) => state.theme);
  const checkForUpdatesEnabled = useSettingsStore((state) => state.checkForUpdates);
  const { checkServerStatus, checkServerStatusWithRetry } = useServerStore();
  const aiPanelOpen = useUiStore((s) => s.aiPanelOpen);
  const setAiPanelOpen = useUiStore((s) => s.setAiPanelOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const unlistenRef = useRef<(() => void) | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Check for updates on startup
  useEffect(() => {
    if (!checkForUpdatesEnabled) return;

    const checkUpdates = async () => {
      try {
        const info = await checkForUpdates();
        if (info.available) {
          setUpdateInfo(info);
          setShowUpdateNotification(true);
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    // Delay update check to not interfere with app startup
    const timeout = setTimeout(checkUpdates, 3000);
    return () => clearTimeout(timeout);
  }, [checkForUpdatesEnabled]);

  // Check server status on startup (after 5 sec with retries for embedded server) and every 10 minutes
  useEffect(() => {
    // Initial check with retries - embedded server needs time to start (Rust waits 2s, Java needs more)
    const initialCheck = setTimeout(() => {
      checkServerStatusWithRetry(5, 1500); // 5 retries, 1.5s between each
    }, 5000); // Wait 5s before first check

    const interval = setInterval(
      () => {
        checkServerStatus();
      },
      10 * 60 * 1000,
    ); // 10 minutes

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [checkServerStatus, checkServerStatusWithRetry]);

  // The zustand `persist` middleware already saves `files` to localStorage on
  // every change (via a crash-proof safeStorage adapter), so no extra autosave
  // loop is needed. The previous code wrote a second, redundant
  // "plantuml-editor-autosave" copy that was never read back and doubled
  // localStorage usage — a key cause of the quota-overflow black screen
  // (issue #1). Both the periodic timer and the on-close duplicate were removed.
  // We still register an onCloseRequested listener (currently a no-op) so future
  // shutdown hooks have a place to live, with proper cleanup on unmount.
  useEffect(() => {
    let isMounted = true;
    const appWindow = getCurrentWindow();

    appWindow
      .onCloseRequested(async () => {
        // State is already persisted on change; nothing to flush here.
      })
      .then((unlisten) => {
        if (isMounted) {
          unlistenRef.current = unlisten;
        } else {
          unlisten();
        }
      })
      .catch(() => {
        // Ignore errors during hot reload
      });

    return () => {
      isMounted = false;
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Global keyboard shortcuts
  const handleSave = useCallback(async () => {
    const { getActiveFile, activeFileId, markFileSaved } = useEditorStore.getState();
    const activeFile = getActiveFile();
    if (!activeFile) return;

    const filePath = await saveDialog({
      defaultPath: activeFile.name,
      filters: [{ name: "PlantUML", extensions: ["puml"] }],
    });

    if (filePath) {
      await writeTextFile(filePath, activeFile.content);
      if (activeFileId) {
        markFileSaved(activeFileId);
      }
    }
  }, []);

  const handleOpen = useCallback(async () => {
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: "PlantUML", extensions: ["puml", "plantuml", "pu", "wsd"] }],
    });

    if (selected && typeof selected === "string") {
      const content = await readTextFile(selected);
      const fileName = selected.split(/[/\\]/).pop() || "diagram.puml";

      const { files } = useEditorStore.getState();
      const newFile = {
        id: crypto.randomUUID(),
        name: fileName,
        content,
        isModified: false,
      };
      useEditorStore.setState({
        files: [...files, newFile],
        activeFileId: newFile.id,
      });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();

      // Don't hijack shortcuts while typing in a non-Monaco text field
      // (e.g. the rename input or a settings field). Monaco has its own.
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        !target.closest(".monaco-editor");

      // Ctrl+S - Save
      if (key === "s" && !inField) {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+O - Open
      if (key === "o" && !inField) {
        e.preventDefault();
        handleOpen();
      }
      // Ctrl+N - New file
      if (key === "n" && !inField) {
        e.preventDefault();
        useEditorStore.getState().createNewFile();
      }
      // Ctrl+Z - Undo (handled by Monaco, but add fallback)
      if (key === "z" && !e.shiftKey) {
        const activeElement = document.activeElement;
        if (!activeElement?.closest(".monaco-editor") && !inField) {
          e.preventDefault();
          useEditorStore.getState().undo();
        }
      }
      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if (key === "y" || (e.shiftKey && key === "z")) {
        const activeElement = document.activeElement;
        if (!activeElement?.closest(".monaco-editor") && !inField) {
          e.preventDefault();
          useEditorStore.getState().redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleOpen]);

  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">
        <Sidebar />
        <Split
          className="split-horizontal"
          sizes={[50, 50]}
          minSize={300}
          gutterSize={4}
          direction="horizontal"
        >
          <Editor />
          <Preview />
        </Split>
        {aiPanelOpen && (
          <AiPanel
            onClose={() => setAiPanelOpen(false)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
      </div>
      <ServerStatus />
      {showUpdateNotification && updateInfo && (
        <UpdateNotification
          updateInfo={updateInfo}
          onClose={() => setShowUpdateNotification(false)}
        />
      )}
    </div>
  );
}

export default App;
