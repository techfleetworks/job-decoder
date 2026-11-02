// Loads the pinned Skills and Practices Framework data from local files and builds
// the read model the decode needs.
//
// The relationship logic (roll-up maps, title index, leaf items) lives in
// pipeline/lib/relations.mjs, so the eval harness and the production snapshot build
// derive the read model the same way from the same rules. This module only adds the
// local-file loading and the eval's alias table on top. resolveTitle and itemDuties
// are re-exported from the shared module so existing eval callers keep their imports.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildReadModel, itemDuties, resolveTitle } from '../../pipeline/lib/relations.mjs';

export { itemDuties, resolveTitle };

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'framework-data');

function load(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
}

export function loadFramework() {
  return buildReadModel({
    jobFunctions: load('job-functions.json'),
    duties: load('duties.json'),
    activities: load('activities.json'),
    deliverables: load('deliverables.json'),
    tools: load('tools.json'),
  });
}

// The translator table (aliases.json): { "<type>:<slug>": ["alias phrase", ...] }
// for the matchable leaf items (activity, deliverable, tool). Returns {} if absent.
export function loadAliases() {
  // Missing is fine (aliases are optional); a parse error means the committed table is
  // corrupt, so let it throw rather than silently yield zero aliases.
  const path = join(HERE, '..', 'aliases.json');
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
}
