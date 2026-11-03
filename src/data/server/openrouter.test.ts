import { afterEach, describe, expect, it, vi } from "vitest";
import { recognizeMatches } from "./openrouter";
import type { SnapshotItem } from "@/domain/decode/types";

const items: SnapshotItem[] = [
  { slug: "wireframing", type: "activity", label: "Wireframing", aliases: [], duties: ["ux-design"] },
];
const posting = "You will build wireframes for new features.";

function okResponse(matches: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({ matches }) } }] }),
  } as unknown as Response;
}

function parseBody(fetchMock: ReturnType<typeof vi.fn>) {
  const init = fetchMock.mock.calls[0]![1] as RequestInit;
  return JSON.parse(init.body as string);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("recognizeMatches", () => {
  it("returns [] without calling the network when no key is configured", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const matches = await recognizeMatches(items, posting);

    expect(matches).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the validated matches on a successful call", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okResponse([{ type: "activity", slug: "wireframing", quote: "build wireframes" }]));
    vi.stubGlobal("fetch", fetchMock);

    const matches = await recognizeMatches(items, posting);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ slug: "wireframing", via: ["llm"] });
  });

  it("pins the request to the US provider allow-list with no fallback and data collection denied", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(okResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await recognizeMatches(items, posting);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const body = parseBody(fetchMock);
    expect(body.model).toBe("deepseek/deepseek-v4.1-flash-1017");
    expect(body.provider).toEqual({
      data_collection: "deny",
      only: ["deepinfra"],
      allow_fallbacks: false,
    });
    // The key rides in the header, never in the URL or the logged body.
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer test-key" });
  });

  it("honors OPENROUTER_MODEL and OPENROUTER_PROVIDERS overrides", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_MODEL", "anthropic/claude-3.5-haiku");
    vi.stubEnv("OPENROUTER_PROVIDERS", "together, fireworks");
    const fetchMock = vi.fn().mockResolvedValue(okResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await recognizeMatches(items, posting);

    const body = parseBody(fetchMock);
    expect(body.model).toBe("anthropic/claude-3.5-haiku");
    expect(body.provider.only).toEqual(["together", "fireworks"]);
  });

  it("still denies data collection when no allow-list is set, with no only/fallback keys", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_PROVIDERS", "   ");
    const fetchMock = vi.fn().mockResolvedValue(okResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await recognizeMatches(items, posting);

    const body = parseBody(fetchMock);
    expect(body.provider).toEqual({ data_collection: "deny" });
  });

  it("degrades to [] when the call rejects (recognizer unavailable)", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const matches = await recognizeMatches(items, posting);

    expect(matches).toEqual([]);
  });

  it("degrades to [] on a non-ok HTTP response", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 } as Response));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const matches = await recognizeMatches(items, posting);

    expect(matches).toEqual([]);
  });
});
