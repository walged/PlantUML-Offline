import { create } from "zustand";

/**
 * Cross-component UI state for panels/modals that more than one component needs
 * to toggle (AI panel, Settings modal). Keeps Toolbar, Preview and AiPanel
 * decoupled instead of threading props through App.
 */
interface UiState {
  aiPanelOpen: boolean;
  settingsOpen: boolean;
  toggleAiPanel: () => void;
  setAiPanelOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  aiPanelOpen: false,
  settingsOpen: false,
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  setAiPanelOpen: (aiPanelOpen) => set({ aiPanelOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
