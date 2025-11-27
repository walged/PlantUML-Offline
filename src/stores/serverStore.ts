import { create } from "zustand";
import { checkServerConnection } from "../lib/plantuml/renderer";
import { useSettingsStore } from "./settingsStore";

type ServerStatus = "online" | "offline" | "checking" | "unknown";

// Embedded server configuration
export const EMBEDDED_SERVER_PORT = 18123;
export const EMBEDDED_SERVER_URL = `http://localhost:${EMBEDDED_SERVER_PORT}`;

interface ServerState {
  status: ServerStatus;
  lastCheck: number | null;
  showOfflineWarning: boolean;
  embeddedServerRunning: boolean;
  embeddedServerError: string | null;

  // Actions
  checkServerStatus: () => Promise<void>;
  checkServerStatusWithRetry: (maxRetries?: number, delayMs?: number) => Promise<void>;
  dismissWarning: () => void;
  setShowWarning: (show: boolean) => void;
  setEmbeddedServerStatus: (running: boolean, error?: string | null) => void;
}

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useServerStore = create<ServerState>((set, get) => ({
  status: "unknown",
  lastCheck: null,
  showOfflineWarning: false,
  embeddedServerRunning: false,
  embeddedServerError: null,

  checkServerStatus: async () => {
    set({ status: "checking" });

    try {
      // Get settings directly from store
      const settings = useSettingsStore.getState();
      const serverUrl = settings.useEmbeddedServer
        ? EMBEDDED_SERVER_URL
        : settings.plantUmlServer;

      console.log("Checking server:", serverUrl);

      const isOnline = await checkServerConnection(serverUrl);

      const wasOffline = get().status === "offline";
      const isNowOnline = isOnline;

      set({
        status: isOnline ? "online" : "offline",
        lastCheck: Date.now(),
        // Show warning only if server went offline (not on first check when status is unknown)
        showOfflineWarning: !isOnline && get().status !== "unknown",
      });

      // If was offline and now online, could notify user
      if (wasOffline && isNowOnline) {
        console.log("PlantUML server is back online");
      }
    } catch (error) {
      console.error("Server check failed:", error);
      set({
        status: "offline",
        lastCheck: Date.now(),
        showOfflineWarning: get().status !== "unknown",
      });
    }
  },

  // Retry server check with delay - useful for embedded server startup
  checkServerStatusWithRetry: async (maxRetries = 5, delayMs = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      await get().checkServerStatus();

      if (get().status === "online") {
        return; // Server is online, stop retrying
      }

      if (i < maxRetries - 1) {
        console.log(`Server not ready, retrying in ${delayMs}ms... (${i + 1}/${maxRetries})`);
        await wait(delayMs);
      }
    }

    // After all retries, if still offline, show warning
    if (get().status === "offline") {
      set({ showOfflineWarning: true });
    }
  },

  dismissWarning: () => set({ showOfflineWarning: false }),

  setShowWarning: (show) => set({ showOfflineWarning: show }),

  setEmbeddedServerStatus: (running, error = null) =>
    set({ embeddedServerRunning: running, embeddedServerError: error }),
}));
