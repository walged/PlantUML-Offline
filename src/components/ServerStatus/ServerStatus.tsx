import { useServerStore } from "../../stores/serverStore";
import { useSettingsStore, useTranslation } from "../../stores/settingsStore";
import "./ServerStatus.css";

export function ServerStatus() {
  const { showOfflineWarning, dismissWarning, checkServerStatus } = useServerStore();
  const { plantUmlServer } = useSettingsStore();
  const t = useTranslation();

  if (!showOfflineWarning) {
    return null;
  }

  return (
    <div className="server-status-overlay">
      <div className="server-status-modal">
        <div className="server-status-header">
          <span className="server-status-icon">⚠️</span>
          <h3>{t.serverOfflineTitle || "Server Unavailable"}</h3>
        </div>
        <div className="server-status-content">
          <p>{t.serverOfflineMessage || "PlantUML server is not reachable. Diagram rendering will not work."}</p>
          <p className="server-url">
            {t.currentServer || "Current server"}: <code>{plantUmlServer}</code>
          </p>
          <div className="server-status-suggestions">
            <h4>{t.suggestions || "Suggestions"}:</h4>
            <ul>
              <li>{t.suggestionCheckInternet || "Check your internet connection"}</li>
              <li>{t.suggestionLocalServer || "Run a local PlantUML server:"}</li>
            </ul>
            <pre className="code-block">
              docker run -d -p 8080:8080 plantuml/plantuml-server:jetty
            </pre>
            <p className="hint">{t.localServerHint || "Then set server URL to:"} <code>http://localhost:8080</code></p>
          </div>
        </div>
        <div className="server-status-actions">
          <button className="btn-secondary" onClick={dismissWarning}>
            {t.dismiss || "Dismiss"}
          </button>
          <button className="btn-primary" onClick={checkServerStatus}>
            {t.retryConnection || "Retry Connection"}
          </button>
        </div>
      </div>
    </div>
  );
}
