// GitHub API response types
interface GitHubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  body: string;
  assets: {
    name: string;
    browser_download_url: string;
  }[];
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl?: string;
}

// Current app version - should match Cargo.toml and package.json
export const APP_VERSION = "0.1.3";

const GITHUB_REPO = "walged/PlantUML-Offline";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Compare two semantic version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix if present
  const normalize = (v: string) => v.replace(/^v/, "");

  const parts1 = normalize(v1).split(".").map(Number);
  const parts2 = normalize(v2).split(".").map(Number);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * Check for updates from GitHub releases
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        // User-Agent required by GitHub API
        "User-Agent": "PlantUML-Offline-App",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const release: GitHubRelease = await response.json();
    const latestVersion = release.tag_name;

    // Find Windows installer in assets
    const windowsAsset = release.assets.find(
      (asset) => asset.name.endsWith(".exe") || asset.name.endsWith(".msi")
    );

    const isNewer = compareVersions(latestVersion, APP_VERSION) > 0;

    return {
      available: isNewer,
      currentVersion: APP_VERSION,
      latestVersion: latestVersion.replace(/^v/, ""),
      releaseUrl: release.html_url,
      releaseName: release.name,
      releaseNotes: release.body,
      publishedAt: release.published_at,
      downloadUrl: windowsAsset?.browser_download_url,
    };
  } catch (error) {
    console.error("Failed to check for updates:", error);
    throw error;
  }
}
