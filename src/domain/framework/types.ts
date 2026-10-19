/**
 * Types for the Skills & Practices Framework data, matching the observed shape of
 * the published JSON (see ADR-0002). This module is pure: no I/O, no DOM.
 */

/** A reference to another record, as stored in relationship fields. */
export interface SlugRef {
  slug: string;
  label: string;
}

/**
 * A raw framework record. Every record has a numeric `id` and a string `slug`;
 * the remaining fields vary by entity (primary name, relationship arrays, and
 * plain-text fields), so they are read through typed accessors in the resolver.
 */
export interface FrameworkRecord {
  id: number;
  slug: string;
  [field: string]: unknown;
}

/** One entry in the manifest's `entities` list. */
export interface ManifestEntity {
  entity: string;
  file: string;
  count: number;
  primaryField: string;
  targetField?: string;
}

/** The manifest: lists the framework version and every dataset. */
export interface FrameworkManifest {
  framework: string;
  version: string;
  entities: ManifestEntity[];
}

/** Raw datasets keyed by entity name, each an array of records. */
export type RawDatasets = Record<string, FrameworkRecord[]>;

/**
 * The indexed, in-memory framework used by the rest of the app. Records are
 * indexed by slug per entity so relationships resolve by slug, not label.
 */
export interface FrameworkData {
  version: string;
  /** entity name -> (slug -> record) */
  entities: Map<string, Map<string, FrameworkRecord>>;
  /** entity name -> the manifest's primaryField for that entity */
  primaryFields: Map<string, string>;
}

/** Entity names used across the app (string constants, not display labels). */
export const ENTITY = {
  jobFunctions: "job-functions",
  duties: "duties",
  skills: "skills",
  activities: "activities",
  deliverables: "deliverables",
  specializations: "specializations",
  tools: "tools",
} as const;

export type EntityName = (typeof ENTITY)[keyof typeof ENTITY];

/** The entities loaded for the core experience (MVP #1). */
export const CORE_ENTITIES: EntityName[] = [
  ENTITY.jobFunctions,
  ENTITY.duties,
  ENTITY.skills,
  ENTITY.activities,
  ENTITY.deliverables,
  ENTITY.specializations,
  ENTITY.tools,
];

/** Field names on Job Function records that the app reads by name. */
export const JOB_FUNCTION_FIELD = {
  name: "Job Function",
  associatedDuties: "Associated Duties",
  worldTitles: "Other Job Titles You May See in the World",
  description: "Job Function Description",
} as const;

/** Field names on Duty records that the app reads by name. */
export const DUTY_FIELD = {
  name: "Duty Name",
  responsibleTasks: "Responsible Tasks",
  accountableTasks: "Accountable Tasks",
  consultedTasks: "Consulted Tasks",
  informedTasks: "Informed Tasks",
  description: "Duty Description",
} as const;
