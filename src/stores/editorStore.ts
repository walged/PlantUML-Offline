import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_CONTENT = `@startuml
' Пример Class Diagram
skinparam classAttributeIconSize 0
skinparam style strictuml

class User {
  -id: int
  -username: string
  -email: string
  -password: string
  +register(): void
  +login(): bool
  +logout(): void
}

class Order {
  -id: int
  -date: DateTime
  -status: OrderStatus
  -total: decimal
  +create(): void
  +cancel(): void
  +calculateTotal(): decimal
}

class Product {
  -id: int
  -name: string
  -price: decimal
  -stock: int
  +updateStock(qty: int): void
}

class OrderItem {
  -quantity: int
  -price: decimal
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

User "1" --> "*" Order : places
Order "1" --> "*" OrderItem : contains
OrderItem "*" --> "1" Product : references
Order --> OrderStatus

@enduml`;

interface DiagramFile {
  id: string;
  name: string;
  content: string;
  isModified: boolean;
}

interface EditorState {
  files: DiagramFile[];
  activeFileId: string | null;
  previewSvg: string;
  isRendering: boolean;
  error: string | null;
  sidebarVisible: boolean;
  editorInstance: any | null;

  // Actions
  initializeStore: () => void;
  setContent: (content: string) => void;
  getActiveFile: () => DiagramFile | undefined;
  setPreviewSvg: (svg: string) => void;
  setIsRendering: (isRendering: boolean) => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  createNewFile: (name?: string) => void;
  openFile: (id: string) => void;
  closeFile: (id: string) => void;
  renameFile: (id: string, name: string) => void;
  setEditorInstance: (editor: any) => void;
  undo: () => void;
  redo: () => void;
  markFileSaved: (id: string) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      previewSvg: "",
      isRendering: false,
      error: null,
      sidebarVisible: true,
      editorInstance: null,

      initializeStore: () => {
        // If files already loaded from persist, just ensure we have at least one
        const { files } = get();
        if (files.length > 0) {
          // Make sure activeFileId is set
          const { activeFileId } = get();
          if (!activeFileId || !files.find(f => f.id === activeFileId)) {
            set({ activeFileId: files[0].id });
          }
          return;
        }

        // No files - create default
        const initialFile: DiagramFile = {
          id: crypto.randomUUID(),
          name: "diagram.puml",
          content: DEFAULT_CONTENT,
          isModified: false,
        };
        set({ files: [initialFile], activeFileId: initialFile.id });
      },

  setContent: (content: string) => {
    const { activeFileId, files } = get();
    if (!activeFileId) return;

    set({
      files: files.map((f) =>
        f.id === activeFileId ? { ...f, content, isModified: true } : f
      ),
    });
  },

  getActiveFile: () => {
    const { files, activeFileId } = get();
    return files.find((f) => f.id === activeFileId);
  },

  setPreviewSvg: (svg: string) => set({ previewSvg: svg }),
  setIsRendering: (isRendering: boolean) => set({ isRendering }),
  setError: (error: string | null) => set({ error }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  createNewFile: (name?: string) => {
    const newFile: DiagramFile = {
      id: crypto.randomUUID(),
      name: name || `diagram-${Date.now()}.puml`,
      content: "@startuml\n\n@enduml",
      isModified: false,
    };
    set((state) => ({
      files: [...state.files, newFile],
      activeFileId: newFile.id,
    }));
  },

  openFile: (id: string) => set({ activeFileId: id }),

  closeFile: (id: string) => {
    const { files, activeFileId } = get();
    const newFiles = files.filter((f) => f.id !== id);
    let newActiveId = activeFileId;

    if (activeFileId === id) {
      const idx = files.findIndex((f) => f.id === id);
      newActiveId = newFiles[idx]?.id || newFiles[idx - 1]?.id || null;
    }

    set({ files: newFiles, activeFileId: newActiveId });
  },

  renameFile: (id: string, name: string) => {
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
  },

  setEditorInstance: (editor: any) => set({ editorInstance: editor }),

  undo: () => {
    const { editorInstance } = get();
    if (editorInstance) {
      editorInstance.trigger("keyboard", "undo", null);
    }
  },

  redo: () => {
    const { editorInstance } = get();
    if (editorInstance) {
      editorInstance.trigger("keyboard", "redo", null);
    }
  },

  markFileSaved: (id: string) => {
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, isModified: false } : f)),
    }));
  },
}),
    {
      name: "plantuml-editor-storage",
      partialize: (state) => ({
        files: state.files,
        activeFileId: state.activeFileId,
        sidebarVisible: state.sidebarVisible,
      }),
    }
  )
);
