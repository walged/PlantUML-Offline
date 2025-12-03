import { useEffect, useRef, useCallback, useState } from "react";
import Split from "react-split";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { Editor } from "./components/Editor/Editor";
import { Preview } from "./components/Preview/Preview";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ServerStatus } from "./components/ServerStatus/ServerStatus";
import { UpdateNotification } from "./components/UpdateNotification/UpdateNotification";
import { useEditorStore } from "./stores/editorStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useServerStore } from "./stores/serverStore";
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

    const interval = setInterval(() => {
      checkServerStatus();
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [checkServerStatus, checkServerStatusWithRetry]);

  // Auto-save on window close
  useEffect(() => {
    const saveBeforeClose = () => {
      const files = useEditorStore.getState().files;
      localStorage.setItem("plantuml-editor-autosave", JSON.stringify(files));
    };

    // Save on browser beforeunload
    window.addEventListener("beforeunload", saveBeforeClose);

    // Save on Tauri window close - with proper cleanup
    let isMounted = true;
    const appWindow = getCurrentWindow();

    appWindow.onCloseRequested(async () => {
      saveBeforeClose();
      // Don't prevent close, just save
    }).then((unlisten) => {
      if (isMounted) {
        unlistenRef.current = unlisten;
      } else {
        unlisten();
      }
    }).catch(() => {
      // Ignore errors during hot reload
    });

    return () => {
      isMounted = false;
      window.removeEventListener("beforeunload", saveBeforeClose);
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  // Auto-save periodically every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const files = useEditorStore.getState().files;
      localStorage.setItem("plantuml-editor-autosave", JSON.stringify(files));
    }, 10000);

    return () => clearInterval(interval);
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
      // Ctrl+S - Save
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+O - Open
      if (e.ctrlKey && e.key === "o") {
        e.preventDefault();
        handleOpen();
      }
      // Ctrl+N - New file
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        useEditorStore.getState().createNewFile();
      }
      // Ctrl+Z - Undo (handled by Monaco, but add fallback)
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        // Let Monaco handle it if editor is focused
        const activeElement = document.activeElement;
        if (!activeElement?.closest(".monaco-editor")) {
          e.preventDefault();
          useEditorStore.getState().undo();
        }
      }
      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
        const activeElement = document.activeElement;
        if (!activeElement?.closest(".monaco-editor")) {
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
