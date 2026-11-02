// Loads the pinned Skills and Practices Framework data and builds the read model
// the decode needs: the leaf items (activities, deliverables, tools) and the
// roll-up maps from each item to the duties (hats) it belongs to.
//
// Field names in the source JSON contain apostrophes and punctuation
// (for example "Who's Responsible?"), so every field is resolved by a pattern
// match on the key, never a hardcoded string. A curly vs straight apostrophe
// then cannot silently produce an empty roll-up.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalize } from './text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'framework-data');

function load(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
}

function findKey(obj, re) {
  return Object.keys(obj).find((k) => re.test(k));
}

// Value of the first field whose key matches re.
function val(obj, re) {
  const k = findKey(obj, re);
  return k === undefined ? undefined : obj[k];
}

// Slugs of a relation field (array of { slug, label }).
function rel(obj, re) {
  const v = val(obj, re);
  return Array.isArray(v) ? v.map((x) => x && x.slug).filter(Boolean) : [];
}

export function loadFramework() {
  const jobFunctions = load('job-functions.json');
  const duties = load('duties.json');
  const activities = load('activities.json');
  const deliverables = load('deliverables.json');
  const tools = load('tools.json');

  // Leaf items the posting can describe.
  const items = [];
  for (const a of activities) {
    items.push({ slug: a.slug, label: val(a, /^activity name$/i), type: 'activity' });
  }
  for (const d of deliverables) {
    items.push({ slug: d.slug, label: val(d, /^deliverable name$/i), type: 'deliverable' });
  }
  for (const t of tools) {
    items.push({ slug: t.slug, label: val(t, /^tool name$/i), type: 'tool' });
  }

  // Activity -> the duty(s) Responsible for it. A posting that names an activity is
  // treated as the poster being Responsible for it, so the hat is the Responsible
  // duty only (not Accountable, Consulted, or Informed). This is the decided
  // roll-up rule and keeps "non-standard" meaningful instead of pulling in every
  // duty merely consulted on common activities.
  const activityToDuties = new Map();
  for (const a of activities) {
    activityToDuties.set(a.slug, new Set(rel(a, /^who.?s responsible/i)));
  }

  // Deliverable -> the duty that owns it.
  const deliverableToDuties = new Map();
  for (const d of deliverables) {
    deliverableToDuties.set(d.slug, new Set(rel(d, /^duty who owns the deliverable/i)));
  }

  // Tool -> duties/functions that list it. Tools do not link out to duties, so
  // invert the duty "Unique Required Tools" and function "Required Tools" lists.
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

  // Title -> function. The canonical job function name wins; alternate titles
  // only fill gaps. No fuzzy guessing: an unknown title stays unresolved.
  const titleIndex = new Map();
  for (const fn of jobFunctions) {
    const name = normalize(val(fn, /^job function$/i));
    if (name) titleIndex.set(name, fn.slug);
    titleIndex.set(normalize(fn.slug), fn.slug);
  }
  for (const fn of jobFunctions) {
    const others = val(fn, /^other job titles/i);
    if (typeof others === 'string') {
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

export function resolveTitle(fw, title) {
  const n = normalize(title);
  return fw.titleIndex.get(n) ?? null; // null = not covered, never a guess
}

// The duties a matched item rolls up to. Tools roll up to duties that require
// them; a tool used by no duty contributes no hat (it is ignored).
export function itemDuties(fw, item) {
  if (item.type === 'activity') return fw.activityToDuties.get(item.slug) ?? new Set();
  if (item.type === 'deliverable') return fw.deliverableToDuties.get(item.slug) ?? new Set();
  if (item.type === 'tool') return fw.toolToDuties.get(item.slug) ?? new Set();
  return new Set();
}

// The translator table (aliases.json): { "<type>:<slug>": ["alias phrase", ...] }
// for the matchable leaf items (activity, deliverable, tool). Returns {} if absent.
export function loadAliases() {
  try {
    return JSON.parse(readFileSync(join(HERE, '..', 'aliases.json'), 'utf8').replace(/^﻿/, ''));
  } catch {
    return {};
  }
}
