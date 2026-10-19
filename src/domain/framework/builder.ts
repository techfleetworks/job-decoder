/**
 * Turns raw datasets + manifest into the indexed FrameworkData the app reads.
 * Pure: no I/O. Indexing by slug is what lets the resolver follow relationships
 * by slug rather than by display label (ADR-0002).
 */
import type {
  FrameworkData,
  FrameworkManifest,
  FrameworkRecord,
  RawDatasets,
} from "./types";

/** Index each dataset by slug. Last writer wins on a duplicate slug. */
export function indexDatasets(
  datasets: RawDatasets,
): Map<string, Map<string, FrameworkRecord>> {
  const entities = new Map<string, Map<string, FrameworkRecord>>();
  for (const [entityName, records] of Object.entries(datasets)) {
    const bySlug = new Map<string, FrameworkRecord>();
    for (const record of records) {
      bySlug.set(record.slug, record);
    }
    entities.set(entityName, bySlug);
  }
  return entities;
}

/** The entity -> primaryField map from the manifest. */
export function primaryFieldsFromManifest(
  manifest: FrameworkManifest,
): Map<string, string> {
  const primaryFields = new Map<string, string>();
  for (const entity of manifest.entities) {
    primaryFields.set(entity.entity, entity.primaryField);
  }
  return primaryFields;
}

/** Build FrameworkData from a fresh manifest + datasets. */
export function buildFrameworkData(
  manifest: FrameworkManifest,
  datasets: RawDatasets,
): FrameworkData {
  return {
    version: manifest.version,
    entities: indexDatasets(datasets),
    primaryFields: primaryFieldsFromManifest(manifest),
  };
}

/** Build FrameworkData from a cached snapshot (no live manifest). */
export function buildFromCache(
  version: string,
  primaryFields: Record<string, string>,
  datasets: RawDatasets,
): FrameworkData {
  return {
    version,
    entities: indexDatasets(datasets),
    primaryFields: new Map(Object.entries(primaryFields)),
  };
}
