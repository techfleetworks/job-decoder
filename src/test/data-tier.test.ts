/**
 * Discriminating tests for the framework data tier (T11, ADR-0022, ADR-0008). The
 * snapshot build is spawned over planted fixtures, the same way the architecture and
 * BDD gates are tested: clean data must build, and data that breaks an integrity rule
 * must fail the build. A gate that stops detecting turns these red.
 */
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = "pipeline/build-snapshot.mjs";

type Rec = Record<string, unknown>;

// A tiny but complete and internally consistent framework: one of each entity, all
// links resolving, the function and duty agreeing. Integrity passes on this.
function cleanFixture(): Record<string, Rec[]> {
  return {
    "job-functions.json": [
      {
        id: 1,
        slug: "designer",
        "Job Function": "Designer",
        "Associated Duties": [{ slug: "design", label: "Design" }],
        "Required Tools": [{ slug: "figma", label: "Figma" }],
        "Other Job Titles You May See in the World": "product designer",
        "Job Function Description": "Designs things.",
      },
    ],
    "duties.json": [
      {
        id: 1,
        slug: "design",
        "Duty Name": "Design",
        "Associated Team Function": [{ slug: "designer", label: "Designer" }],
        "Unique Required Tools": [{ slug: "figma", label: "Figma" }],
        "Duty Description": "The design duty.",
      },
    ],
    "activities.json": [
      { id: 1, slug: "wireframing", "Activity Name": "Wireframing", "Who's Responsible?": [{ slug: "design", label: "Design" }] },
    ],
    "deliverables.json": [
      { id: 1, slug: "mockup", "Deliverable Name": "Mockup", "Duty Who Owns the Deliverable": [{ slug: "design", label: "Design" }] },
    ],
    "tools.json": [{ id: 1, slug: "figma", "Tool Name": "Figma" }],
    "skills.json": [],
  };
}

const temps: string[] = [];
function writeFixture(files: Record<string, Rec[]>): string {
  const dir = mkdtempSync(join(tmpdir(), "data-tier-"));
  temps.push(dir);
  for (const [name, value] of Object.entries(files)) {
    writeFileSync(join(dir, name), JSON.stringify(value, null, 2));
  }
  return dir;
}
afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

function build(dataDir: string): { code: number; output: string; out: string } {
  const out = join(dataDir, "out");
  mkdirSync(out, { recursive: true });
  try {
    const stdout = execFileSync(
      "node",
      [SCRIPT, "--source=local", `--data=${dataDir}`, `--out=${out}`],
      { encoding: "utf8" },
    );
    return { code: 0, output: stdout, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}`, out };
  }
}

describe("snapshot build", () => {
  it("builds the read model from clean framework data", () => {
    const { code, out } = build(writeFixture(cleanFixture()));
    expect(code).toBe(0);
    expect(existsSync(join(out, "manifest.json"))).toBe(true);
    expect(existsSync(join(out, "titles.json"))).toBe(true);
    expect(existsSync(join(out, "items.json"))).toBe(true);
    expect(existsSync(join(out, "functions", "designer.json"))).toBe(true);

    const manifest = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"));
    expect(manifest.upstreamSha).toBeTruthy();
    expect(manifest.contentHash).toMatch(/^[0-9a-f]{16}$/);
    expect(manifest.counts.functions).toBe(1);
  });
});

describe("integrity gate fails the build", () => {
  it("fails on a dangling link (R1)", () => {
    const files = cleanFixture();
    // wireframing is Responsible-linked to a duty that does not exist.
    files["activities.json"]![0]!["Who's Responsible?"] = [{ slug: "ghost", label: "Ghost" }];
    const { code, output } = build(writeFixture(files));
    expect(code).toBe(1);
    expect(output).toContain("R1");
    expect(output).toContain("does not exist");
  });

  it("fails when a function and duty disagree (R2)", () => {
    const files = cleanFixture();
    // The function still lists the duty, but the duty no longer points back.
    files["duties.json"]![0]!["Associated Team Function"] = [];
    const { code, output } = build(writeFixture(files));
    expect(code).toBe(1);
    expect(output).toContain("R2");
  });

  it("fails when a referenced skill has no Skill Type (R4)", () => {
    const files = cleanFixture();
    // The duty requires a skill that exists but has no Skill Type.
    files["duties.json"]![0]!["Skills Required For the Duty"] = [{ slug: "design", label: "Design" }];
    files["skills.json"] = [{ id: 1, slug: "design", "Skill Name": "Design" }];
    const { code, output } = build(writeFixture(files));
    expect(code).toBe(1);
    expect(output).toContain("R4");
  });
});
