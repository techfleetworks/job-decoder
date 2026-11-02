// The single owner of how framework relationships resolve into a read model.
//
// Both the eval harness (eval/lib/framework.mjs) and the production snapshot build
// (pipeline/build-snapshot.mjs) read the same framework from different places (local
// files, or the published Supabase release) and must derive the SAME roll-up maps and
// indexes, or a match that works in the eval would differ in production. So that logic
// lives here once and both import it. There is no second copy to drift.
//
// Field names carry apostrophes and punctuation, so every field is resolved by a
// pattern on the key, never a hardcoded string (see manifest.mjs).

import { normalize } from "./text.mjs";

export function findKey(obj, re) {
  return Object.keys(obj).find((k) => re.test(k));
}

// Value of the first field whose key matches re.
export function val(obj, re) {
  const k = findKey(obj, re);
  return k === undefined ? undefined : obj[k];
}

// Slugs of a relation field (an array of { slug, label }). A missing field is an
// empty list, never a throw.
export function rel(obj, re) {
  const v = val(obj, re);
  return Array.isArray(v) ? v.map((x) => x && x.slug).filter(Boolean) : [];
}

// Build the read model the decode needs from already-loaded entity arrays. Pure: it
// takes records in and returns maps and indexes, with no file or network I/O, so the
// same call works over local files and over a Supabase release.
export function buildReadModel({ jobFunctions, duties, activities, deliverables, tools }) {
  // Leaf items a posting can describe.
  const items = [];
  for (const a of activities) {
    items.push({ slug: a.slug, label: val(a, /^activity name$/i), type: "activity" });
  }
  for (const d of deliverables) {
    items.push({ slug: d.slug, label: val(d, /^deliverable name$/i), type: "deliverable" });
  }
  for (const t of tools) {
    items.push({ slug: t.slug, label: val(t, /^tool name$/i), type: "tool" });
  }

  // Activity -> the duty(s) Responsible for it. A posting that names an activity is
  // read as the poster being Responsible for it, so the hat is the Responsible duty
  // only (ADR-0021). This keeps "non-standard" meaningful instead of pulling in every
  // duty merely consulted on common work.
  const activityToDuties = new Map();
  for (const a of activities) {
    activityToDuties.set(a.slug, new Set(rel(a, /^who.?s responsible/i)));
  }

  // Deliverable -> the duty that owns it.
  const deliverableToDuties = new Map();
  for (const d of deliverables) {
    deliverableToDuties.set(d.slug, new Set(rel(d, /^duty who owns the deliverable/i)));
  }

  // Tool -> duties/functions that list it. Tools do not link out to duties, so invert
  // the duty "Unique Required Tools" and function "Required Tools" lists.
  const toolToDuties = new Map();
  const toolToFunctions = new Map();
  for (const t of tools) {
    toolToDuties.set(t.slug, new Set());
    toolToFunctions.set(t.slug, new Set());
  }
  for (const du of duties) {
    for (const ts of rel(du, /^unique required tools$/i)) {
      if (!toolToDuties.has(ts)) toolToDuties.set(ts, new Set());
      toolToDuties.get(ts).add(du.slug);
    }
  }
  for (const fn of jobFunctions) {
    for (const ts of rel(fn, /^required tools$/i)) {
      if (!toolToFunctions.has(ts)) toolToFunctions.set(ts, new Set());
      toolToFunctions.get(ts).add(fn.slug);
    }
  }

  // Function -> its standard duties (the hats the title is expected to cover).
  const functionToDuties = new Map();
  for (const fn of jobFunctions) {
    functionToDuties.set(fn.slug, new Set(rel(fn, /^associated duties$/i)));
  }

  // Title -> function. The canonical job function name wins; alternate titles only
  // fill gaps. No fuzzy guessing: an unknown title stays unresolved (ADR-0008, 0012).
  const titleIndex = new Map();
  for (const fn of jobFunctions) {
    const name = normalize(val(fn, /^job function$/i));
    if (name) titleIndex.set(name, fn.slug);
    titleIndex.set(normalize(fn.slug), fn.slug);
  }
  for (const fn of jobFunctions) {
    const others = val(fn, /^other job titles/i);
    if (typeof others === "string") {
      for (const part of others.split(/[,\n;]/)) {
        const n = normalize(part);
        if (n && !titleIndex.has(n)) titleIndex.set(n, fn.slug);
      }
    }
  }

  const dutyName = new Map(duties.map((d) => [d.slug, val(d, /^duty name$/i)]));
  const functionName = new Map(jobFunctions.map((f) => [f.slug, val(f, /^job function$/i)]));

  return {
    jobFunctions, duties, activities, deliverables, tools,
    items,
    activityToDuties, deliverableToDuties, toolToDuties, toolToFunctions,
    functionToDuties, titleIndex, dutyName, functionName,
  };
}

// The duties a matched item rolls up to. Tools roll up to duties that require them;
// a tool used by no duty contributes no hat.
export function itemDuties(readModel, item) {
  if (item.type === "activity") return readModel.activityToDuties.get(item.slug) ?? new Set();
  if (item.type === "deliverable") return readModel.deliverableToDuties.get(item.slug) ?? new Set();
  if (item.type === "tool") return readModel.toolToDuties.get(item.slug) ?? new Set();
  return new Set();
}

// Resolve a real-world title to a job function slug, or null when not covered.
// Never a guess.
export function resolveTitle(readModel, title) {
  return readModel.titleIndex.get(normalize(title)) ?? null;
}
