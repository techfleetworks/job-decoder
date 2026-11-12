#!/usr/bin/env node
// Evidence-symmetry guard (ADR-0048). The recognizer may not report a match without a
// verbatim quote; this applies the same rule to the ground truth. Every expected deliverable
// in a labeled fixture must record the verbatim phrase from the posting that names it
// (expected.deliverableEvidence[slug]), and that phrase must be present in the posting. A
// label that claims an unnamed artifact fails here, so a label can never manufacture a fake
// miss. Deterministic: no network, no model, so it fits the "CI stays deterministic" rule.
//
// Usage:
//   node scripts/check-fixture-evidence.mjs [--fixtures <path>]
//   node scripts/check-fixture-evidence.mjs --self-test   (proves the check detects)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { normalize, includesPhrase } from "../eval/lib/text.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT = join(HERE, "..", "eval", "fixtures.labeled.json");

// One fixture's expected deliverables checked against its posting. Returns the problems found:
// a deliverable with no recorded naming phrase, or a phrase that is not verbatim in the posting.
function checkFixture(fx) {
  const problems = [];
  const deliverables = (fx.expected && fx.expected.deliverables) || [];
  if (!deliverables.length) return problems;
  const evidence = (fx.expected && fx.expected.deliverableEvidence) || {};
  const hay = normalize(fx.posting || "");
  for (const slug of deliverables) {
    const phrase = evidence[slug];
    if (!phrase || !String(phrase).trim()) {
      problems.push({ fixture: fx.name || fx.title, slug, reason: "no naming phrase recorded" });
      continue;
    }
    const norm = normalize(phrase);
    // Token-boundary match only, the same rule the recognizer's verbatim-quote check uses
    // (ADR-0048, symmetry). A raw substring fallback would let a phrase pass mid-token, which
    // the recognizer would reject, breaking the symmetry this guard exists to enforce.
    if (norm && !includesPhrase(hay, norm)) {
      problems.push({
        fixture: fx.name || fx.title,
        slug,
        reason: `naming phrase not verbatim in posting: "${phrase}"`,
      });
    }
  }
  return problems;
}

function run(fixtures) {
  const scored = fixtures.filter(
    (fx) =>
      fx && typeof fx.title === "string" && fx.expected && (fx.expected.deliverables || []).length,
  );
  return scored.flatMap(checkFixture);
}

// Prove the check discriminates, so it is not vacuous (verifiable-quality-gates): a label with
// a verbatim naming phrase passes; a label with no phrase, or a phrase not in the posting, fails.
function selfTest() {
  const good = {
    name: "synthetic-good",
    title: "x",
    posting: "You will build wireframes for the app.",
    expected: { deliverables: ["wireframes"], deliverableEvidence: { wireframes: "build wireframes" } },
  };
  const missing = {
    name: "synthetic-missing",
    title: "x",
    posting: "You will build wireframes.",
    expected: { deliverables: ["roadmap"], deliverableEvidence: {} },
  };
  const unsupported = {
    name: "synthetic-unsupported",
    title: "x",
    posting: "You will build wireframes.",
    expected: { deliverables: ["roadmap"], deliverableEvidence: { roadmap: "maintain the roadmap" } },
  };
  const g = run([good]).length;
  const m = run([missing]).length;
  const u = run([unsupported]).length;
  const ok = g === 0 && m === 1 && u === 1;
  console.log(`self-test: good=${g} (want 0), missing=${m} (want 1), unsupported=${u} (want 1) -> ${ok ? "PASS" : "FAIL"}`);
  if (!ok) {
    console.error("Evidence-symmetry check is vacuous: it did not discriminate. Fix it.");
    process.exit(1);
  }
  console.log("Evidence-symmetry guard discriminates: a label with no or wrong naming phrase fails.");
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) return selfTest();
  let fixturesPath = DEFAULT;
  const fi = argv.indexOf("--fixtures");
  if (fi >= 0 && argv[fi + 1]) fixturesPath = resolve(argv[fi + 1]);
  const raw = JSON.parse(readFileSync(fixturesPath, "utf8").replace(/^﻿/, ""));
  const problems = run(raw);
  if (problems.length) {
    console.error(
      `Evidence-symmetry guard (ADR-0048): ${problems.length} expected deliverable(s) without a verbatim naming phrase in the posting:`,
    );
    for (const p of problems) console.error(`  ${p.fixture}: ${p.slug} -- ${p.reason}`);
    console.error(
      "\nEvery expected deliverable must record the posting phrase that names it (expected.deliverableEvidence). A label that cannot cite its evidence is removed or corrected.",
    );
    process.exit(1);
  }
  console.log("Evidence-symmetry guard: every expected deliverable cites a verbatim naming phrase.");
}

main();
