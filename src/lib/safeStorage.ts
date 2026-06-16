/**
 * Safe localStorage helpers that never throw.
 *
 * Background (issue #1, "black screen"): the app writes diagrams, an autosave
 * copy, and a render cache into localStorage. Large diagrams can exceed the
 * ~5 MB quota; an uncaught `QuotaExceededError` (or corrupted JSON on read)
 * during store hydration crashes React and leaves a blank window. These
 * wrappers degrade gracefully instead.
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Writes a value, returning false instead of throwing if the quota is
 * exceeded. On quota errors it first tries to free space by dropping the
 * render cache (the most disposable data) and retries once.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (isQuotaError(err)) {
      try {
        // The render cache is purely an optimization — drop it and retry.
        localStorage.removeItem("plantuml-render-cache");
        localStorage.setItem(key, value);
        return true;
      } catch {
        console.warn(`localStorage quota exceeded; could not save "${key}".`);
        return false;
      }
    }
    console.warn(`Failed to write "${key}" to localStorage:`, err);
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore — nothing else to do.
  }
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22)
  );
}

/**
 * A Storage-compatible adapter for zustand's `persist` middleware that uses the
 * safe helpers above, so a failed write or corrupted read can never crash the
 * store during hydration.
 */
export const safeJSONStorage = {
  getItem: (name: string): string | null => safeGetItem(name),
  setItem: (name: string, value: string): void => {
    safeSetItem(name, value);
  },
  removeItem: (name: string): void => safeRemoveItem(name),
};
