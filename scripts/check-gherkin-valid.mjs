#!/usr/bin/env node
/**
 * Fails the build on any .feature file the official Cucumber Gherkin parser
 * rejects. Legal syntax always parses; illegal syntax cannot, so the author never
 * decides what is valid, the parser does (bdd-comprehensive-testing skill).
 */
import { featuresDir, listFeatureFiles, parseFeature } from "./lib/bdd.mjs";

const baseDir = process.argv[2] ?? ".";
const files = listFeatureFiles(featuresDir(baseDir));
if (files.length === 0) {
  console.error("check-gherkin-valid: no .feature files found");
  process.exit(1);
}
let errors = 0;
for (const f of files) {
  try {
    parseFeature(f);
  } catch (err) {
    errors++;
    console.error(`  [invalid] ${f}: ${String(err.message).split("\n")[0]}`);
  }
}
if (errors > 0) {
  console.error(`check-gherkin-valid: ${errors} invalid feature file(s)`);
  process.exit(1);
}
console.log(`check-gherkin-valid: PASS (${files.length} feature file(s) parse)`);
