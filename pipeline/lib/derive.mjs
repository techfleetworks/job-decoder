// Derives the read model the browser and the decode route read: the write side
// (versioned JSONB) in, the CDN read side out (ADR-0022, CQRS). The output is plain
// serializable JSON, built once at deploy time, so nothing queries the database on the
// request path.
//
// Four artifacts:
//   titles.json        every known title (normalized) -> its job function slug, plus
//                      the function list, for title resolution (ADR-0012).
//   items.json         every activity, deliverable, and tool with its aliases and the
//                      duties it rolls up to, so the matcher can compare a posting
//                      against ALL framework items, not only the resolved function's
//                      (ADR-0025), and roll a match up to its hat (ADR-0021).
//   functions/<slug>   per function: its standard hats (the duties the title is
//                      expected to cover) with plain-language names and descriptions,
//                      for classification into covered / missed / added.
//   manifest.json      the pin (upstream SHA, content hash, version), counts, and the
//                      file list, so every result can name the exact data it came from.
//
// Items are stored once in items.json and referenced by slug; they are not copied into
// each function slice. One owner per fact: a slice says which hats are standard, the
// item index says which items belong to which hat, and neither repeats the other.

import { buildReadModel, rel, val } from "./relations.mjs";
import { itemDuties } from "./relations.mjs";
import { normalize } from "./text.mjs";
import { MANIFEST_VERSION } from "./manifest.mjs";

// release: { upstreamSha, contentHash, entities: { "job-function": [...], ... } }
// aliases: { "<type>:<slug>": ["alias phrase", ...] } (the reviewed translator table).
export function deriveSnapshot(release, aliases = {}) {
  const e = release.entities;
  const rm = buildReadModel({
    jobFunctions: e["job-function"] ?? [],
    duties: e["duty"] ?? [],
    activities: e["activity"] ?? [],
    deliverables: e["deliverable"] ?? [],
    tools: e["tool"] ?? [],
  });

  const dutyBySlug = new Map((e["duty"] ?? []).map((d) => [d.slug, d]));
  const fnBySlug = new Map((e["job-function"] ?? []).map((f) => [f.slug, f]));
  const activityBySlug = new Map((e["activity"] ?? []).map((a) => [a.slug, a]));
  const deliverableBySlug = new Map((e["deliverable"] ?? []).map((d) => [d.slug, d]));

  // titles.json
  const titles = {};
  for (const [title, slug] of rm.titleIndex) titles[title] = slug;
  const functions = (e["job-function"] ?? []).map((f) => ({
    slug: f.slug,
    name: rm.functionName.get(f.slug) ?? f.slug,
  }));

  // items.json: every leaf item, its aliases, the duties it rolls up to, and the extra
  // detail resume prep needs (ADR-0024): an activity's skills and associated deliverables,
  // and a deliverable's "why it matters".
  const items = rm.items.map((item) => {
    const base = {
      slug: item.slug,
      type: item.type,
      label: item.label,
      aliases: aliases[`${item.type}:${item.slug}`] ?? [],
      duties: [...itemDuties(rm, item)],
    };
    if (item.type === "activity") {
      const a = activityBySlug.get(item.slug);
      base.skills = a ? rel(a, /^required hard skills$/i) : [];
      base.deliverables = a ? rel(a, /^associated deliverables$/i) : [];
    } else if (item.type === "deliverable") {
      const d = deliverableBySlug.get(item.slug);
      base.whyImportant = d ? val(d, /^why is this deliverable important/i) ?? "" : "";
    }
    return base;
  });

  // functions/<slug>.json: the standard hats for the function.
  const functionSlices = {};
  for (const f of e["job-function"] ?? []) {
    const standardHats = [...(rm.functionToDuties.get(f.slug) ?? [])]
      .filter((dutySlug) => dutySlug !== "everyone")
      .map((dutySlug) => {
        const d = dutyBySlug.get(dutySlug);
        return {
          slug: dutySlug,
          name: rm.dutyName.get(dutySlug) ?? dutySlug,
          description: d ? val(d, /^duty description$/i) ?? "" : "",
        };
      });
    functionSlices[f.slug] = {
      function: {
        slug: f.slug,
        name: rm.functionName.get(f.slug) ?? f.slug,
        description: val(fnBySlug.get(f.slug), /^job function description$/i) ?? "",
      },
      standardHats,
    };
  }

  // duties.json: full per-hat detail, so a hat in any of the three sets (including a
  // non-standard one, which no function slice lists) can be named and prepared for
  // (ADR-0024). "everyone" is not a hat.
  const duties = (e["duty"] ?? [])
    .filter((d) => d.slug !== "everyone")
    .map((d) => ({
      slug: d.slug,
      name: rm.dutyName.get(d.slug) ?? d.slug,
      description: val(d, /^duty description$/i) ?? "",
      whyImportant: val(d, /^why is this duty important/i) ?? "",
      skillsRequired: rel(d, /^skills required for the duty$/i),
      foundationalSkills: rel(d, /^foundational skills$/i),
      activities: rel(d, /^activities$/i),
      deliverables: rel(d, /^responsible deliverables$/i),
      tools: rel(d, /^unique required tools$/i),
    }));

  // skills.json: every skill's name and type (Technical or Interpersonal), so resume prep
  // can split and rank skills without a database call (ADR-0022 amendment, ADR-0024).
  const skills = (e["skill"] ?? []).map((s) => ({
    slug: s.slug,
    name: val(s, /^skill name$/i) ?? s.slug,
    type: val(s, /^skill type$/i) ?? "",
  }));

  const manifest = {
    version: MANIFEST_VERSION,
    upstreamSha: release.upstreamSha,
    contentHash: release.contentHash,
    generatedAt: new Date().toISOString(),
    counts: {
      functions: functions.length,
      items: items.length,
      titles: Object.keys(titles).length,
      duties: duties.length,
      skills: skills.length,
    },
    files: [
      "titles.json",
      "items.json",
      "duties.json",
      "skills.json",
      ...functions.map((f) => `functions/${f.slug}.json`),
    ],
  };

  return { manifest, titles: { titles, functions }, items, duties, skills, functionSlices };
}

// Exposed so a caller can normalize a lookup the same way the title index was built.
export { normalize };
