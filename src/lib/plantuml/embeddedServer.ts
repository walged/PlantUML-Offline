import { invoke } from "@tauri-apps/api/core";

export interface ServerStatus {
  running: boolean;
  port: number;
  url: string;
  error: string | null;
}

export const EMBEDDED_SERVER_PORT = 18123;
export const EMBEDDED_SERVER_URL = `http://localhost:${EMBEDDED_SERVER_PORT}`;

/**
 * Start the embedded PlantUML server
 */
export async function startEmbeddedServer(): Promise<ServerStatus> {
  try {
    const status = await invoke<ServerStatus>("start_plantuml_server");
    console.log("Embedded server started:", status);
    return status;
  } catch (error) {
    console.error("Failed to start embedded server:", error);
    throw error;
  }
}

/**
 * Stop the embedded PlantUML server
 */
export async function stopEmbeddedServer(): Promise<void> {
  try {
    await invoke("stop_plantuml_server");
    console.log("Embedded server stopped");
  } catch (error) {
    console.error("Failed to stop embedded server:", error);
    throw error;
  }
}

/**
 * Get the current status of the embedded server
 */
export async function getEmbeddedServerStatus(): Promise<ServerStatus> {
  try {
    return await invoke<ServerStatus>("get_plantuml_server_status");
  } catch (error) {
    console.error("Failed to get server status:", error);
    return {
      running: false,
      port: EMBEDDED_SERVER_PORT,
      url: EMBEDDED_SERVER_URL,
      error: String(error),
    };
  }
}

/**
 * Restart the embedded PlantUML server
 */
export async function restartEmbeddedServer(): Promise<ServerStatus> {
  try {
    const status = await invoke<ServerStatus>("restart_plantuml_server");
    console.log("Embedded server restarted:", status);
    return status;
  } catch (error) {
    console.error("Failed to restart embedded server:", error);
    throw error;
  }
}
