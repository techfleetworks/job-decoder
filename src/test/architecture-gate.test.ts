/**
 * Discriminating test for the mechanical architecture gate
 * (verifiable-quality-gates): it proves the gate actually detects the violations
 * it claims to. It runs the real CLI — against the live source tree (must pass)
 * and against planted violations (must fail). If someone neutralizes the gate so
 * it stops detecting, these cases fail.
 */
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GATE = "scripts/check-architecture.mjs";

function runGate(root?: string): { code: number; output: string } {
  try {
    const stdout = execFileSync("node", [GATE, ...(root ? [root] : [])], {
      encoding: "utf8",
    });
    return { code: 0, output: stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const temps: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "archgate-"));
  temps.push(root);
  for (const [rel, contents] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, contents);
  }
  return root;
}

afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

describe("mechanical architecture gate", () => {
  it("passes on the real source tree", () => {
    const { code, output } = runGate();
    expect(code).toBe(0);
    expect(output).toMatch(/PASS/);
  });

  it("flags localStorage used in the domain layer", () => {
    const root = fixture({
      "domain/thing.ts": "export const v = localStorage.getItem('k');\n",
    });
    const { code, output } = runGate(root);
    expect(code).toBe(1);
    expect(output).toContain("domain-purity");
  });

  it("flags fetch used outside the loader", () => {
    const root = fixture({
      "components/Widget.tsx":
        "export async function go() { return fetch('/api'); }\n",
    });
    const { code, output } = runGate(root);
    expect(code).toBe(1);
    expect(output).toContain("fetch-owner");
  });

  it("flags localStorage used outside the storage service", () => {
    const root = fixture({
      "pages/Page.tsx": "export const v = window.localStorage.getItem('k');\n",
    });
    const { code, output } = runGate(root);
    expect(code).toBe(1);
    expect(output).toContain("localStorage-owner");
  });

  it("allows the declared owners and pure domain code", () => {
    const root = fixture({
      "domain/pure.ts": "export const add = (a: number, b: number) => a + b;\n",
      "services/storage/localStore.ts":
        "export const read = () => globalThis.localStorage.getItem('k');\n",
      "services/framework/loader.ts":
        "export const load = () => fetch('/manifest.json');\n",
    });
    expect(runGate(root).code).toBe(0);
  });

  it("does not flag prose that merely mentions a term", () => {
    const root = fixture({
      // The words appear only in a comment and a string, not as real usage.
      "domain/notes.ts":
        "// this module never touches localStorage or fetch\nexport const msg = 'no fetch here';\n",
    });
    expect(runGate(root).code).toBe(0);
  });
});
