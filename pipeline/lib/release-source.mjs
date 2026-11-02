// Where a framework release comes from. The snapshot build consumes a release through
// one of these sources, so the same derivation runs over either:
//
//   localRelease()     reads the pinned framework files committed in the repo. This is
//                      the input the sync step loads into Supabase, and the source CI
//                      and tests use so the whole pipeline runs without a database.
//   supabaseRelease()  reads the one published release from Supabase (tier 3). This is
//                      the source the production build uses (ADR-0022).
//
// Both return the same shape:
//   { upstreamSha, version, contentHash, entities: { "job-function": [...], ... } }

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ENTITIES, PINNED_SHA, MANIFEST_VERSION } from "./manifest.mjs";
import { contentHash } from "./hash.mjs";
import { serviceClient } from "./supabase.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, "..", "..", "eval", "framework-data");

// dataDir defaults to the pinned repo data; tests pass a fixture directory so the whole
// pipeline, integrity gate included, can be exercised over planted data.
export function localRelease(dataDir = DATA_DIR) {
  const entities = {};
  for (const { entity, file } of ENTITIES) {
    entities[entity] = JSON.parse(readFileSync(join(dataDir, file), "utf8"));
  }
  return {
    upstreamSha: PINNED_SHA,
    version: MANIFEST_VERSION,
    contentHash: contentHash(entities),
    entities,
  };
}

export async function supabaseRelease() {
  const sb = await serviceClient();

  const { data: rel, error: relErr } = await sb
    .from("spf_release")
    .select("id, upstream_sha, content_hash, version, record_count")
    .eq("status", "published")
    .maybeSingle();
  if (relErr) throw new Error(`reading the published release failed: ${relErr.message}`);
  if (!rel) throw new Error("no published framework release found in Supabase; run the sync first");

  const { data: rows, error: recErr } = await sb
    .from("spf_record")
    .select("entity, slug, name, data")
    .eq("release_id", rel.id);
  if (recErr) throw new Error(`reading framework records failed: ${recErr.message}`);
  if (!rows || rows.length === 0) throw new Error("the published release has no records");

  // Fail closed if what we read back does not match what was synced. A short read (for
  // example a row cap) must break the build, not ship a thin snapshot.
  if (rows.length !== rel.record_count) {
    throw new Error(
      `record count mismatch: the release says ${rel.record_count} records, read ${rows.length}`,
    );
  }

  const entities = {};
  for (const { entity } of ENTITIES) entities[entity] = [];
  for (const row of rows) {
    (entities[row.entity] ??= []).push(row.data);
  }

  // Re-verify the pin: the content hash is the provenance stamp every result records
  // (ADR-0008 rule 7). Recompute it over the rows actually read and fail closed if it
  // does not match what the release claims, so a record changed without a re-sync cannot
  // ship under a stale, lying hash.
  const computed = contentHash(entities);
  if (computed !== rel.content_hash) {
    throw new Error(
      `content hash mismatch: the records read hash to ${computed}, but the release says ${rel.content_hash}; the data was changed without a re-sync`,
    );
  }

  return {
    upstreamSha: rel.upstream_sha,
    version: rel.version,
    contentHash: rel.content_hash,
    entities,
  };
}
