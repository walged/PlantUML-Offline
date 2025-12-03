import { useEffect, useRef, useState, useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useServerStore } from "../../stores/serverStore";
import { useTranslation } from "../../stores/settingsStore";
import { renderPlantUML } from "../../lib/plantuml/renderer";
import { restartEmbeddedServer } from "../../lib/plantuml/embeddedServer";
import "./Preview.css";

export function Preview() {
  const { getActiveFile, previewSvg, setPreviewSvg, isRendering, setIsRendering, error, setError } = useEditorStore();
  const { setEmbeddedServerStatus, checkServerStatusWithRetry } = useServerStore();
  const t = useTranslation();
  const activeFile = getActiveFile();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isRestarting, setIsRestarting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Restart server handler
  const handleRestartServer = useCallback(async () => {
    setIsRestarting(true);
    setError(null);
    try {
      const status = await restartEmbeddedServer();
      setEmbeddedServerStatus(status.running, status.error);
      if (status.running) {
        // Wait for server to be ready then re-render
        setTimeout(async () => {
          await checkServerStatusWithRetry(5, 1000);
          // Trigger re-render
          if (activeFile?.content) {
            setIsRendering(true);
            try {
              const svg = await renderPlantUML(activeFile.content);
              setPreviewSvg(svg);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Rendering failed");
            } finally {
              setIsRendering(false);
            }
          }
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart server");
    } finally {
      setIsRestarting(false);
    }
  }, [activeFile?.content, setError, setEmbeddedServerStatus, checkServerStatusWithRetry, setIsRendering, setPreviewSvg]);

  // Callback ref for container
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node);
  }, []);

  // Debounced render
  const debouncedRender = useCallback(async (content: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsRendering(true);
      setError(null);

      try {
        const svg = await renderPlantUML(content);
        setPreviewSvg(svg);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Rendering failed");
      } finally {
        setIsRendering(false);
      }
    }, 500);
  }, [setIsRendering, setError, setPreviewSvg]);

  // Re-render when content changes
  useEffect(() => {
    if (activeFile?.content) {
      debouncedRender(activeFile.content);
    }
  }, [activeFile?.content, debouncedRender]);

  // Zoom handlers - use native event listener to set passive: false
  useEffect(() => {
    if (!containerEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(Math.max(0.1, prev + delta), 5));
    };

    containerEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => containerEl.removeEventListener("wheel", handleWheel);
  }, [containerEl]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
          <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))} title={t.zoomOut}>
            −
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))} title={t.zoomIn}>
            +
          </button>
          <button onClick={resetView} title={t.resetZoom}>
            ⟲
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`preview-content ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
            {(error.includes("internet") || error.includes("connection") || error.includes("server")) && (
              <button
                className="restart-server-btn"
                onClick={handleRestartServer}
                disabled={isRestarting}
              >
                {isRestarting ? t.restarting || "Restarting..." : t.restartServer || "Restart Server"}
              </button>
            )}
          </div>
        )}

        {!isRendering && !error && previewSvg && (
          <div
            className="preview-svg"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            }}
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
        )}

        {!isRendering && !error && !previewSvg && (
          <div className="preview-placeholder">
            <p>{t.writeCode}</p>
          </div>
        )}
      </div>
    </div>
  );
}
