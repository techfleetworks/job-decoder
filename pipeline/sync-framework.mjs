#!/usr/bin/env node
// Loads the pinned framework data into Supabase as a new published release (ADR-0022).
//
// What it does, in order:
//   1. Read the pinned framework files and compute the content hash.
//   2. If the already-published release has the same hash, stop: nothing changed.
//   3. Insert a draft release and all its records.
//   4. Archive the previously published release, then publish the new one.
//
// It is idempotent on content: running it twice with unchanged data makes no change.
// Every Supabase call checks its error and stops loudly; a half-written release is left
// as a draft, never published, so the published pointer only ever moves to a complete
// release. Framework data is untrusted external input, so each record's name is
// resolved and required before insert.
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Usage: node pipeline/sync-framework.mjs

import { serviceClient } from "./lib/supabase.mjs";
import { localRelease } from "./lib/release-source.mjs";
import { ENTITIES } from "./lib/manifest.mjs";
import { val } from "./lib/relations.mjs";

function recordRows(releaseId, entities) {
  const rows = [];
  for (const { entity, namePattern } of ENTITIES) {
    for (const record of entities[entity] ?? []) {
      const slug = record.slug;
      const name = val(record, namePattern);
      if (!slug || typeof slug !== "string") {
        throw new Error(`a ${entity} record has no slug; refusing to sync malformed data`);
      }
      if (name === undefined || name === null || name === "") {
        throw new Error(`${entity} "${slug}" has no name field matching ${namePattern}; refusing to sync`);
      }
      rows.push({ release_id: releaseId, entity, slug, name: String(name), data: record });
    }
  }
  return rows;
}

async function main() {
  const release = localRelease();
  const entityCounts = Object.fromEntries(
    ENTITIES.map(({ entity }) => [entity, (release.entities[entity] ?? []).length]),
  );
  const recordCount = Object.values(entityCounts).reduce((a, b) => a + b, 0);

  const sb = await serviceClient();

  // Step 2: skip if the published release already has this exact content.
  const { data: current, error: curErr } = await sb
    .from("spf_release")
    .select("id, content_hash")
    .eq("status", "published")
    .maybeSingle();
  if (curErr) throw new Error(`checking the current release failed: ${curErr.message}`);
  if (current && current.content_hash === release.contentHash) {
    console.log(`No change: the published release already matches content hash ${release.contentHash}.`);
    return;
  }

  // Step 3: insert the draft release and its records.
  const { data: draft, error: insErr } = await sb
    .from("spf_release")
    .insert({
      version: release.version,
      upstream_sha: release.upstreamSha,
      content_hash: release.contentHash,
      status: "draft",
      record_count: recordCount,
      entity_counts: entityCounts,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(`creating the release failed: ${insErr.message}`);

  const rows = recordRows(draft.id, release.entities);
  const { error: recErr } = await sb.from("spf_record").insert(rows);
  if (recErr) throw new Error(`inserting ${rows.length} records failed: ${recErr.message}`);

  // Step 4: archive the old published release, then publish the new one. Archiving
  // first keeps the "exactly one published" index satisfied at every step.
  if (current) {
    const { error: arcErr } = await sb
      .from("spf_release")
      .update({ status: "archived" })
      .eq("id", current.id);
    if (arcErr) throw new Error(`archiving the previous release failed: ${arcErr.message}`);
  }
  const { error: pubErr } = await sb
    .from("spf_release")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", draft.id);
  if (pubErr) throw new Error(`publishing the release failed: ${pubErr.message}`);

  console.log(
    `Published release ${draft.id} (sha ${release.upstreamSha}, hash ${release.contentHash}): ` +
      `${recordCount} records across ${ENTITIES.length} entities.`,
  );
}

main().catch((err) => {
  console.error(`sync-framework failed: ${err.message}`);
  process.exit(1);
});

export { recordRows };
