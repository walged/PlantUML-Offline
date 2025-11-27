import { useEffect, useRef, useState, useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { renderPlantUML } from "../../lib/plantuml/renderer";
import "./Preview.css";

export function Preview() {
  const { getActiveFile, previewSvg, setPreviewSvg, isRendering, setIsRendering, error, setError } = useEditorStore();
  const activeFile = getActiveFile();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const debounceRef = useRef<NodeJS.Timeout>();

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
        <p>No preview available</p>
      </div>
    );
  }

  return (
    <div className="preview-container">
      <div className="preview-header">
        <span className="preview-title">Preview</span>
        <div className="preview-controls">
          <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))} title="Zoom Out">
            −
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))} title="Zoom In">
            +
          </button>
          <button onClick={resetView} title="Reset View">
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
            <span>Rendering...</span>
          </div>
        )}

        {error && (
          <div className="preview-error">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
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
            <p>Write PlantUML code to see the preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
