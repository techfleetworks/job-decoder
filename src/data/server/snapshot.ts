// The server-side reader for the built snapshot (the CQRS read side, ADR-0022). The
// decode route reads the title index, the shared item index, the duty-name index, and one
// function slice from here. It reads the static files the build step wrote to
// public/snapshot, so there is no database call on the request path.
//
// This lives under /server/ because it reads the filesystem and runs only in tier 2. The
// browser reaches the same snapshot by fetching the CDN files, not through this module.
// Each file is read once per process and cached.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DutyDetail, FunctionSlice, SkillInfo, SnapshotItem, SnapshotTitles } from "@/domain/decode/types";

const DIR = join(process.cwd(), "public", "snapshot");

// Thrown when the snapshot has not been built yet. The route checks for this type (not a
// message substring) to return a retryable 503, so rewording the message cannot silently
// turn the "data not ready" case into a generic 500.
export class SnapshotMissingError extends Error {
  constructor(rel: string) {
    super(`snapshot file missing: ${rel}. Build it first with: npm run build:snapshot:local`);
    this.name = "SnapshotMissingError";
  }
}

function readJson<T>(rel: string): T {
  const path = join(DIR, rel);
  if (!existsSync(path)) throw new SnapshotMissingError(rel);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

let titlesCache: SnapshotTitles | undefined;
export function loadTitles(): SnapshotTitles {
  return (titlesCache ??= readJson<SnapshotTitles>("titles.json"));
}

let itemsCache: SnapshotItem[] | undefined;
export function loadItems(): SnapshotItem[] {
  return (itemsCache ??= readJson<SnapshotItem[]>("items.json"));
}

let dutiesCache: DutyDetail[] | undefined;
export function loadDuties(): DutyDetail[] {
  return (dutiesCache ??= readJson<DutyDetail[]>("duties.json"));
}

let skillsCache: SkillInfo[] | undefined;
export function loadSkills(): SkillInfo[] {
  return (skillsCache ??= readJson<SkillInfo[]>("skills.json"));
}

let dutyNamesCache: Record<string, string> | undefined;
export function loadDutyNames(): Record<string, string> {
  if (!dutyNamesCache) {
    dutyNamesCache = Object.fromEntries(loadDuties().map((d) => [d.slug, d.name]));
  }
  return dutyNamesCache;
}

const sliceCache = new Map<string, FunctionSlice>();
export function loadSlice(fnSlug: string): FunctionSlice {
  const cached = sliceCache.get(fnSlug);
  if (cached) return cached;
  const slice = readJson<FunctionSlice>(`functions/${fnSlug}.json`);
  sliceCache.set(fnSlug, slice);
  return slice;
}
