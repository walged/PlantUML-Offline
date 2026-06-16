import plantumlEncoder from "plantuml-encoder";
import { safeGetItem } from "../safeStorage";

const DEFAULT_SERVER = "https://www.plantuml.com/plantuml";
const MAX_CACHE_SIZE = 50;

/**
 * Error kind for render failures, so the UI can decide what to show (e.g. the
 * "Restart server" button only for network/server problems) without fragile
 * substring matching on localized messages. See issue #2 / UI audit.
 */
export type RenderErrorKind = "network" | "server" | "unknown";

export class RenderError extends Error {
  kind: RenderErrorKind;
  status?: number;

  constructor(message: string, kind: RenderErrorKind, status?: number) {
    super(message);
    this.name = "RenderError";
    this.kind = kind;
    this.status = status;
  }
}

interface CacheEntry {
  svg: string;
}

/**
 * In-memory LRU render cache. Previously this was persisted to localStorage,
 * which competed with saved diagrams for the ~5 MB quota and contributed to the
 * quota-overflow black screen (issue #1). SVGs are cheap to re-fetch from the
 * local server, so keeping the cache in memory only is the right trade-off.
 */
const renderCache = new Map<string, CacheEntry>();

function cacheGet(code: string): string | undefined {
  const entry = renderCache.get(code);
  if (entry) {
    // Refresh LRU order.
    renderCache.delete(code);
    renderCache.set(code, entry);
    return entry.svg;
  }
  return undefined;
}

function cacheSet(code: string, svg: string) {
  renderCache.set(code, { svg });
  if (renderCache.size > MAX_CACHE_SIZE) {
    // Evict the oldest entry (first key in insertion order).
    const oldest = renderCache.keys().next().value;
    if (oldest !== undefined) {
      renderCache.delete(oldest);
    }
  }
}

export function getServerUrl(): string {
  try {
    const settings = safeGetItem("plantuml-editor-settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.state?.plantUmlServer) {
        return parsed.state.plantUmlServer;
      }
    }
  } catch {
    // Ignore
  }
  return DEFAULT_SERVER;
}

// Check if a server is reachable
export async function checkServerConnection(serverUrl: string): Promise<boolean> {
  try {
    const testCode = "@startuml\nA -> B\n@enduml";
    const encoded = plantumlEncoder.encode(testCode);
    const response = await fetch(`${serverUrl}/svg/${encoded}`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Renders PlantUML code to SVG.
 *
 * @param code   the diagram source
 * @param signal optional AbortSignal so callers can cancel a stale in-flight
 *               render when the user keeps typing.
 */
export async function renderPlantUML(code: string, signal?: AbortSignal): Promise<string> {
  if (!code.trim()) {
    return "";
  }

  const cached = cacheGet(code);
  if (cached) {
    return cached;
  }

  const encoded = plantumlEncoder.encode(code);
  const server = getServerUrl();
  const url = `${server}/svg/${encoded}`;

  // Combine the caller's signal with our own timeout.
  const timeout = AbortSignal.timeout(15000);
  const combined = signal ? anySignal([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(url, { signal: combined });
  } catch (error) {
    // Caller-initiated cancellation: re-throw as-is so callers can ignore it.
    if (signal?.aborted) {
      throw error;
    }
    // Otherwise this is a network/timeout failure. Fall back to cache if any.
    const fallback = cacheGet(code);
    if (fallback) {
      return fallback;
    }
    throw new RenderError(
      "No connection to the PlantUML server and no cached version available",
      "network",
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    // PlantUML returns error *diagrams* with a 400 status as SVG — show them.
    if (response.status === 400 && errorText.includes("<svg")) {
      return errorText;
    }
    // Any other non-OK status is a server-side problem (issue #2: ELK failures
    // surface here). Include the body so the UI can show the real cause instead
    // of a meaningless masked code.
    const detail = extractServerError(errorText) || `HTTP ${response.status}`;
    throw new RenderError(`PlantUML server error: ${detail}`, "server", response.status);
  }

  const svg = await response.text();
  cacheSet(code, svg);
  return svg;
}

/** Pull a human-readable message out of a PlantUML server error response. */
function extractServerError(body: string): string | null {
  if (!body) return null;
  // PlantUML error pages and picoweb stack traces are plain text/HTML.
  const trimmed = body.trim();
  if (!trimmed) return null;
  // Keep it short for display.
  const firstLine = trimmed
    .split("\n")[0]
    .replace(/<[^>]+>/g, "")
    .trim();
  return firstLine ? firstLine.slice(0, 200) : null;
}

/** Polyfill for AbortSignal.any (not in all webviews yet). */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof (AbortSignal as any).any === "function") {
    return (AbortSignal as any).any(signals);
  }
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

export function getPlantUMLImageUrl(code: string, format: "svg" | "png" = "svg"): string {
  const encoded = plantumlEncoder.encode(code);
  const server = getServerUrl();
  return `${server}/${format}/${encoded}`;
}

// Clear render cache
export function clearRenderCache() {
  renderCache.clear();
}

// Get cache size
export function getCacheSize(): number {
  return renderCache.size;
}
