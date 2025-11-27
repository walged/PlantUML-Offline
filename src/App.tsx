import { useEffect, useRef } from "react";
import Split from "react-split";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { Editor } from "./components/Editor/Editor";
import { Preview } from "./components/Preview/Preview";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ServerStatus } from "./components/ServerStatus/ServerStatus";
import { useEditorStore } from "./stores/editorStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useServerStore } from "./stores/serverStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./styles/App.css";

function App() {
  const { initializeStore } = useEditorStore();
  const theme = useSettingsStore((state) => state.theme);
  const { checkServerStatus, checkServerStatusWithRetry } = useServerStore();
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

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
    </div>
  );
}

export default App;
