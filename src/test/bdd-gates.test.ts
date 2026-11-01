/**
 * Discriminating tests for the BDD gate suite (verifiable-quality-gates). Each gate
 * is run against planted-bad fixtures (must fail) and a clean fixture (must pass),
 * so a gate that stops detecting goes red here.
 */
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function run(script: string, args: string[]): { code: number; output: string } {
  try {
    const stdout = execFileSync("node", [script, ...args], { encoding: "utf8" });
    return { code: 0, output: stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const temps: string[] = [];
function base(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "bdd-gate-"));
  temps.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}
afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

const AUDIENCES = JSON.stringify({ audiences: ["job-seeker"] });
const GOOD_FEATURE = `@audience:job-seeker
Feature: A sample feature
  @usecase:do-a-thing @category:happy @quality:functional @severity:high
  Scenario: The happy path works
    When a thing happens
    Then it works
  @usecase:do-a-thing-bad @category:error @quality:functional @severity:high
  Scenario: The error path is handled
    When a thing fails
    Then it reports
`;

function genIndex(root: string) {
  run("scripts/gen-bdd-index.mjs", [root]);
}

describe("check-gherkin-valid", () => {
  it("passes on a valid feature", () => {
    const root = base({ "features/x/good.feature": GOOD_FEATURE });
    expect(run("scripts/check-gherkin-valid.mjs", [root]).code).toBe(0);
  });
  it("fails on invalid Gherkin", () => {
    const root = base({ "features/x/bad.feature": "This is not gherkin at all\nScenario without a feature\n" });
    const r = run("scripts/check-gherkin-valid.mjs", [root]);
    expect(r.code).toBe(1);
    expect(r.output).toContain("invalid");
  });
});

describe("check-bdd-tags", () => {
  it("passes when every scenario is fully tagged in-vocabulary", () => {
    const root = base({ "features/audiences.json": AUDIENCES, "features/x/good.feature": GOOD_FEATURE });
    expect(run("scripts/check-bdd-tags.mjs", [root]).code).toBe(0);
  });
  it("fails on a missing @severity", () => {
    const f = `@audience:job-seeker
Feature: F
  @usecase:u @category:happy @quality:functional
  Scenario: no severity
    When x
    Then y
`;
    const root = base({ "features/audiences.json": AUDIENCES, "features/x/f.feature": f });
    const r = run("scripts/check-bdd-tags.mjs", [root]);
    expect(r.code).toBe(1);
    expect(r.output).toContain("@severity");
  });
  it("fails on an undeclared @audience", () => {
    const f = GOOD_FEATURE.replace("@audience:job-seeker", "@audience:ghost");
    const root = base({ "features/audiences.json": AUDIENCES, "features/x/f.feature": f });
    expect(run("scripts/check-bdd-tags.mjs", [root]).code).toBe(1);
  });
});

describe("check-bdd-coverage", () => {
  it("passes on a complete, in-sync feature set", () => {
    const root = base({
      "features/audiences.json": AUDIENCES,
      "features/x/good.feature": GOOD_FEATURE,
      "features/bdd-coverage-log.md": "# log\n\n## entry\n",
    });
    genIndex(root);
    expect(run("scripts/check-bdd-coverage.mjs", [root]).code).toBe(0);
  });
  it("fails when a feature has only happy-path scenarios", () => {
    const happyOnly = `@audience:job-seeker
Feature: Happy only
  @usecase:u @category:happy @quality:functional @severity:low
  Scenario: only happy
    When x
    Then y
`;
    const root = base({
      "features/audiences.json": AUDIENCES,
      "features/x/h.feature": happyOnly,
      "features/bdd-coverage-log.md": "# log\n",
    });
    genIndex(root);
    const r = run("scripts/check-bdd-coverage.mjs", [root]);
    expect(r.code).toBe(1);
    expect(r.output).toContain("happy-path");
  });
  it("fails when the datastore is out of sync", () => {
    const root = base({
      "features/audiences.json": AUDIENCES,
      "features/x/good.feature": GOOD_FEATURE,
      "features/bdd-coverage-log.md": "# log\n",
    });
    genIndex(root);
    writeFileSync(join(root, "features/bdd-index.json"), '{"scenarios":[]}\n');
    const r = run("scripts/check-bdd-coverage.mjs", [root]);
    expect(r.code).toBe(1);
    expect(r.output).toContain("out of sync");
  });
  it("fails when the coverage log is missing", () => {
    const root = base({ "features/audiences.json": AUDIENCES, "features/x/good.feature": GOOD_FEATURE });
    genIndex(root);
    const r = run("scripts/check-bdd-coverage.mjs", [root]);
    expect(r.code).toBe(1);
    expect(r.output).toContain("log");
  });
});

describe("check-bdd-executed", () => {
  function reportWith(status: string): string {
    return JSON.stringify([
      {
        name: "A sample feature",
        elements: [
          { name: "The happy path works", type: "scenario", steps: [{ keyword: "When ", name: "a thing happens", result: { status: "passed" } }, { keyword: "Then ", name: "it works", result: { status } }] },
          { name: "The error path is handled", type: "scenario", steps: [{ keyword: "When ", name: "a thing fails", result: { status: "passed" } }, { keyword: "Then ", name: "it reports", result: { status: "passed" } }] },
        ],
      },
    ]);
  }
  it("passes when every scenario ran and passed and the count matches", () => {
    const root = base({ "features/audiences.json": AUDIENCES, "features/x/good.feature": GOOD_FEATURE, "reports/cucumber-report.json": reportWith("passed") });
    genIndex(root);
    expect(run("scripts/check-bdd-executed.mjs", [root]).code).toBe(0);
  });
  it("fails when a step did not pass", () => {
    const root = base({ "features/audiences.json": AUDIENCES, "features/x/good.feature": GOOD_FEATURE, "reports/cucumber-report.json": reportWith("failed") });
    genIndex(root);
    const r = run("scripts/check-bdd-executed.mjs", [root]);
    expect(r.code).toBe(1);
    expect(r.output).toContain("not passed");
  });
  it("fails when a scenario in the datastore did not run (count mismatch)", () => {
    const shortReport = JSON.stringify([
      { name: "A sample feature", elements: [{ name: "The happy path works", type: "scenario", steps: [{ keyword: "When ", name: "a thing happens", result: { status: "passed" } }] }] },
    ]);
    const root = base({ "features/audiences.json": AUDIENCES, "features/x/good.feature": GOOD_FEATURE, "reports/cucumber-report.json": shortReport });
    genIndex(root);
    const r = run("scripts/check-bdd-executed.mjs", [root]);
    expect(r.code).toBe(1);
    expect(r.output).toContain("every scenario must run");
  });
});
