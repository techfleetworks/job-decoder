#!/usr/bin/env node
/**
 * Proves the scenarios actually ran against real code, not just that the feature
 * files are complete. Reads the Cucumber JSON report and fails (closed) unless
 * every non-pending scenario in the datastore executed and every step passed
 * (zero undefined / pending / skipped / failed). A job that runs no scenarios, or
 * silently skips some, fails the build (bdd-comprehensive-testing skill).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIndex } from "./lib/bdd.mjs";

const baseDir = process.argv[2] ?? ".";
const reportPath = process.argv[3] ?? join(baseDir, "reports", "cucumber-report.json");

if (!existsSync(reportPath)) {
  console.error(`check-bdd-executed: report not found at ${reportPath} (run npm run test:bdd first)`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (err) {
  console.error(`check-bdd-executed: cannot parse report: ${err.message}`);
  process.exit(1);
}

let executed = 0;
const problems = [];
for (const feature of report) {
  for (const el of feature.elements ?? []) {
    if (el.type !== "scenario") continue;
    executed++;
    for (const step of el.steps ?? []) {
      const status = step.result?.status;
      if (status !== "passed") {
        problems.push(`not passed: ${feature.name} :: ${el.name} :: ${step.keyword ?? ""}${step.name ?? ""} -> ${status ?? "no result"}`);
      }
    }
  }
}

const expected = buildIndex(baseDir).scenarios.filter((s) => s.status !== "pending").length;
if (executed !== expected) {
  problems.push(`executed ${executed} scenarios but the datastore has ${expected} non-pending (every scenario must run)`);
}

if (problems.length > 0) {
  console.error(`check-bdd-executed: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`check-bdd-executed: PASS (${executed} scenarios executed and passed)`);
