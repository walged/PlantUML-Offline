import { useState } from "react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import {
  AI_PROVIDERS,
  useSettingsStore,
  useTranslation,
  type AiProvider,
} from "../../stores/settingsStore";

/** AI provider/key/model configuration shown inside the Settings modal. */
export function AiSettings() {
  const t = useTranslation();
  const {
    aiProvider,
    aiApiKey,
    aiModel,
    aiCustomBaseUrl,
    setAiProvider,
    setAiApiKey,
    setAiModel,
    setAiCustomBaseUrl,
  } = useSettingsStore();
  const [showKey, setShowKey] = useState(false);

  const preset = AI_PROVIDERS.find((p) => p.id === aiProvider);

  const handleProviderChange = (id: AiProvider) => {
    setAiProvider(id);
    const next = AI_PROVIDERS.find((p) => p.id === id);
    // Switch to the provider's default model unless using custom.
    if (next && id !== "custom" && next.defaultModel) {
      setAiModel(next.defaultModel);
    }
  };

  return (
    <div className="setting-group ai-settings">
      <h3 className="settings-section-title">✨ {t.aiSettings}</h3>

      <div className="setting-group">
        <label>{t.aiProvider}</label>
        <select
          className="setting-select"
          value={aiProvider}
          onChange={(e) => handleProviderChange(e.target.value as AiProvider)}
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {aiProvider === "custom" && (
        <div className="setting-group">
          <label>{t.aiCustomBaseUrl}</label>
          <input
            type="text"
            value={aiCustomBaseUrl}
            onChange={(e) => setAiCustomBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
          />
          <span className="setting-hint">{t.aiCustomBaseUrlHint}</span>
        </div>
      )}

      <div className="setting-group">
        <label>{t.aiApiKey}</label>
        <div className="setting-path">
          <input
            type={showKey ? "text" : "password"}
            value={aiApiKey}
            onChange={(e) => setAiApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="setting-path-btn" onClick={() => setShowKey((v) => !v)}>
            {showKey ? "🙈" : "👁"}
          </button>
        </div>
        <span className="setting-hint">{t.aiKeyStoredLocally}</span>
        {preset?.keyUrl && (
          <button type="button" className="link-btn" onClick={() => openUrl(preset.keyUrl!)}>
            {t.aiGetKey} ↗
          </button>
        )}
      </div>

      <div className="setting-group">
        <label>{t.aiModel}</label>
        {preset && preset.models.length > 0 ? (
          <input
            type="text"
            list="ai-model-list"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            placeholder={preset.defaultModel}
          />
        ) : (
          <input
            type="text"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            placeholder="model-id"
          />
        )}
        <datalist id="ai-model-list">
          {preset?.models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
