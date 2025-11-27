import { useState, useEffect, useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useSettingsStore, useTranslation, type Language, type Theme } from "../../stores/settingsStore";
import { useServerStore, EMBEDDED_SERVER_URL } from "../../stores/serverStore";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile, writeFile } from "@tauri-apps/plugin-fs";
import {
  startEmbeddedServer,
  stopEmbeddedServer,
  restartEmbeddedServer,
  getEmbeddedServerStatus,
} from "../../lib/plantuml/embeddedServer";
import "./Toolbar.css";

export function Toolbar() {
  const { createNewFile, toggleSidebar, getActiveFile, undo, redo, markFileSaved, activeFileId } = useEditorStore();
  const t = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const activeFile = getActiveFile();

  const handleExportSvg = async () => {
    const svg = useEditorStore.getState().previewSvg;
    if (!svg) return;

    const activeFileName = getActiveFile()?.name || "diagram.puml";
    const defaultFileName = activeFileName.replace(/\.puml$/i, ".svg");

    const filePath = await saveDialog({
      defaultPath: defaultFileName,
      filters: [{ name: "SVG Image", extensions: ["svg"] }],
    });

    if (filePath) {
      await writeTextFile(filePath, svg);
    }
  };

  const handleExportPng = async () => {
    const svg = useEditorStore.getState().previewSvg;
    if (!svg) return;

    const activeFileName = getActiveFile()?.name || "diagram.puml";
    const defaultFileName = activeFileName.replace(/\.puml$/i, ".png");

    const filePath = await saveDialog({
      defaultPath: defaultFileName,
      filters: [{ name: "PNG Image", extensions: ["png"] }],
    });

    if (!filePath) return;

    // Convert SVG to PNG using canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = async () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);

      // Get PNG as blob, then convert to Uint8Array for Tauri
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await writeFile(filePath, uint8Array);
      }, "image/png");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  };

  const handleSave = useCallback(async () => {
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
  }, [activeFile, activeFileId, markFileSaved]);

  // Auto-save effect
  const { autoSave } = useSettingsStore();
  useEffect(() => {
    if (!autoSave) return;

    // Store content in localStorage for recovery
    const files = useEditorStore.getState().files;
    localStorage.setItem("plantuml-editor-autosave", JSON.stringify(files));
  }, [activeFile?.content, autoSave]);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" onClick={toggleSidebar} title={t.toggleSidebar}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h12v12H2V2zm1 1v10h3V3H3zm4 0v10h6V3H7z"/>
            </svg>
          </button>
          <div className="toolbar-divider" />
          <button className="toolbar-btn" onClick={() => createNewFile()} title={t.newFile}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5L9.5 1zM4 2h5v3h3v9H4V2z"/>
            </svg>
            <span>{t.newFile}</span>
          </button>
          <button className="toolbar-btn" onClick={handleSave} title={t.save}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zM3 2h10a1 1 0 0 1 1 1v8H2V3a1 1 0 0 1 1-1zm0 12a1 1 0 0 1-1-1v-1h12v1a1 1 0 0 1-1 1H3z"/>
              <path d="M5 5h6v3H5V5z"/>
            </svg>
            <span>{t.save}</span>
          </button>
          <div className="toolbar-divider" />
          <button className="toolbar-btn icon-only" onClick={undo} title={t.undo}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.5 6.5L1 10l3.5 3.5V11H8c2.76 0 5-2.24 5-5s-2.24-5-5-5H3v2h5c1.66 0 3 1.34 3 3s-1.34 3-3 3H4.5V6.5z"/>
            </svg>
          </button>
          <button className="toolbar-btn icon-only" onClick={redo} title={t.redo}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.5 6.5L15 10l-3.5 3.5V11H8c-2.76 0-5-2.24-5-5s2.24-5 5-5h5v2H8C6.34 3 5 4.34 5 6s1.34 3 3 3h3.5V6.5z"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-center">
          <span className="app-title">PlantUML Editor</span>
          <ServerStatusIndicator />
        </div>

        <div className="toolbar-right">
          <button className="toolbar-btn" onClick={handleExportSvg} title={t.exportSvg}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 12l-4-4h2.5V3h3v5H12L8 12z"/>
              <path d="M14 14H2v-3h1v2h10v-2h1v3z"/>
            </svg>
            <span>{t.exportSvg}</span>
          </button>
          <button className="toolbar-btn" onClick={handleExportPng} title={t.exportPng}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 12l-4-4h2.5V3h3v5H12L8 12z"/>
              <path d="M14 14H2v-3h1v2h10v-2h1v3z"/>
            </svg>
            <span>{t.exportPng}</span>
          </button>
          <div className="toolbar-divider" />
          <button className="toolbar-btn" onClick={() => setShowSettings(true)} title={t.settings}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
            </svg>
            <span>{t.settings}</span>
          </button>
          <button className="toolbar-btn" onClick={() => setShowAbout(true)} title={t.about}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
            <span>{t.about}</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.settingsTitle}</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="modal-content">
              <SettingsPanel />
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.aboutTitle}</h2>
              <button className="modal-close" onClick={() => setShowAbout(false)}>×</button>
            </div>
            <div className="modal-content">
              <AboutPanel />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SettingsPanel() {
  const t = useTranslation();
  const {
    language, setLanguage,
    theme, setTheme,
    fontSize, setFontSize,
    renderDelay, setRenderDelay,
    autoSave, setAutoSave,
    imageSavePath, setImageSavePath,
    plantUmlServer, setPlantUmlServer,
    useEmbeddedServer, setUseEmbeddedServer
  } = useSettingsStore();

  const { embeddedServerRunning, embeddedServerError, setEmbeddedServerStatus, checkServerStatusWithRetry } = useServerStore();
  const [serverLoading, setServerLoading] = useState(false);

  // Check embedded server status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await getEmbeddedServerStatus();
        setEmbeddedServerStatus(status.running, status.error);
      } catch {
        // Ignore
      }
    };
    checkStatus();
  }, [setEmbeddedServerStatus]);

  const handleChoosePath = async () => {
    const selected = await openDialog({
      directory: true,
      title: t.selectImageFolder,
    });
    if (selected) {
      setImageSavePath(selected as string);
    }
  };

  const handleToggleEmbeddedServer = (enabled: boolean) => {
    setUseEmbeddedServer(enabled);
    if (enabled) {
      // When enabling embedded server, set the URL automatically
      setPlantUmlServer(EMBEDDED_SERVER_URL);
    } else {
      // When disabling, restore default public server
      setPlantUmlServer("https://www.plantuml.com/plantuml");
    }
  };

  const handleStartServer = async () => {
    setServerLoading(true);
    try {
      const status = await startEmbeddedServer();
      setEmbeddedServerStatus(status.running, status.error);
      if (status.running) {
        setPlantUmlServer(status.url);
        // Give Java server time to start, then check with retries
        setTimeout(() => {
          checkServerStatusWithRetry(5, 1000);
        }, 2000);
      }
    } catch (error) {
      setEmbeddedServerStatus(false, String(error));
    } finally {
      setServerLoading(false);
    }
  };

  const handleStopServer = async () => {
    setServerLoading(true);
    try {
      await stopEmbeddedServer();
      setEmbeddedServerStatus(false);
    } catch (error) {
      setEmbeddedServerStatus(false, String(error));
    } finally {
      setServerLoading(false);
    }
  };

  const handleRestartServer = async () => {
    setServerLoading(true);
    try {
      const status = await restartEmbeddedServer();
      setEmbeddedServerStatus(status.running, status.error);
      if (status.running) {
        setPlantUmlServer(status.url);
        // Give Java server time to start, then check with retries
        setTimeout(() => {
          checkServerStatusWithRetry(5, 1000);
        }, 2000);
      }
    } catch (error) {
      setEmbeddedServerStatus(false, String(error));
    } finally {
      setServerLoading(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="setting-group">
        <label>{t.language}</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="setting-select"
        >
          <option value="en">English</option>
          <option value="ru">Русский</option>
        </select>
      </div>

      <div className="setting-group">
        <label>{t.theme}</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className="setting-select"
        >
          <option value="dark">{t.darkTheme}</option>
          <option value="light">{t.lightTheme}</option>
        </select>
      </div>

      <div className="setting-group">
        <label>{t.editorFontSize}</label>
        <input
          type="number"
          min="10"
          max="24"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />
      </div>

      <div className="setting-group">
        <label>{t.renderDelay}</label>
        <input
          type="number"
          min="100"
          max="2000"
          step="100"
          value={renderDelay}
          onChange={(e) => setRenderDelay(Number(e.target.value))}
        />
        <span className="setting-hint">{t.renderDelayHint}</span>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => setAutoSave(e.target.checked)}
          />
          {t.autoSave}
        </label>
      </div>

      <div className="setting-group">
        <label>{t.imageSavePath}</label>
        <div className="setting-path">
          <input
            type="text"
            value={imageSavePath || ""}
            placeholder={t.notSet}
            readOnly
          />
          <button className="setting-path-btn" onClick={handleChoosePath}>
            {t.choosePath}
          </button>
        </div>
      </div>

      {/* Embedded Server Settings */}
      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useEmbeddedServer}
            onChange={(e) => handleToggleEmbeddedServer(e.target.checked)}
          />
          {t.useEmbeddedServer}
        </label>
        <span className="setting-hint">{t.embeddedServerHint}</span>
      </div>

      {useEmbeddedServer && (
        <div className="setting-group embedded-server-controls">
          <div className="server-status-row">
            <span className={`server-status-badge ${embeddedServerRunning ? 'running' : 'stopped'}`}>
              {embeddedServerRunning ? t.embeddedServerRunning : t.embeddedServerStopped}
            </span>
            {embeddedServerRunning && (
              <span className="server-port">{t.embeddedServerPort}: 18123</span>
            )}
          </div>
          {embeddedServerError && (
            <div className="server-error">{embeddedServerError}</div>
          )}
          <div className="server-buttons">
            {!embeddedServerRunning ? (
              <button
                className="setting-path-btn"
                onClick={handleStartServer}
                disabled={serverLoading}
              >
                {serverLoading ? "..." : t.startEmbeddedServer}
              </button>
            ) : (
              <>
                <button
                  className="setting-path-btn danger"
                  onClick={handleStopServer}
                  disabled={serverLoading}
                >
                  {serverLoading ? "..." : t.stopEmbeddedServer}
                </button>
                <button
                  className="setting-path-btn"
                  onClick={handleRestartServer}
                  disabled={serverLoading}
                >
                  {serverLoading ? "..." : t.restartEmbeddedServer}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {!useEmbeddedServer && (
        <div className="setting-group">
          <label>{t.plantUmlServer}</label>
          <input
            type="text"
            value={plantUmlServer}
            onChange={(e) => setPlantUmlServer(e.target.value)}
            placeholder="https://www.plantuml.com/plantuml"
          />
          <span className="setting-hint">{t.customServerHint}</span>
        </div>
      )}
    </div>
  );
}

function AboutPanel() {
  const t = useTranslation();

  return (
    <div className="about-panel">
      <div className="about-logo">
        <svg width="64" height="64" viewBox="0 0 100 100">
          <rect width="100" height="100" rx="15" fill="#2d2d30"/>
          <text x="50" y="65" fontFamily="Arial" fontSize="32" fontWeight="bold" fill="#4ec9b0" textAnchor="middle">UML</text>
        </svg>
      </div>

      <h3>PlantUML Editor</h3>
      <p className="version">{t.version} 0.1.0</p>

      <p className="description">{t.description}</p>

      <div className="about-features">
        <h4>{t.features}:</h4>
        <ul>
          <li>{t.feature1}</li>
          <li>{t.feature2}</li>
          <li>{t.feature3}</li>
          <li>{t.feature4}</li>
          <li>{t.feature5}</li>
        </ul>
      </div>

      <div className="about-links">
        <p>
          <strong>{t.developer}:</strong>{" "}
          <span className="developer-name">WALGED</span>
        </p>
        <p>
          <strong>{t.website}:</strong>{" "}
          <a href="https://arthurdev.ru" target="_blank" rel="noopener noreferrer">
            arthurdev.ru
          </a>
        </p>
        <p>
          <strong>{t.github}:</strong>{" "}
          <a href="https://github.com/walged/PlantUML-Offline" target="_blank" rel="noopener noreferrer">
            github.com/walged/PlantUML-Offline
          </a>
        </p>
        <div className="about-divider" />
        <p>
          {t.poweredBy}{" "}
          <a href="https://plantuml.com" target="_blank" rel="noopener noreferrer">
            PlantUML
          </a>
        </p>
        <p>
          {t.builtWith}{" "}
          <a href="https://tauri.app" target="_blank" rel="noopener noreferrer">
            Tauri
          </a>{" "}
          +{" "}
          <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
            React
          </a>
        </p>
      </div>
    </div>
  );
}

function ServerStatusIndicator() {
  const { status, setShowWarning } = useServerStore();
  const t = useTranslation();

  const getStatusColor = () => {
    switch (status) {
      case "online":
        return "#4caf50";
      case "offline":
        return "#f44336";
      case "checking":
        return "#ff9800";
      default:
        return "#9e9e9e";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "online":
        return t.serverOnline || "Online";
      case "offline":
        return t.serverOffline || "Offline";
      case "checking":
        return t.serverChecking || "Checking...";
      default:
        return "";
    }
  };

  return (
    <button
      className="server-status-indicator"
      onClick={() => status === "offline" && setShowWarning(true)}
      title={getStatusText()}
    >
      <span
        className="status-dot"
        style={{ backgroundColor: getStatusColor() }}
      />
      {status === "offline" && <span className="status-text">Offline</span>}
    </button>
  );
}
