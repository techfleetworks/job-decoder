/**
 * Shape validation for framework data. The data is untrusted external input
 * (ADR-0002, owasp-secure-coding): the loader validates every payload through
 * these guards before trusting it, and rejects anything malformed. Pure: no I/O.
 */
import type { FrameworkManifest, FrameworkRecord, ManifestEntity } from "./types";

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** A record must have a numeric id and a non-empty string slug. */
export function isFrameworkRecord(x: unknown): x is FrameworkRecord {
  return (
    isObject(x) &&
    typeof x.id === "number" &&
    typeof x.slug === "string" &&
    x.slug.length > 0
  );
}

/** A dataset payload must be an array of valid records. */
export function isRecordArray(x: unknown): x is FrameworkRecord[] {
  return Array.isArray(x) && x.every(isFrameworkRecord);
}

function isManifestEntity(x: unknown): x is ManifestEntity {
  return (
    isObject(x) &&
    typeof x.entity === "string" &&
    typeof x.file === "string" &&
    typeof x.primaryField === "string"
  );
}

/** A manifest must have a version string and a list of valid entity entries. */
export function isManifest(x: unknown): x is FrameworkManifest {
  return (
    isObject(x) &&
    typeof x.version === "string" &&
    Array.isArray(x.entities) &&
    x.entities.every(isManifestEntity)
  );
}
