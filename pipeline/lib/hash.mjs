// A stable content hash over the framework records, so a release is pinned to exact
// bytes (ADR-0008 rule 7). The hash is order-independent: records are sorted by
// (entity, slug) and object keys are sorted recursively before hashing, so the same
// data always produces the same hash regardless of file or key order. A changed field
// changes the hash; a reordered file does not.

import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonical(value[key]);
    return out;
  }
  return value;
}

// entities: { entity: [records] }. Returns a short 16-char hex hash (matching the
// combined-hash style recorded in ADR-0008).
export function contentHash(entities) {
  const sorted = {};
  for (const entity of Object.keys(entities).sort()) {
    sorted[entity] = [...entities[entity]]
      .sort((a, b) => String(a.slug).localeCompare(String(b.slug)))
      .map(canonical);
  }
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex").slice(0, 16);
}
