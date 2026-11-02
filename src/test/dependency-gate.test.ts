/**
 * Discriminating test for the dependency-scan gate (T13, verifiable-quality-gates). The
 * gate is run over planted audit fixtures: a clean report passes, an unwaived high/critical
 * fails, a current waiver passes, and an expired waiver fails. If the evaluation stops
 * detecting, these go red.
 */
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = "scripts/check-dependencies.mjs";
const temps: string[] = [];

function run(report: unknown, waivers: unknown): { code: number; output: string } {
  const dir = mkdtempSync(join(tmpdir(), "dep-gate-"));
  temps.push(dir);
  const reportPath = join(dir, "audit.json");
  const waiversPath = join(dir, "waivers.json");
  writeFileSync(reportPath, JSON.stringify(report));
  writeFileSync(waiversPath, JSON.stringify(waivers));
  try {
    const out = execFileSync("node", [SCRIPT, `--report=${reportPath}`, `--waivers=${waiversPath}`], { encoding: "utf8" });
    return { code: 0, output: out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

const CURRENT = { next: { severity: "critical", reason: "known", reviewBy: "2999-01-01" } };
const EXPIRED = { next: { severity: "critical", reason: "known", reviewBy: "2000-01-01" } };

describe("dependency gate", () => {
  it("passes when there is no high or critical advisory", () => {
    expect(run({ vulnerabilities: { lodash: { severity: "moderate" } } }, {}).code).toBe(0);
  });

  it("fails on an unwaived production high/critical advisory", () => {
    const r = run({ vulnerabilities: { evilpkg: { severity: "critical" } } }, CURRENT);
    expect(r.code).toBe(1);
    expect(r.output).toContain("evilpkg");
  });

  it("passes when the only high/critical advisories are waived and current", () => {
    expect(run({ vulnerabilities: { next: { severity: "critical" } } }, CURRENT).code).toBe(0);
  });

  it("fails when a waiver has expired", () => {
    const r = run({ vulnerabilities: { next: { severity: "critical" } } }, EXPIRED);
    expect(r.code).toBe(1);
    expect(r.output).toContain("expired");
  });
});
