import plantumlEncoder from "plantuml-encoder";

const DEFAULT_SERVER = "https://www.plantuml.com/plantuml";
const CACHE_KEY = "plantuml-render-cache";
const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  code: string;
  svg: string;
  timestamp: number;
}

// Load cache from localStorage
function loadCache(): Map<string, CacheEntry> {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (data) {
      const entries = JSON.parse(data) as CacheEntry[];
      return new Map(entries.map((e) => [e.code, e]));
    }
  } catch {
    // Ignore cache errors
  }
  return new Map();
}

// Save cache to localStorage
function saveCache(cache: Map<string, CacheEntry>) {
  try {
    const entries = Array.from(cache.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_CACHE_SIZE);
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore cache errors
  }
}

const renderCache = loadCache();

export function getServerUrl(): string {
  try {
    const settings = localStorage.getItem("plantuml-editor-settings");
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

export async function renderPlantUML(code: string): Promise<string> {
  if (!code.trim()) {
    return "";
  }

  // Check cache first
  const cached = renderCache.get(code);
  if (cached) {
    return cached.svg;
  }

  try {
    const encoded = plantumlEncoder.encode(code);
    const server = getServerUrl();
    const url = `${server}/svg/${encoded}`;

    const response = await fetch(url, {
      // Short timeout for faster offline detection
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // PlantUML returns error diagrams with 400 status, check if it's an SVG
      if (response.status === 400 && errorText.includes("<svg")) {
        // It's an error diagram, show it to the user
        return errorText;
      }
      throw new Error(`PlantUML server error: ${response.status}`);
    }

    const svg = await response.text();

    // Cache the result
    renderCache.set(code, {
      code,
      svg,
      timestamp: Date.now(),
    });
    saveCache(renderCache);

    return svg;
  } catch (error) {
    // If offline, try to find a similar cached result
    if (error instanceof Error && (error.name === "TimeoutError" || error.message.includes("fetch"))) {
      // Return cached version if available (even if code slightly different)
      const cached = renderCache.get(code);
      if (cached) {
        return cached.svg;
      }

      throw new Error("No internet connection and no cached version available");
    }

    console.error("PlantUML rendering error:", error);
    throw error;
  }
}

export function getPlantUMLImageUrl(code: string, format: "svg" | "png" = "svg"): string {
  const encoded = plantumlEncoder.encode(code);
  const server = getServerUrl();
  return `${server}/${format}/${encoded}`;
}

// Clear render cache
export function clearRenderCache() {
  renderCache.clear();
  localStorage.removeItem(CACHE_KEY);
}

// Get cache size
export function getCacheSize(): number {
  return renderCache.size;
}
