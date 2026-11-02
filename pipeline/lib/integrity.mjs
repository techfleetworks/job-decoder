// The framework data integrity gate (ADR-0008). The snapshot build runs this before
// it derives anything and fails closed on any violation, so a wrong join or a drifted
// copy becomes a loud build failure, never a quiet bad answer shipped to a user.
//
// Two rules fail the build:
//   R1  Every link the read model uses resolves by (entity, slug) to exactly one
//       record in its known target entity. A dangling link fails. (ADR-0008 rule 1.)
//   R2  One owner per fact: the function-to-duty relationship, stored on the function
//       ("Associated Duties"), must agree with the duty's own back-reference
//       ("Associated Team Function"). A disagreement fails. (ADR-0008 rule 2.)
//
// One rule is reported, not failed:
//   R3  Degenerate duties. "everyone" is not a role hat and is excluded. A duty that
//       no activity is Responsible for has no evidence phrases to match on, so it is
//       kept as an expected hat but cannot be reported as "written." This bounds the
//       known recall gap instead of hiding it. (ADR-0008 rule 3.)

import { val, rel } from "./relations.mjs";

// "everyone" has no team functions and is not a real role hat (ADR-0008 rule 3).
export const EXCLUDED_DUTIES = new Set(["everyone"]);

// The links the read model consumes, each with the entity it must resolve into. These
// are exactly the joins the snapshot roll-up depends on; a dangling one would corrupt
// a slice, so each is checked.
const LINKS = [
  { from: "job-function", field: /^associated duties$/i, to: "duty" },
  { from: "job-function", field: /^required tools$/i, to: "tool" },
  { from: "duty", field: /^unique required tools$/i, to: "tool" },
  { from: "activity", field: /^who.?s responsible/i, to: "duty" },
  { from: "deliverable", field: /^duty who owns the deliverable/i, to: "duty" },
];

function slugSet(records) {
  return new Set(records.map((r) => r.slug));
}

// entities: { "job-function": [...], duty: [...], activity: [...], deliverable: [...], tool: [...] }
export function checkIntegrity(entities) {
  const violations = [];
  const warnings = [];
  const slugsByEntity = Object.fromEntries(
    Object.entries(entities).map(([name, recs]) => [name, slugSet(recs)]),
  );

  // R1: every read-model link resolves to exactly one record in its target entity.
  for (const link of LINKS) {
    const targets = slugsByEntity[link.to];
    if (!targets) {
      violations.push({ rule: "R1", detail: `target entity "${link.to}" is missing` });
      continue;
    }
    for (const record of entities[link.from] ?? []) {
      for (const slug of rel(record, link.field)) {
        if (!targets.has(slug)) {
          violations.push({
            rule: "R1",
            detail: `${link.from} "${record.slug}" links to ${link.to} "${slug}", which does not exist`,
          });
        }
      }
    }
  }

  // R2: function-to-duty agrees with duty-to-function, both directions, excluding
  // "everyone". The function side is the owner; the duty back-reference must match.
  const functions = entities["job-function"] ?? [];
  const duties = entities["duty"] ?? [];
  const dutySlugs = slugsByEntity["duty"] ?? new Set();
  const fnSlugs = slugsByEntity["job-function"] ?? new Set();

  const fnToDuties = new Map(
    functions.map((f) => [f.slug, new Set(rel(f, /^associated duties$/i).filter((s) => !EXCLUDED_DUTIES.has(s)))]),
  );
  const dutyToFns = new Map(
    duties.map((d) => [d.slug, new Set(rel(d, /^associated team function$/i))]),
  );

  for (const [fn, dutiesOfFn] of fnToDuties) {
    for (const duty of dutiesOfFn) {
      const back = dutyToFns.get(duty);
      if (!dutySlugs.has(duty)) continue; // already an R1 dangling finding
      if (!back || !back.has(fn)) {
        violations.push({
          rule: "R2",
          detail: `function "${fn}" lists duty "${duty}", but that duty's "Associated Team Function" does not list "${fn}"`,
        });
      }
    }
  }
  for (const [duty, fnsOfDuty] of dutyToFns) {
    if (EXCLUDED_DUTIES.has(duty)) continue;
    for (const fn of fnsOfDuty) {
      if (!fnSlugs.has(fn)) continue; // the duty points at a function that is not present
      const forward = fnToDuties.get(fn);
      if (!forward || !forward.has(duty)) {
        violations.push({
          rule: "R2",
          detail: `duty "${duty}" names function "${fn}", but that function's "Associated Duties" does not list "${duty}"`,
        });
      }
    }
  }

  // R3 (reported, not failed): duties no activity is Responsible for, and the excluded
  // "everyone". These are kept as expected hats but cannot be matched as "written."
  const responsibleDuties = new Set();
  for (const a of entities["activity"] ?? []) {
    for (const s of rel(a, /^who.?s responsible/i)) responsibleDuties.add(s);
  }
  const nonMatchable = duties
    .filter((d) => !EXCLUDED_DUTIES.has(d.slug) && !responsibleDuties.has(d.slug))
    .map((d) => d.slug);
  if (nonMatchable.length > 0) {
    warnings.push({
      rule: "R3",
      detail: `duties with no Responsible activity (kept as expected hats, not matchable): ${nonMatchable.join(", ")}`,
    });
  }
  for (const excluded of EXCLUDED_DUTIES) {
    if (dutySlugs.has(excluded)) {
      warnings.push({ rule: "R3", detail: `duty "${excluded}" is present and excluded as a hat` });
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    warnings,
    stats: {
      functions: functions.length,
      duties: duties.length,
      nonMatchableDuties: nonMatchable,
    },
  };
}
