/**
 * Discriminating test for the mechanical architecture gate
 * (verifiable-quality-gates, ADR-0009 Part C). It proves the gate actually detects
 * the violations it claims to, and exempts the zones it should. It runs the real CLI
 * against the live tree (must pass) and against planted violations (must fail). If
 * someone neutralizes a rule, the matching case here goes red.
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

  it("flags fetch/window used in the domain layer", () => {
    const root = fixture({
      "src/domain/thing.ts": "export const go = () => fetch('/x');\n",
    });
    const { code, output } = runGate(root);
    expect(code).toBe(1);
    expect(output).toContain("domain-purity");
  });

  it("flags a React import in the domain layer", () => {
    const root = fixture({
      "src/domain/ui.ts": "import { useState } from 'react';\nexport const x = useState;\n",
    });
    expect(runGate(root).code).toBe(1);
  });

  it("flags localStorage anywhere (session-only state)", () => {
    const root = fixture({
      "src/data/store.ts": "export const v = localStorage.getItem('k');\n",
    });
    const { code, output } = runGate(root);
    expect(code).toBe(1);
    expect(output).toContain("session-only");
  });

  it("flags IndexedDB anywhere (session-only state)", () => {
    const root = fixture({
      "app/page.tsx": "export default function P(){ indexedDB.open('db'); return null; }\n",
    });
    const { code, output } = runGate(root);
    expect(code).toBe(1);
    expect(output).toContain("session-only");
  });

  it("flags sessionStorage outside the session store owner, allows it inside", () => {
    const bad = fixture({
      "app/page.tsx": "export default function P(){ sessionStorage.setItem('a','b'); return null; }\n",
    });
    expect(runGate(bad).code).toBe(1);

    const ok = fixture({
      "src/data/session/sessionStore.ts":
        "export const set = (v: string) => sessionStorage.setItem('scan', v);\n",
    });
    expect(runGate(ok).code).toBe(0);
  });

  it("flags the Supabase client in client code, allows it on the server tier", () => {
    const bad = fixture({
      "app/page.tsx":
        "import { createClient } from '@supabase/supabase-js';\nexport default function P(){ return null; }\n",
    });
    const res = runGate(bad);
    expect(res.code).toBe(1);
    expect(res.output).toContain("browser-no-db-client");

    const ok = fixture({
      "app/api/decode/route.ts":
        "import { createClient } from '@supabase/supabase-js';\nexport const POST = () => createClient('u','k');\n",
    });
    expect(runGate(ok).code).toBe(0);
  });

  it("flags a server-only secret in client code, allows NEXT_PUBLIC_ and server reads", () => {
    const bad = fixture({
      "app/page.tsx":
        "export const k = process.env.OPENROUTER_API_KEY;\nexport default function P(){ return null; }\n",
    });
    const res = runGate(bad);
    expect(res.code).toBe(1);
    expect(res.output).toContain("browser-no-secret");

    const ok = fixture({
      "app/ok.tsx": "export const u = process.env.NEXT_PUBLIC_SITE_URL;\n",
      "app/api/decode/route.ts":
        "export const POST = () => process.env.OPENROUTER_API_KEY;\n",
    });
    expect(runGate(ok).code).toBe(0);
  });

  it("flags a literal color in a component, allows it in the theme", () => {
    const bad = fixture({
      "src/components/Box.tsx":
        "export const C = () => <div style={{ color: '#ff0000' }} />;\n",
    });
    const res = runGate(bad);
    expect(res.code).toBe(1);
    expect(res.output).toContain("no-literal-color");

    const ok = fixture({
      "src/theme/theme.ts": "export const primary = '#1b3a5b';\n",
    });
    expect(runGate(ok).code).toBe(0);
  });

  it("allows clean domain, components, and the server tier", () => {
    const root = fixture({
      "src/domain/pure.ts": "export const add = (a: number, b: number) => a + b;\n",
      "src/components/Ok.tsx":
        "import Button from '@mui/material/Button';\nexport const Ok = () => <Button>Go</Button>;\n",
      "app/api/decode/route.ts":
        "export const POST = () => new Response('ok');\n",
    });
    expect(runGate(root).code).toBe(0);
  });

  it("does not flag prose that merely mentions a term", () => {
    const root = fixture({
      "src/domain/notes.ts":
        "// this module never touches fetch or localStorage\nexport const msg = 'no fetch or localStorage here';\n",
    });
    expect(runGate(root).code).toBe(0);
  });
});
