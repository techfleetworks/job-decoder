#!/usr/bin/env node
/**
 * Fails the build unless every scenario carries the full taxonomy and each value
 * is in-vocabulary: @audience (in features/audiences.json), @usecase, @category,
 * @quality, @severity. A missing, typo'd, or invented tag fails, so the matrix,
 * datastore, and log cannot be fooled by a tag that merely looks valid.
 */
import {
  CATEGORIES,
  QUALITIES,
  SEVERITIES,
  collectScenarios,
  loadAudiences,
} from "./lib/bdd.mjs";

const baseDir = process.argv[2] ?? ".";
const audiences = loadAudiences(baseDir);
const scenarios = collectScenarios(baseDir);
const problems = [];

if (audiences.length === 0) problems.push("features/audiences.json is missing or declares no audiences");
if (scenarios.length === 0) problems.push("no scenarios found in features/");

const allIn = (vals, set) => vals.length > 0 && vals.every((v) => set.includes(v));

for (const s of scenarios) {
  const where = `${s.file} :: ${s.scenario}`;
  if (s.audiences.length === 0) problems.push(`${where}: missing @audience`);
  else if (!s.audiences.every((a) => audiences.includes(a)))
    problems.push(`${where}: @audience not declared in audiences.json (${s.audiences.join(",")})`);
  if (s.usecases.length === 0) problems.push(`${where}: missing @usecase`);
  if (!allIn(s.categories, CATEGORIES)) problems.push(`${where}: missing or invalid @category (${s.categories.join(",")})`);
  if (!allIn(s.qualities, QUALITIES)) problems.push(`${where}: missing or invalid @quality (${s.qualities.join(",")})`);
  if (!allIn(s.severities, SEVERITIES)) problems.push(`${where}: missing or invalid @severity (${s.severities.join(",")})`);
}

if (problems.length > 0) {
  console.error(`check-bdd-tags: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`check-bdd-tags: PASS (${scenarios.length} scenarios, all tagged in-vocabulary)`);
