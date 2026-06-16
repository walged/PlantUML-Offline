import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useServerStore } from "../../stores/serverStore";
import { useSettingsStore, useTranslation } from "../../stores/settingsStore";
import { renderPlantUML, RenderError } from "../../lib/plantuml/renderer";
import { restartEmbeddedServer } from "../../lib/plantuml/embeddedServer";
import { sanitizeSvg } from "../../lib/sanitizeSvg";
import { fixDiagram, isAiConfigured } from "../../lib/ai/aiClient";
import "./Preview.css";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export function Preview() {
  const {
    getActiveFile,
    previewSvg,
    setPreviewSvg,
    isRendering,
    setIsRendering,
    error,
    setError,
    setContent,
  } = useEditorStore();
  const { setEmbeddedServerStatus, checkServerStatusWithRetry } = useServerStore();
  const useEmbeddedServer = useSettingsStore((s) => s.useEmbeddedServer);
  const renderDelay = useSettingsStore((s) => s.renderDelay);
  const t = useTranslation();
  const activeFile = getActiveFile();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  // Whether the current error is recoverable by restarting the embedded server.
  const [canRestart, setCanRestart] = useState(false);
  const aiReady = isAiConfigured();

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
  // Live refs for pan so window-level listeners don't capture stale state.
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  positionRef.current = position;

  // Sanitize SVG once per value rather than on every render.
  const safeSvg = useMemo(() => sanitizeSvg(previewSvg), [previewSvg]);

  // --- Rendering -----------------------------------------------------------

  const runRender = useCallback(
    async (content: string) => {
      // Cancel any in-flight render so we don't waste work or race results.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsRendering(true);
      setError(null);
      setCanRestart(false);

      try {
        const svg = await renderPlantUML(content, controller.signal);
        if (!controller.signal.aborted) {
          setPreviewSvg(svg);
        }
      } catch (err) {
        if (controller.signal.aborted) return; // superseded by a newer render
        if (err instanceof RenderError) {
          setError(err.message);
          // Only offer restart for network/server failures, and only when the
          // embedded server is the one in use (UI audit #8).
          setCanRestart(useEmbeddedServer && (err.kind === "network" || err.kind === "server"));
        } else {
          setError(err instanceof Error ? err.message : "Rendering failed");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsRendering(false);
        }
      }
    },
    [setIsRendering, setError, setPreviewSvg, useEmbeddedServer],
  );

  // Debounced re-render when content changes.
  useEffect(() => {
    if (!activeFile?.content) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const content = activeFile.content;
    debounceRef.current = setTimeout(() => runRender(content), renderDelay || 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeFile?.content, renderDelay, runRender]);

  // Abort any pending render on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleRestartServer = useCallback(async () => {
    setIsRestarting(true);
    setError(null);
    try {
      const status = await restartEmbeddedServer();
      setEmbeddedServerStatus(status.running, status.error);
      if (status.running) {
        await checkServerStatusWithRetry(5, 1000);
        if (activeFile?.content) {
          await runRender(activeFile.content);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart server");
    } finally {
      setIsRestarting(false);
    }
  }, [
    activeFile?.content,
    setError,
    setEmbeddedServerStatus,
    checkServerStatusWithRetry,
    runRender,
  ]);

  // Feature 2: ask the AI to fix the current diagram given the render error.
  const handleFixWithAi = useCallback(async () => {
    const file = activeFile;
    const code = file?.content;
    if (!code || !error) return;
    setIsFixing(true);
    try {
      const fixed = await fixDiagram(code, error);
      // Guard against a stale write: only apply if the same file is still
      // active and its content hasn't changed since the request started.
      const current = useEditorStore.getState().getActiveFile();
      if (fixed && current?.id === file.id && current.content === code) {
        setContent(fixed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI fix failed");
    } finally {
      setIsFixing(false);
    }
  }, [activeFile, error, setContent, setError]);

  // --- Zoom (cursor-anchored) ---------------------------------------------

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node);
  }, []);

  useEffect(() => {
    if (!containerEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = containerEl.getBoundingClientRect();
      // Cursor position relative to the container center (the transform origin).
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;

      setZoom((prevZoom) => {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const next = Math.min(Math.max(MIN_ZOOM, prevZoom * factor), MAX_ZOOM);
        const ratio = next / prevZoom;
        // Keep the point under the cursor fixed while scaling.
        setPosition((prev) => ({
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        }));
        return next;
      });
    };

    containerEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => containerEl.removeEventListener("wheel", handleWheel);
  }, [containerEl]);

  // --- Pan (window-level so release outside the app still ends the drag) ---

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y,
      };
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };
    const onUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  if (!activeFile) {
    return (
      <div className="preview-container preview-empty">
        <p>{t.noPreview}</p>
      </div>
    );
  }

  return (
    <div className="preview-container">
      <div className="preview-header">
        <span className="preview-title">{t.preview}</span>
        <div className="preview-controls">
          <button
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))}
            title={t.zoomOut}
            aria-label={t.zoomOut}
          >
            −
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))}
            title={t.zoomIn}
            aria-label={t.zoomIn}
          >
            +
          </button>
          <button onClick={resetView} title={t.resetZoom} aria-label={t.resetZoom}>
            ⟲
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`preview-content ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
      >
        {isRendering && (
          <div className="preview-loading">
            <div className="spinner" />
            <span>{t.rendering}</span>
          </div>
        )}

        {error && (
          <div className="preview-error">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
            <div className="preview-error-actions">
              {canRestart && (
                <button
                  className="restart-server-btn"
                  onClick={handleRestartServer}
                  disabled={isRestarting}
                >
                  {isRestarting
                    ? t.restarting || "Restarting..."
                    : t.restartServer || "Restart Server"}
                </button>
              )}
              {aiReady && activeFile?.content && (
                <button
                  className="restart-server-btn ai-fix-btn"
                  onClick={handleFixWithAi}
                  disabled={isFixing}
                >
                  {isFixing ? t.aiFixing : `✨ ${t.aiFixError}`}
                </button>
              )}
            </div>
          </div>
        )}

        {!isRendering && !error && safeSvg && (
          <div
            className="preview-svg"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            }}
            dangerouslySetInnerHTML={{ __html: safeSvg }}
          />
        )}

        {!isRendering && !error && !safeSvg && (
          <div className="preview-placeholder">
            <p>{t.writeCode}</p>
          </div>
        )}
      </div>
    </div>
  );
}
