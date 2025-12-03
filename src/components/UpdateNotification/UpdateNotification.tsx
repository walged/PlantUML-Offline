import { useTranslation } from "../../stores/settingsStore";
import { UpdateInfo } from "../../lib/updater";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import "./UpdateNotification.css";

interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  onClose: () => void;
}

export function UpdateNotification({ updateInfo, onClose }: UpdateNotificationProps) {
  const t = useTranslation();

  const handleDownload = async () => {
    try {
      await openUrl(updateInfo.releaseUrl);
      onClose();
    } catch (error) {
      console.error("Failed to open release URL:", error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal update-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t.updateAvailable}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <div className="update-panel">
            <div className="update-icon">🎉</div>
            <p className="update-message">
              {t.newVersionAvailable.replace("{version}", updateInfo.latestVersion)}
            </p>
            <div className="update-versions">
              <span className="current-version">
                {t.currentVersion}: <strong>{updateInfo.currentVersion}</strong>
              </span>
              <span className="arrow">→</span>
              <span className="new-version">
                <strong>{updateInfo.latestVersion}</strong>
              </span>
            </div>
            {updateInfo.releaseName && (
              <p className="release-name">{updateInfo.releaseName}</p>
            )}
            <div className="update-buttons">
              <button className="update-btn primary" onClick={handleDownload}>
                {t.download}
              </button>
              <button className="update-btn secondary" onClick={onClose}>
                {t.later}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
