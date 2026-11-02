#!/usr/bin/env node
/**
 * Proves the BDD specification is complete and the datastore is honest. Fails the
 * build (closed) when there are no feature files, a feature has only happy-path
 * scenarios, the committed datastore is out of sync with the feature files, or the
 * coverage log is missing or empty (bdd-comprehensive-testing skill).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildIndex,
  collectScenarios,
  featuresDir,
  listFeatureFiles,
  serializeIndex,
} from "./lib/bdd.mjs";

const baseDir = process.argv[2] ?? ".";
const dir = featuresDir(baseDir);
const problems = [];

const files = listFeatureFiles(dir);
if (files.length === 0) problems.push("no .feature files found");

// 1. Every feature has at least one non-happy-path scenario.
const scenarios = collectScenarios(baseDir);
const byFeature = {};
for (const s of scenarios) (byFeature[s.file] ??= []).push(s);
for (const [file, scs] of Object.entries(byFeature)) {
  const cats = new Set(scs.flatMap((s) => s.categories));
  const hasNonHappy = [...cats].some((c) => c && c !== "happy");
  if (!hasNonHappy) problems.push(`${file}: only happy-path scenarios (add a non-happy path)`);
}

// 2. The committed datastore is in sync with the feature files.
const indexPath = join(dir, "bdd-index.json");
if (!existsSync(indexPath)) {
  problems.push("features/bdd-index.json is missing (run npm run bdd:index)");
} else {
  const onDisk = readFileSync(indexPath, "utf8").trim();
  const fresh = serializeIndex(buildIndex(baseDir)).trim();
  if (onDisk !== fresh)
    problems.push("features/bdd-index.json is out of sync with the feature files (run npm run bdd:index)");
}

// 3. The append-only coverage log is present and non-empty.
const logPath = join(dir, "bdd-coverage-log.md");
if (!existsSync(logPath) || readFileSync(logPath, "utf8").trim().length === 0)
  problems.push("features/bdd-coverage-log.md is missing or empty");

if (problems.length > 0) {
  console.error(`check-bdd-coverage: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(
  `check-bdd-coverage: PASS (${files.length} feature(s), ${scenarios.length} scenarios, datastore in sync, log present)`,
);
