import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAll,
  isAvailable,
  readJson,
  remove,
  userStore,
  writeJson,
} from "./localStore";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("localStore", () => {
  it("round-trips a JSON value", () => {
    expect(writeJson("profile", { name: "Sam", skills: ["a"] })).toBe(true);
    expect(readJson("profile", null)).toEqual({ name: "Sam", skills: ["a"] });
  });

  it("returns the fallback for a missing key", () => {
    expect(readJson("absent", "fallback")).toBe("fallback");
  });

  it("returns the fallback for a corrupt value instead of throwing", () => {
    localStorage.setItem("jobdecoder:v1:bad", "{ not json");
    expect(readJson("bad", 42)).toBe(42);
  });

  it("clearAll removes only this app's keys", () => {
    writeJson("mine", 1);
    localStorage.setItem("someone-else", "keep me");
    clearAll();
    expect(readJson("mine", null)).toBeNull();
    expect(localStorage.getItem("someone-else")).toBe("keep me");
  });

  it("remove deletes a single key", () => {
    writeJson("temp", "x");
    remove("temp");
    expect(readJson("temp", null)).toBeNull();
  });

  it("degrades to safe results when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(writeJson("x", 1)).toBe(false);
    expect(isAvailable()).toBe(false);
    // Reads still return the fallback rather than throwing.
    expect(readJson("x", "safe")).toBe("safe");
  });

  it("exposes the same behavior through the userStore facade", () => {
    expect(userStore.set("k", "v")).toBe(true);
    expect(userStore.get("k", null)).toBe("v");
    userStore.clearAll();
    expect(userStore.get("k", null)).toBeNull();
  });
});
