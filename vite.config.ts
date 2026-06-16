import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    // Bind explicitly to IPv4 so Tauri's dev-server check (127.0.0.1) connects;
    // the default "localhost" can resolve to IPv6-only on Windows and hang.
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
