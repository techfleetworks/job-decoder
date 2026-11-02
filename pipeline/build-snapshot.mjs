#!/usr/bin/env node
// Builds the CDN read model from a framework release (ADR-0022, CQRS read side).
//
// Steps:
//   1. Read the release from the chosen source (supabase in production, local for CI).
//   2. Run the integrity gate (ADR-0008). Any violation fails the build, so bad data
//      never reaches a user. Warnings (the bounded recall gaps) are printed, not fatal.
//   3. Derive the read model and write it to the output directory.
//
// Usage:
//   node pipeline/build-snapshot.mjs --source=local   [--out=public/snapshot]
//   node pipeline/build-snapshot.mjs --source=supabase [--out=public/snapshot]
//
// Default source is supabase (the production path). The local source needs no database.

import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { localRelease, supabaseRelease } from "./lib/release-source.mjs";
import { checkIntegrity } from "./lib/integrity.mjs";
import { deriveSnapshot } from "./lib/derive.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
}

function loadAliases() {
  // The reviewed translator aliases (ADR-0020), a build-time artifact in the repo. A
  // missing file is fine, aliases are optional. But a parse error means the committed
  // table is corrupt, so let it throw and fail the build closed rather than silently
  // ship a snapshot with zero aliases and lose matcher recall.
  const path = join(HERE, "..", "eval", "aliases.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

export async function buildSnapshot({ source, out, dataDir }) {
  const release = source === "local" ? localRelease(dataDir) : await supabaseRelease();

  const integrity = checkIntegrity(release.entities);
  for (const w of integrity.warnings) console.warn(`  note [${w.rule}] ${w.detail}`);
  if (!integrity.ok) {
    const lines = integrity.violations.map((v) => `  [${v.rule}] ${v.detail}`).join("\n");
    throw new Error(`integrity gate failed with ${integrity.violations.length} violation(s):\n${lines}`);
  }

  const snap = deriveSnapshot(release, loadAliases());

  // Start clean so a removed function slice does not linger.
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  writeJson(join(out, "manifest.json"), snap.manifest);
  writeJson(join(out, "titles.json"), snap.titles);
  writeJson(join(out, "items.json"), snap.items);
  writeJson(join(out, "duties.json"), snap.duties);
  writeJson(join(out, "skills.json"), snap.skills);
  for (const [slug, slice] of Object.entries(snap.functionSlices)) {
    writeJson(join(out, "functions", `${slug}.json`), slice);
  }
  return snap;
}

async function main() {
  const source = arg("source", "supabase");
  const out = resolve(process.cwd(), arg("out", "public/snapshot"));
  const dataArg = arg("data", null);
  const dataDir = dataArg ? resolve(process.cwd(), dataArg) : undefined;
  if (source !== "local" && source !== "supabase") {
    throw new Error(`unknown --source "${source}" (use local or supabase)`);
  }
  const snap = await buildSnapshot({ source, out, dataDir });
  console.log(
    `Snapshot built from ${source}: ${snap.manifest.counts.functions} functions, ` +
      `${snap.manifest.counts.items} items, ${snap.manifest.counts.titles} titles ` +
      `(sha ${snap.manifest.upstreamSha}, hash ${snap.manifest.contentHash}).`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(`build-snapshot failed: ${err.message}`);
    process.exit(1);
  });
}
