/**
 * The single owner of localStorage (ADR-0002, decisions.md). Every read and write
 * of user data OR the framework cache goes through here; no other module touches
 * localStorage. All access is guarded: localStorage throws in private mode, when
 * disabled, or when full, so each operation degrades to a safe result instead of
 * crashing the app. Keys are namespaced and versioned.
 */

const PREFIX = "jobdecoder:v1:";

/** Resolve the backing store, or null if it is unavailable or unusable. */
function getStore(): Storage | null {
  try {
    const store = globalThis.localStorage;
    if (!store) return null;
    // Probe: some browsers expose localStorage but throw on use (private mode).
    const probe = `${PREFIX}__probe__`;
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null; // report: caller treats absence as empty, app keeps working
  }
}

/** Read and JSON-parse a value, returning `fallback` on any failure. */
export function readJson<T>(key: string, fallback: T): T {
  const store = getStore();
  if (!store) return fallback;
  try {
    const raw = store.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback; // corrupt or unreadable value: fall back, do not throw
  }
}

/** JSON-serialize and write a value. Returns whether the write succeeded. */
export function writeJson<T>(key: string, value: T): boolean {
  const store = getStore();
  if (!store) return false;
  try {
    store.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota exceeded or blocked: report failure to the caller
  }
}

/** Remove a single key. */
export function remove(key: string): void {
  const store = getStore();
  if (!store) return;
  try {
    store.removeItem(PREFIX + key);
  } catch {
    // nothing to recover; a failed remove leaves the key, which readJson tolerates
  }
}

/** Remove every key this app owns. Backs "clear all my data" (FR-6.6). */
export function clearAll(): void {
  const store = getStore();
  if (!store) return;
  try {
    const owned: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key && key.startsWith(PREFIX)) owned.push(key);
    }
    for (const key of owned) store.removeItem(key);
  } catch {
    // partial clear is still progress; nothing else to do safely
  }
}

/** Whether a usable localStorage is available in this environment. */
export function isAvailable(): boolean {
  return getStore() !== null;
}

/** Typed facade used across the app. */
export const userStore = {
  get: readJson,
  set: writeJson,
  remove,
  clearAll,
  isAvailable,
} as const;
