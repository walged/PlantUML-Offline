import { useCallback, useRef, useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useTranslation } from "../../stores/settingsStore";
import {
  chatAboutDiagram,
  generateDiagram,
  improveDiagram,
  isAiConfigured,
  extractPlantUml,
  type ChatMessage,
} from "../../lib/ai/aiClient";
import "./AiPanel.css";

interface AiPanelProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

type Mode = "chat" | "generate";

export function AiPanel({ onClose, onOpenSettings }: AiPanelProps) {
  const t = useTranslation();
  const { getActiveFile, setContent } = useEditorStore();
  const [mode, setMode] = useState<Mode>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const configured = isAiConfigured();

  const applyToEditor = useCallback(
    (code: string, expectFileId?: string) => {
      // Guard against stale writes: if the request started for a specific file,
      // only apply when that file is still the active one.
      if (expectFileId) {
        const current = useEditorStore.getState().getActiveFile();
        if (current?.id !== expectFileId) return;
      }
      const clean = extractPlantUml(code);
      if (clean) setContent(clean);
    },
    [setContent],
  );

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");

    if (mode === "generate") {
      setBusy(true);
      try {
        const code = await generateDiagram(text);
        applyToEditor(code);
        setMessages((m) => [
          ...m,
          { role: "user", content: text },
          { role: "assistant", content: code },
        ]);
        scrollToBottom();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
      return;
    }

    // Chat mode (contextual).
    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    scrollToBottom();
    setBusy(true);
    try {
      const code = getActiveFile()?.content ?? "";
      const reply = await chatAboutDiagram(nextHistory, code);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      scrollToBottom();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [input, busy, mode, messages, getActiveFile, applyToEditor]);

  const handleImprove = useCallback(async () => {
    if (busy) return;
    const file = getActiveFile();
    const code = file?.content;
    if (!code) return;
    setError(null);
    setBusy(true);
    try {
      const improved = await improveDiagram(code);
      applyToEditor(improved, file.id);
      setMessages((m) => [...m, { role: "assistant", content: improved }]);
      scrollToBottom();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [busy, getActiveFile, applyToEditor]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const looksLikeCode = (s: string) => /@start\w+/.test(s);

  return (
    <div className="ai-panel" role="complementary" aria-label={t.aiAssistant}>
      <div className="ai-panel-header">
        <span className="ai-panel-title">✨ {t.aiAssistant}</span>
        <button className="ai-panel-close" onClick={onClose} aria-label={t.dismiss || "Close"}>
          ×
        </button>
      </div>

      {!configured ? (
        <div className="ai-panel-empty">
          <p>{t.aiNoKey}</p>
          <button className="ai-btn primary" onClick={onOpenSettings}>
            {t.aiSettings}
          </button>
        </div>
      ) : (
        <>
          <div className="ai-mode-tabs">
            <button className={mode === "chat" ? "active" : ""} onClick={() => setMode("chat")}>
              {t.aiAssistant}
            </button>
            <button
              className={mode === "generate" ? "active" : ""}
              onClick={() => setMode("generate")}
            >
              {t.aiGenerateFromText}
            </button>
          </div>

          <div className="ai-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <p className="ai-hint">
                {mode === "generate" ? t.aiGeneratePlaceholder : t.aiChatPlaceholder}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>
                {looksLikeCode(m.content) ? (
                  <>
                    <pre className="ai-code">{m.content}</pre>
                    <button className="ai-btn small" onClick={() => applyToEditor(m.content)}>
                      {t.aiApply}
                    </button>
                  </>
                ) : (
                  <span>{m.content}</span>
                )}
              </div>
            ))}
            {busy && <div className="ai-msg assistant ai-thinking">{t.aiThinking}</div>}
          </div>

          {error && <div className="ai-error">{error}</div>}

          <div className="ai-actions">
            <button className="ai-btn small" onClick={handleImprove} disabled={busy}>
              {t.aiImprove}
            </button>
            <button
              className="ai-btn small"
              onClick={() => setMessages([])}
              disabled={busy || messages.length === 0}
            >
              {t.aiClear}
            </button>
          </div>

          <div className="ai-input-row">
            <textarea
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "generate" ? t.aiGeneratePrompt : t.aiChatPlaceholder}
              rows={2}
              disabled={busy}
            />
            <button
              className="ai-btn primary"
              onClick={handleSend}
              disabled={busy || !input.trim()}
            >
              {busy ? t.aiThinking : mode === "generate" ? t.aiGenerate : t.aiSend}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
