/**
 * Reads and resolves framework relationships by slug. Pure: no I/O, no DOM.
 * Relationship fields are arrays of { slug, label }; this module resolves those
 * slugs to full records, and falls back to the embedded label when a referenced
 * slug is not present in the dataset (honest: it never invents a record).
 */
import {
  ENTITY,
  JOB_FUNCTION_FIELD,
  type FrameworkData,
  type FrameworkRecord,
  type SlugRef,
} from "./types";

/** Look up one record by entity + slug. */
export function getRecord(
  data: FrameworkData,
  entity: string,
  slug: string,
): FrameworkRecord | undefined {
  return data.entities.get(entity)?.get(slug);
}

/** All records for an entity, in insertion order. */
export function listRecords(
  data: FrameworkData,
  entity: string,
): FrameworkRecord[] {
  const bySlug = data.entities.get(entity);
  return bySlug ? [...bySlug.values()] : [];
}

function isSlugRef(x: unknown): x is SlugRef {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as SlugRef).slug === "string" &&
    typeof (x as SlugRef).label === "string"
  );
}

/** Read a relationship field as a clean SlugRef[] (ignoring malformed entries). */
export function getRefs(record: FrameworkRecord, field: string): SlugRef[] {
  const value = record[field];
  if (!Array.isArray(value)) return [];
  return value.filter(isSlugRef);
}

/** The display name of a record, using the manifest's primary field. */
export function getPrimaryName(
  data: FrameworkData,
  entity: string,
  record: FrameworkRecord,
): string {
  const field = data.primaryFields.get(entity);
  const value = field ? record[field] : undefined;
  return typeof value === "string" ? value : record.slug;
}

/** A reference resolved against a target entity: the full record if found. */
export interface ResolvedRef {
  slug: string;
  /** The label from the reference, kept as a fallback when `record` is missing. */
  label: string;
  record?: FrameworkRecord;
}

/** Resolve a list of references against a target entity, by slug. */
export function resolveRefs(
  data: FrameworkData,
  targetEntity: string,
  refs: SlugRef[],
): ResolvedRef[] {
  return refs.map((ref) => ({
    slug: ref.slug,
    label: ref.label,
    record: getRecord(data, targetEntity, ref.slug),
  }));
}

/** Resolve a record's relationship field against a target entity in one step. */
export function resolveField(
  data: FrameworkData,
  record: FrameworkRecord,
  field: string,
  targetEntity: string,
): ResolvedRef[] {
  return resolveRefs(data, targetEntity, getRefs(record, field));
}

/** The duties ("hats") standard for a Job Function, resolved to Duty records. */
export function getAssociatedDuties(
  data: FrameworkData,
  jobFunction: FrameworkRecord,
): ResolvedRef[] {
  return resolveField(
    data,
    jobFunction,
    JOB_FUNCTION_FIELD.associatedDuties,
    ENTITY.duties,
  );
}
