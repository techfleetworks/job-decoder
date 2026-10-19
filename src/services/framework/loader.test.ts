import { beforeEach, describe, expect, it } from "vitest";
import { FrameworkLoadError, loadFramework } from "./loader";
import { getRecord } from "../../domain/framework/resolver";
import { ENTITY } from "../../domain/framework/types";
import { fixtureDatasets, fixtureManifest } from "../../test/fixtures/framework";

/** A fake fetch that serves payloads by URL suffix and records what it fetched. */
function makeFetch(
  payloads: Record<string, unknown>,
  calls: string[] = [],
): typeof fetch {
  return (async (url: string | URL) => {
    const href = String(url);
    calls.push(href);
    const key = Object.keys(payloads).find((k) => href.endsWith(k));
    if (!key) {
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }
    return { ok: true, status: 200, json: async () => payloads[key] } as Response;
  }) as unknown as typeof fetch;
}

const PAYLOADS: Record<string, unknown> = {
  "manifest.json": fixtureManifest,
  "job-functions.json": fixtureDatasets["job-functions"],
  "duties.json": fixtureDatasets.duties,
};

const ENTITIES = [ENTITY.jobFunctions, ENTITY.duties] as const;

beforeEach(() => {
  localStorage.clear();
});

describe("loadFramework", () => {
  it("fetches, validates, and indexes the framework", async () => {
    const data = await loadFramework({
      fetchImpl: makeFetch(PAYLOADS),
      entities: [...ENTITIES],
    });
    expect(data.version).toBe("test-v1");
    expect(getRecord(data, ENTITY.jobFunctions, "ux-designer")?.id).toBe(1);
  });

  it("serves a second load from cache without refetching datasets", async () => {
    const calls: string[] = [];
    const fetchImpl = makeFetch(PAYLOADS, calls);
    await loadFramework({ fetchImpl, entities: [...ENTITIES] });
    const afterFirst = calls.filter((u) => u.endsWith("duties.json")).length;
    expect(afterFirst).toBe(1);

    await loadFramework({ fetchImpl, entities: [...ENTITIES] });
    const afterSecond = calls.filter((u) => u.endsWith("duties.json")).length;
    expect(afterSecond).toBe(1); // dataset not refetched; only the manifest was
  });

  it("refetches datasets when the cache is disabled", async () => {
    const calls: string[] = [];
    const fetchImpl = makeFetch(PAYLOADS, calls);
    await loadFramework({ fetchImpl, entities: [...ENTITIES], useCache: false });
    await loadFramework({ fetchImpl, entities: [...ENTITIES], useCache: false });
    expect(calls.filter((u) => u.endsWith("duties.json")).length).toBe(2);
  });

  it("rejects a malformed manifest as a validation error", async () => {
    const fetchImpl = makeFetch({ "manifest.json": { nope: true } });
    await expect(
      loadFramework({ fetchImpl, entities: [...ENTITIES] }),
    ).rejects.toMatchObject({ kind: "validation" });
  });

  it("rejects a malformed dataset as a validation error", async () => {
    const fetchImpl = makeFetch({
      "manifest.json": fixtureManifest,
      "job-functions.json": [{ id: 1 }], // missing slug
      "duties.json": fixtureDatasets.duties,
    });
    await expect(
      loadFramework({ fetchImpl, entities: [...ENTITIES] }),
    ).rejects.toMatchObject({ kind: "validation" });
  });

  it("reports a network failure as a FrameworkLoadError", async () => {
    const failing = (async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    const err = await loadFramework({
      fetchImpl: failing,
      entities: [...ENTITIES],
      useCache: false,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(FrameworkLoadError);
    expect(err.kind).toBe("network");
  });

  it("does not mask a malformed live manifest with a warm cache", async () => {
    // First load warms the cache with a good snapshot.
    await loadFramework({ fetchImpl: makeFetch(PAYLOADS), entities: [...ENTITIES] });

    // The origin now serves valid JSON in the wrong shape. That is an integrity
    // signal, not a transport failure, so it must surface, not be hidden by cache.
    const badShapeFetch = makeFetch({
      "manifest.json": { nope: true },
      "job-functions.json": fixtureDatasets["job-functions"],
      "duties.json": fixtureDatasets.duties,
    });
    await expect(
      loadFramework({ fetchImpl: badShapeFetch, entities: [...ENTITIES] }),
    ).rejects.toMatchObject({ kind: "validation" });
  });

  it("falls back to cache when the manifest cannot be refetched", async () => {
    const calls: string[] = [];
    await loadFramework({ fetchImpl: makeFetch(PAYLOADS, calls), entities: [...ENTITIES] });

    // Manifest now unreachable, but the cache from the first load remains.
    const failing = (async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    const data = await loadFramework({ fetchImpl: failing, entities: [...ENTITIES] });
    expect(data.version).toBe("test-v1");
    expect(getRecord(data, ENTITY.jobFunctions, "ux-designer")?.id).toBe(1);
  });
});
