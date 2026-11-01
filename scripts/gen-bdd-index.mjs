#!/usr/bin/env node
/**
 * Generates the committed BDD datastore from the feature files:
 *   features/bdd-index.json  (canonical, machine-readable)
 *   features/INDEX.md        (human-readable view)
 * The feature files stay the single source of truth; this is the derived registry
 * over them. check-bdd-coverage fails the build if these drift from the features.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildIndex, featuresDir, renderIndexMd, serializeIndex } from "./lib/bdd.mjs";

const baseDir = process.argv[2] ?? ".";
const index = buildIndex(baseDir);
writeFileSync(join(featuresDir(baseDir), "bdd-index.json"), serializeIndex(index));
writeFileSync(join(featuresDir(baseDir), "INDEX.md"), renderIndexMd(index));
console.log(
  `gen-bdd-index: wrote bdd-index.json and INDEX.md (${index.scenarios.length} scenarios)`,
);
