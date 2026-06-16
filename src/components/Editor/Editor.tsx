import { useCallback, useEffect, useRef } from "react";
import MonacoEditor, { OnMount, Monaco } from "@monaco-editor/react";
import { useEditorStore } from "../../stores/editorStore";
import { useSettingsStore, useTranslation } from "../../stores/settingsStore";
import { registerPlantUMLLanguage } from "../../lib/plantuml/language";
import "./Editor.css";

export function Editor() {
  const { getActiveFile, setContent, setEditorInstance } = useEditorStore();
  const { theme, fontSize } = useSettingsStore();
  const t = useTranslation();
  // Editor/monaco instance types come from @monaco-editor/react's OnMount.
  type EditorInstance = Parameters<OnMount>[0];
  type TextModel = NonNullable<ReturnType<EditorInstance["getModel"]>>;
  type ViewState = ReturnType<EditorInstance["saveViewState"]>;

  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  // One text model + saved view state per file id. This gives every file its
  // own undo/redo history and cursor/scroll position, fixing cross-tab undo
  // corruption (UI audit #1).
  const modelsRef = useRef(new Map<string, TextModel>());
  const viewStatesRef = useRef(new Map<string, ViewState>());
  const currentFileIdRef = useRef<string | null>(null);

  const activeFile = getActiveFile();
  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";

  const getOrCreateModel = useCallback((id: string, content: string): TextModel => {
    const monaco = monacoRef.current!;
    let model = modelsRef.current.get(id);
    if (!model || model.isDisposed()) {
      model = monaco.editor.createModel(content, "plantuml");
      modelsRef.current.set(id, model);
    }
    return model;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      setEditorInstance(editor);
      registerPlantUMLLanguage(monaco);

      editor.updateOptions({
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

      // Attach the active file's model on mount.
      const file = useEditorStore.getState().getActiveFile();
      if (file) {
        const model = getOrCreateModel(file.id, file.content);
        editor.setModel(model);
        currentFileIdRef.current = file.id;
      }
    },
    [setEditorInstance, getOrCreateModel],
  );

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setContent(value);
      }
    },
    [setContent],
  );

  // Swap models when the active file changes, preserving per-file view state.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !monacoRef.current || !activeFile) return;

    if (currentFileIdRef.current !== activeFile.id) {
      // Save the outgoing file's view state.
      if (currentFileIdRef.current) {
        viewStatesRef.current.set(currentFileIdRef.current, editor.saveViewState());
      }
      const model = getOrCreateModel(activeFile.id, activeFile.content);
      editor.setModel(model);
      const saved = viewStatesRef.current.get(activeFile.id);
      if (saved) editor.restoreViewState(saved);
      editor.focus();
      currentFileIdRef.current = activeFile.id;
    }

    // Sync external content changes (e.g. template applied) into the model
    // without resetting undo unnecessarily.
    const model = modelsRef.current.get(activeFile.id);
    if (model && model.getValue() !== activeFile.content) {
      model.setValue(activeFile.content);
    }
  }, [activeFile?.id, activeFile?.content, getOrCreateModel]);

  // Dispose models for files that no longer exist (closed tabs).
  const files = useEditorStore((s) => s.files);
  useEffect(() => {
    const liveIds = new Set(files.map((f) => f.id));
    for (const [id, model] of modelsRef.current) {
      if (!liveIds.has(id)) {
        model.dispose();
        modelsRef.current.delete(id);
        viewStatesRef.current.delete(id);
      }
    }
  }, [files]);

  // Dispose all models on unmount.
  useEffect(() => {
    const models = modelsRef.current;
    return () => {
      for (const model of models.values()) model.dispose();
      models.clear();
    };
  }, []);

  if (!activeFile) {
    return (
      <div className="editor-container editor-empty">
        <p>{t.noFileOpen}</p>
        <p>{t.createOrOpen}</p>
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
  const t = useTranslation();

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
            aria-label={`${t.dismiss || "Close"} ${file.name}`}
            title={t.dismiss || "Close"}
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
