/**
 * The single owner of network fetch and the gateway to the remote framework data
 * (ADR-0002). Fetches the manifest and the needed entity files from the fixed
 * framework origin only, validates every payload as untrusted input, caches a
 * validated snapshot via the storage service keyed by version, and reports
 * failures as a typed FrameworkLoadError. No other module calls `fetch`.
 */
import {
  buildFrameworkData,
  buildFromCache,
} from "../../domain/framework/builder";
import {
  isManifest,
  isRecordArray,
} from "../../domain/framework/validation";
import {
  CORE_ENTITIES,
  type EntityName,
  type FrameworkData,
  type FrameworkManifest,
  type RawDatasets,
} from "../../domain/framework/types";
import { userStore } from "../storage/localStore";

const BASE =
  "https://techfleetworks.github.io/skills-and-practices-framework/data/json";
const MANIFEST_URL = `${BASE}/manifest.json`;
const CACHE_KEY = "framework-cache";
const DEFAULT_TIMEOUT_MS = 10_000;

export type FrameworkLoadErrorKind = "network" | "parse" | "validation";

export class FrameworkLoadError extends Error {
  readonly kind: FrameworkLoadErrorKind;
  readonly source?: unknown;

  constructor(kind: FrameworkLoadErrorKind, message: string, source?: unknown) {
    super(message);
    this.name = "FrameworkLoadError";
    this.kind = kind;
    this.source = source;
  }
}

interface FrameworkCache {
  version: string;
  primaryFields: Record<string, string>;
  datasets: RawDatasets;
}

export interface LoadOptions {
  /** Injectable fetch, for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Which entities to load. Defaults to the core set. */
  entities?: EntityName[];
  /** Per-request timeout. Defaults to 10s. */
  timeoutMs?: number;
  /** Whether to read/write the local cache. Defaults to true. */
  useCache?: boolean;
}

async function fetchJson(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(url, { signal: controller.signal });
  } catch (err) {
    throw new FrameworkLoadError("network", `Could not reach ${url}`, err);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new FrameworkLoadError(
      "network",
      `Request for ${url} failed with status ${response.status}`,
    );
  }
  try {
    return (await response.json()) as unknown;
  } catch (err) {
    throw new FrameworkLoadError("parse", `${url} did not return valid JSON`, err);
  }
}

/** Read a valid cached snapshot that covers the requested entities, or null. */
function readCache(entities: EntityName[]): FrameworkCache | null {
  const cache = userStore.get<FrameworkCache | null>(CACHE_KEY, null);
  if (!cache || typeof cache.version !== "string" || !cache.datasets) {
    return null;
  }
  for (const entity of entities) {
    if (!isRecordArray(cache.datasets[entity])) return null;
  }
  return cache;
}

function fileFor(manifest: FrameworkManifest, entity: EntityName): string {
  const entry = manifest.entities.find((e) => e.entity === entity);
  if (!entry) {
    throw new FrameworkLoadError(
      "validation",
      `The framework manifest does not list the "${entity}" dataset`,
    );
  }
  return entry.file;
}

/**
 * Load the framework: cache first when the version matches, otherwise fetch and
 * validate, then cache. If the manifest cannot be fetched but a cache exists, the
 * cache is used so the app still works offline after a first successful load.
 */
export async function loadFramework(
  options: LoadOptions = {},
): Promise<FrameworkData> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const entities = options.entities ?? CORE_ENTITIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const useCache = options.useCache ?? true;

  if (typeof fetchImpl !== "function") {
    throw new FrameworkLoadError(
      "network",
      "No fetch implementation is available",
    );
  }

  // Fetch the manifest. A transport or parse failure (origin unreachable or not
  // returning JSON) may fall back to a cached snapshot so the app still works
  // offline after a first successful load. A VALIDATION failure (the origin
  // served valid JSON in the wrong shape) is a real integrity signal, not a
  // transport problem, so it is never masked by the cache — it propagates.
  let rawManifest: unknown;
  try {
    rawManifest = await fetchJson(MANIFEST_URL, fetchImpl, timeoutMs);
  } catch (err) {
    const cached = useCache ? readCache(entities) : null;
    if (cached) {
      return buildFromCache(cached.version, cached.primaryFields, cached.datasets);
    }
    throw err instanceof FrameworkLoadError
      ? err
      : new FrameworkLoadError("network", "Could not load the framework", err);
  }

  if (!isManifest(rawManifest)) {
    throw new FrameworkLoadError(
      "validation",
      "The framework manifest is not in the expected shape",
    );
  }
  const manifest: FrameworkManifest = rawManifest;

  // Cache hit: same version and all requested entities present.
  if (useCache) {
    const cached = readCache(entities);
    if (cached && cached.version === manifest.version) {
      return buildFromCache(cached.version, cached.primaryFields, cached.datasets);
    }
  }

  // Cache miss: fetch and validate each requested dataset.
  const datasets: RawDatasets = {};
  for (const entity of entities) {
    const url = `${BASE}/${fileFor(manifest, entity)}`;
    const raw = await fetchJson(url, fetchImpl, timeoutMs);
    if (!isRecordArray(raw)) {
      throw new FrameworkLoadError(
        "validation",
        `The "${entity}" dataset is not in the expected shape`,
      );
    }
    datasets[entity] = raw;
  }

  if (useCache) {
    const primaryFields: Record<string, string> = {};
    for (const entity of entities) {
      const entry = manifest.entities.find((e) => e.entity === entity);
      if (entry) primaryFields[entity] = entry.primaryField;
    }
    userStore.set<FrameworkCache>(CACHE_KEY, {
      version: manifest.version,
      primaryFields,
      datasets,
    });
  }

  return buildFrameworkData(manifest, datasets);
}

let session: Promise<FrameworkData> | null = null;

/** Load once per session and reuse. Clears itself on failure so a retry refetches. */
export function getFramework(options?: LoadOptions): Promise<FrameworkData> {
  if (!session) {
    session = loadFramework(options).catch((err) => {
      session = null;
      throw err;
    });
  }
  return session;
}
