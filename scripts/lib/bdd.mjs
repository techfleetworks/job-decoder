/**
 * Shared helpers for the BDD gate scripts (bdd-comprehensive-testing skill).
 * Parses feature files with the official Cucumber Gherkin parser so "valid
 * Gherkin" is whatever that parser accepts, and builds the scenario datastore
 * that the gates read. Every function takes a base directory so the gates can run
 * against test fixtures as well as the real repo.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  AstBuilder,
  GherkinClassicTokenMatcher,
  Parser,
} from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

export const CATEGORIES = [
  "happy",
  "edge",
  "error",
  "boundary",
  "negative",
  "adverse",
  "concurrency",
  "permission",
  "empty-overflow",
  "timeout",
];
export const QUALITIES = [
  "functional",
  "security",
  "reliability",
  "release-safety",
  "compliance",
  "performance",
  "accessibility",
];
export const SEVERITIES = ["critical", "high", "medium", "low"];

export function featuresDir(baseDir = ".") {
  return join(baseDir, "features");
}

export function listFeatureFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFeatureFiles(full));
    else if (name.endsWith(".feature")) out.push(full);
  }
  return out.sort();
}

export function parseFeature(file) {
  const parser = new Parser(
    new AstBuilder(IdGenerator.uuid()),
    new GherkinClassicTokenMatcher(),
  );
  // Throws on invalid Gherkin; the parser is the authority on syntax.
  return parser.parse(readFileSync(file, "utf8"));
}

const tagNames = (tags) => (tags ?? []).map((t) => t.name);

export function tagValues(tags, prefix) {
  return tags.filter((t) => t.startsWith(prefix)).map((t) => t.slice(prefix.length));
}

/**
 * Every scenario across all feature files, each with its feature tags merged in
 * (so an @audience on the Feature line counts for its scenarios). Sorted, so the
 * datastore is deterministic and a drift check is a plain string compare.
 * Note: a Scenario Outline counts as one entry here; its examples expand at run
 * time. No outlines exist yet; revisit the executed-count check when one is added.
 */
export function collectScenarios(baseDir = ".") {
  const dir = featuresDir(baseDir);
  const scenarios = [];
  for (const file of listFeatureFiles(dir)) {
    const doc = parseFeature(file);
    const feature = doc.feature;
    if (!feature) continue;
    const fTags = tagNames(feature.tags);
    const rel = relative(baseDir, file).split(sep).join("/");
    const domain = relative(dir, file).split(sep)[0] ?? "";
    for (const child of feature.children ?? []) {
      const sc = child.scenario;
      if (!sc) continue;
      const tags = [...fTags, ...tagNames(sc.tags)];
      scenarios.push({
        file: rel,
        feature: feature.name,
        scenario: sc.name,
        domain,
        audiences: tagValues(tags, "@audience:"),
        usecases: tagValues(tags, "@usecase:"),
        categories: tagValues(tags, "@category:"),
        qualities: tagValues(tags, "@quality:"),
        severities: tagValues(tags, "@severity:"),
        status: tags.includes("@wip") ? "pending" : "covered",
      });
    }
  }
  scenarios.sort((a, b) =>
    (a.file + "::" + a.scenario).localeCompare(b.file + "::" + b.scenario),
  );
  return scenarios;
}

export function buildIndex(baseDir = ".") {
  return { scenarios: collectScenarios(baseDir) };
}

export function renderIndexMd(index) {
  const lines = [
    "# BDD scenario index",
    "",
    "Generated from the feature files by `npm run bdd:index`. Do not edit by hand.",
    "",
    "| Domain | Feature | Scenario | Audience | Use case | Category | Quality | Severity | Status |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const s of index.scenarios) {
    lines.push(
      `| ${s.domain} | ${s.feature} | ${s.scenario} | ${s.audiences.join(", ")} | ${s.usecases.join(", ")} | ${s.categories.join(", ")} | ${s.qualities.join(", ")} | ${s.severities.join(", ")} | ${s.status} |`,
    );
  }
  lines.push("", `Total: ${index.scenarios.length} scenario(s).`, "");
  return lines.join("\n");
}

export function loadAudiences(baseDir = ".") {
  const f = join(featuresDir(baseDir), "audiences.json");
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, "utf8")).audiences ?? [];
}

export function serializeIndex(index) {
  return JSON.stringify(index, null, 2) + "\n";
}
