#!/usr/bin/env node
// Alias/CSV parity gate (ADR-0020, ADR-0049). The translator table (eval/translator-table.csv)
// is the declared single source of truth for the matcher's aliases; eval/aliases.json is the
// artifact both decode twins consume (directly in the eval twin, through the snapshot in the app
// twin). Nothing generates one from the other -- they are hand-edited in lockstep -- so without
// a gate they drift silently, and "two copies kept in sync by hand always disagree eventually."
// This check makes divergence fail closed: every leaf (activity/deliverable/tool) alias phrase in
// aliases.json must have a matching term,spf_entity,spf_slug row in the CSV, and every leaf CSV
// row must have a matching alias. Duty/skill rows are excluded, by design: only leaf entities are
// carried in aliases.json (eval/README). Deterministic: no network, no model.
//
// Usage:
//   node scripts/check-alias-csv-parity.mjs
//   node scripts/check-alias-csv-parity.mjs --self-test   (proves the check detects drift)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSV = join(HERE, "..", "eval", "translator-table.csv");
const ALIASES = join(HERE, "..", "eval", "aliases.json");
const LEAF = new Set(["activity", "deliverable", "tool"]);

// A phrase key is compared case-insensitively on collapsed whitespace, the same shape both files
// store. This is identity comparison of the literal phrase, not the matcher's token normalize.
const key = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\r") { /* skip */ }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Returns the set of "<type>:<slug>::<phrasekey>" pairs the CSV declares for leaf entities.
function csvPairs(csvText) {
  const rows = parseCsv(csvText);
  const h = rows[0];
  const iT = h.indexOf("term"), iE = h.indexOf("spf_entity"), iS = h.indexOf("spf_slug");
  const pairs = new Set();
  for (const r of rows.slice(1)) {
    if (!r[iT] || !LEAF.has(r[iE])) continue;
    pairs.add(`${r[iE]}:${r[iS]}::${key(r[iT])}`);
  }
  return pairs;
}

// Returns the set of "<type>:<slug>::<phrasekey>" pairs aliases.json declares for leaf entities.
function aliasPairs(aliasMap) {
  const pairs = new Set();
  for (const [k, list] of Object.entries(aliasMap)) {
    const type = k.slice(0, k.indexOf(":"));
    if (!LEAF.has(type)) continue;
    for (const phrase of list || []) pairs.add(`${k}::${key(phrase)}`);
  }
  return pairs;
}

// Compare the two pair-sets. Returns { inCsvNotAlias, inAliasNotCsv }.
function diff(csvText, aliasMap) {
  const a = csvPairs(csvText);
  const b = aliasPairs(aliasMap);
  const inCsvNotAlias = [...a].filter((p) => !b.has(p));
  const inAliasNotCsv = [...b].filter((p) => !a.has(p));
  return { inCsvNotAlias, inAliasNotCsv };
}

// Prove the check discriminates, so it is not vacuous (verifiable-quality-gates): identical data
// passes; a CSV row with no alias, or an alias with no CSV row, each fail.
function selfTest() {
  const baseCsv =
    "term,spf_entity,spf_slug,spf_label,relation,doc_frequency,pct_postings,top_titles,source\n" +
    "wireframes,deliverable,wireframes,Wireframes,exact,0,0.0,,domain\n";
  const baseAliases = { "deliverable:wireframes": ["wireframes"] };

  const clean = diff(baseCsv, baseAliases);
  const cleanOk = clean.inCsvNotAlias.length === 0 && clean.inAliasNotCsv.length === 0;

  // CSV has a row aliases.json lacks.
  const csvExtra = diff(baseCsv + "redlines,deliverable,design-annotation,Design Annotation,variant,0,0.0,,domain\n", baseAliases);
  const csvExtraOk = csvExtra.inCsvNotAlias.length === 1 && csvExtra.inAliasNotCsv.length === 0;

  // aliases.json has a phrase the CSV lacks.
  const aliasExtra = diff(baseCsv, { ...baseAliases, "deliverable:roadmap": ["roadmapping"] });
  const aliasExtraOk = aliasExtra.inAliasNotCsv.length === 1 && aliasExtra.inCsvNotAlias.length === 0;

  const ok = cleanOk && csvExtraOk && aliasExtraOk;
  console.log(
    `self-test: clean=${cleanOk ? "ok" : "FAIL"}, csv-only-row-detected=${csvExtraOk ? "ok" : "FAIL"}, ` +
      `alias-only-phrase-detected=${aliasExtraOk ? "ok" : "FAIL"} -> ${ok ? "PASS" : "FAIL"}`,
  );
  if (!ok) {
    console.error("Alias/CSV parity check is vacuous: it did not discriminate. Fix it.");
    process.exit(1);
  }
  console.log("Alias/CSV parity gate discriminates: a row or phrase present in only one file fails.");
}

function main() {
  if (process.argv.slice(2).includes("--self-test")) return selfTest();
  const csvText = readFileSync(CSV, "utf8");
  const aliasMap = JSON.parse(readFileSync(ALIASES, "utf8"));
  const { inCsvNotAlias, inAliasNotCsv } = diff(csvText, aliasMap);
  const total = inCsvNotAlias.length + inAliasNotCsv.length;
  if (total) {
    console.error(
      `Alias/CSV parity gate (ADR-0020, ADR-0049): ${total} leaf mapping(s) present in only one source:`,
    );
    for (const p of inCsvNotAlias) console.error(`  in translator-table.csv, missing from aliases.json: ${p}`);
    for (const p of inAliasNotCsv) console.error(`  in aliases.json, missing from translator-table.csv: ${p}`);
    console.error(
      "\ntranslator-table.csv is the single source of truth (ADR-0020); aliases.json must mirror its leaf rows exactly. Edit both in lockstep.",
    );
    process.exit(1);
  }
  console.log("Alias/CSV parity gate: every leaf alias matches a translator-table row and vice versa (0 drift).");
}

main();
