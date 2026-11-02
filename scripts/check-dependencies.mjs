#!/usr/bin/env node
/**
 * The dependency-scan gate (T13). It runs `npm audit` over the PRODUCTION dependencies
 * (what ships to users) and fails the build on any high or critical advisory that is not
 * explicitly waived with an unexpired review date. New advisories fail; known ones are
 * accepted only while their waiver is current, so a waiver cannot quietly become permanent.
 *
 * Dev-only tooling (test runners, linters) is out of scope here: it never reaches the
 * shipped bundle. The waivers live in scripts/dependency-waivers.json, each with a reason
 * and a reviewBy date.
 *
 * Usage:
 *   node scripts/check-dependencies.mjs
 *   node scripts/check-dependencies.mjs --report=<file> --waivers=<file>   (for tests)
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEVERITIES = new Set(["high", "critical"]);

/**
 * Pure evaluation: given an npm audit report and the waivers, return the production
 * high/critical advisories that are not waived (`unexpected`) and the waived ones whose
 * review date has passed (`expired`). Kept pure so a test can prove it detects both.
 */
export function evaluateAudit(report, waivers, now = new Date()) {
  const vulns = (report && report.vulnerabilities) || {};
  const unexpected = [];
  const expired = [];
  for (const [name, info] of Object.entries(vulns)) {
    if (!SEVERITIES.has(info.severity)) continue;
    const waiver = waivers[name];
    if (!waiver) {
      unexpected.push({ name, severity: info.severity });
    } else if (new Date(waiver.reviewBy) < now) {
      expired.push({ name, severity: info.severity, reviewBy: waiver.reviewBy });
    }
  }
  return { ok: unexpected.length === 0 && expired.length === 0, unexpected, expired };
}

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
}

function readReport() {
  const reportArg = arg("report");
  if (reportArg) return JSON.parse(readFileSync(resolve(process.cwd(), reportArg), "utf8"));
  try {
    return JSON.parse(execSync("npm audit --omit=dev --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch (err) {
    // npm audit exits non-zero when advisories exist; its JSON report is still on stdout.
    if (err.stdout) return JSON.parse(err.stdout.toString());
    throw new Error(`npm audit did not produce a report: ${err.message}`);
  }
}

function main() {
  const waiversPath = arg("waivers") ? resolve(process.cwd(), arg("waivers")) : join(HERE, "dependency-waivers.json");
  const waivers = JSON.parse(readFileSync(waiversPath, "utf8"));
  const { ok, unexpected, expired } = evaluateAudit(readReport(), waivers);

  for (const u of unexpected) {
    console.error(`  [${u.severity}] ${u.name}: a production advisory with no waiver`);
  }
  for (const e of expired) {
    console.error(`  [${e.severity}] ${e.name}: waiver expired on ${e.reviewBy} (review and renew or fix)`);
  }
  if (!ok) {
    console.error(
      `Dependency gate: ${unexpected.length} unwaived and ${expired.length} expired production high/critical advisory(ies)`,
    );
    process.exit(1);
  }
  console.log(
    `Dependency gate: PASS (no unwaived production high/critical advisories; ${Object.keys(waivers).length} waived with a review date)`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
