// The single owner of sessionStorage (ADR-0011). State is session-only: the current scan
// lives for the life of the browser tab and is never saved to the device, and there is no
// history. Every access is guarded, so a blocked or private-mode store degrades to
// in-memory state instead of throwing. This is the only file the architecture gate allows
// to touch sessionStorage.

const KEY = "jobdecoder:v1:scan";

export function saveScan(scan: unknown): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(scan));
  } catch {
    // Storage blocked or full (private mode, quota): recover by keeping the scan in
    // memory only. The app still works for this tab; nothing is persisted, which is the
    // intended session-only behavior anyway.
  }
}

export function loadScan<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // absent or unreadable store reads as "no scan yet"
  }
}

export function clearScan(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to recover: if the store cannot be cleared, it is already unreachable.
  }
}
