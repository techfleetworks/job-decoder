// The single owner of sessionStorage (ADR-0011). State is session-only: the current scan
// lives for the life of the browser tab and is never saved to the device, and there is no
// history. Every access is guarded, so a blocked or private-mode store degrades to
// in-memory state instead of throwing. This is the only file the architecture gate allows
// to touch sessionStorage.

const KEY = "jobdecoder:v1:scan";

// In-memory fallback for when sessionStorage is unavailable (private mode, quota, blocked).
// It keeps the current scan alive for the life of the tab so the app still works; it is
// never persisted to the device, which is the intended session-only behavior (ADR-0011).
// sessionStorage stays canonical when it works; this holds the scan only when it does not.
let memoryScan: string | null = null;

export function saveScan(scan: unknown): void {
  const raw = JSON.stringify(scan);
  try {
    sessionStorage.setItem(KEY, raw);
    memoryScan = null; // persisted: the store is canonical, so drop any stale memory copy
  } catch {
    memoryScan = raw; // recover: storage blocked or full, so hold the scan in memory
  }
}

export function loadScan<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(KEY) ?? memoryScan;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Store unreadable: recover from the in-memory copy instead of losing the scan.
    return memoryScan ? (JSON.parse(memoryScan) as T) : null;
  }
}

export function clearScan(): void {
  try {
    sessionStorage.removeItem(KEY);
    memoryScan = null;
  } catch {
    memoryScan = null; // recover: store unreachable, so at least drop the in-memory copy
  }
}
