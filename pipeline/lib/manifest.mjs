// The framework entity manifest: the single list of which entities the data tier
// holds, which file each lives in, and how to read a record's display name.
//
// Field names in the source JSON carry apostrophes and punctuation (for example
// "Who's Responsible?"), and straight vs curly apostrophes differ byte for byte, so
// every field is resolved by a case-insensitive pattern on the key, never a hardcoded
// string. A changed apostrophe then fails loudly at resolve time instead of silently
// reading undefined.

// The upstream commit the framework data is pinned to (ADR-0008 rule 7). The sync
// step stamps this onto the release so every result can name the exact bytes it came
// from. Override with FRAMEWORK_SHA when syncing a different pin.
export const PINNED_SHA = process.env.FRAMEWORK_SHA || "636635a";

// The manifest version string never changes (ADR-0008 rule 7); the release is pinned
// by the commit SHA and content hash, not by this string.
export const MANIFEST_VERSION = "v1";

// Each entity: the key used in the data tier, the source file in the pinned data
// directory, and the pattern that finds its display-name field.
export const ENTITIES = [
  { entity: "job-function", file: "job-functions.json", namePattern: /^job function$/i },
  { entity: "duty",         file: "duties.json",        namePattern: /^duty name$/i },
  { entity: "activity",     file: "activities.json",    namePattern: /^activity name$/i },
  { entity: "deliverable",  file: "deliverables.json",  namePattern: /^deliverable name$/i },
  { entity: "tool",         file: "tools.json",         namePattern: /^tool name$/i },
  { entity: "skill",        file: "skills.json",        namePattern: /^skill name$/i },
];
