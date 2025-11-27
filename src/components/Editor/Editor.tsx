import { useCallback, useEffect, useRef } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import { useEditorStore } from "../../stores/editorStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { registerPlantUMLLanguage } from "../../lib/plantuml/language";
import "./Editor.css";

export function Editor() {
  const { getActiveFile, setContent, setEditorInstance } = useEditorStore();
  const { theme, fontSize } = useSettingsStore();
  const editorRef = useRef<any>(null);
  const activeFile = getActiveFile();
  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setEditorInstance(editor);
    registerPlantUMLLanguage(monaco);

    // Set editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      lineNumbers: "on",
      renderLineHighlight: "line",
      scrollBeyondLastLine: false,
      wordWrap: "on",
      tabSize: 2,
      automaticLayout: true,
      padding: { top: 10 },
    });
  }, [setEditorInstance]);

  const handleContentChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  }, [setContent]);

  // Update editor content when active file changes or content is updated externally
  useEffect(() => {
    if (editorRef.current && activeFile) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== activeFile.content) {
        // Preserve cursor position
        const position = editorRef.current.getPosition();
        model.setValue(activeFile.content);
        if (position) {
          editorRef.current.setPosition(position);
        }
      }
    }
  }, [activeFile?.id, activeFile?.content]);

  if (!activeFile) {
    return (
      <div className="editor-container editor-empty">
        <p>No file open</p>
        <p>Create a new file or open an existing one</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-tabs">
        <EditorTabs />
      </div>
      <div className="editor-content">
        <MonacoEditor
          defaultLanguage="plantuml"
          defaultValue={activeFile.content}
          theme={monacoTheme}
          onMount={handleEditorMount}
          onChange={handleContentChange}
          options={{
            fontSize,
            minimap: { enabled: false },
          }}
        />
      </div>
    </div>
  );
}

function EditorTabs() {
  const { files, activeFileId, openFile, closeFile } = useEditorStore();

  return (
    <div className="tabs-container">
      {files.map((file) => (
        <div
          key={file.id}
          className={`tab ${file.id === activeFileId ? "active" : ""}`}
          onClick={() => openFile(file.id)}
        >
          <span className="tab-name">
            {file.isModified && <span className="modified-dot">●</span>}
            {file.name}
          </span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              closeFile(file.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
