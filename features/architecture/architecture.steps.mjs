import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runGate(root) {
  try {
    const output = execFileSync(
      "node",
      ["scripts/check-architecture.mjs", ...(root ? [root] : [])],
      { encoding: "utf8" },
    );
    return { code: 0, output };
  } catch (err) {
    return { code: err.status ?? 1, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "bdd-arch-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

Given("a client file that reads a server-only secret", function () {
  this.root = fixture({
    "app/page.tsx":
      "export const k = process.env.OPENROUTER_API_KEY;\nexport default function P() { return null; }\n",
  });
  this.expectRule = "browser-no-secret";
});

Given("a client file that imports the Supabase database client", function () {
  this.root = fixture({
    "app/page.tsx":
      "import { createClient } from '@supabase/supabase-js';\nexport default function P() { return createClient('u', 'k'); }\n",
  });
  this.expectRule = "browser-no-db-client";
});

Given("a client file that uses localStorage", function () {
  this.root = fixture({
    "src/data/store.ts": "export const v = localStorage.getItem('k');\n",
  });
  this.expectRule = "session-only";
});

Given("a component file with a hex color literal", function () {
  this.root = fixture({
    "src/components/Box.tsx":
      "export const C = () => <div style={{ color: '#ff0000' }} />;\n",
  });
  this.expectRule = "no-literal-color";
});

Given("a server-tier route that reads a secret", function () {
  this.root = fixture({
    "app/api/decode/route.ts":
      "export const POST = () => process.env.OPENROUTER_API_KEY;\n",
  });
});

When("the architecture gate runs on the project", function () {
  this.result = runGate();
});

When("the architecture gate runs", function () {
  this.result = runGate(this.root);
});

Then("it passes", function () {
  assert.equal(this.result.code, 0, this.result.output);
});

Then("it is allowed", function () {
  assert.equal(this.result.code, 0, this.result.output);
});

Then("it fails with the matching violation", function () {
  assert.equal(this.result.code, 1, `expected a failure; got:\n${this.result.output}`);
  assert.ok(
    this.result.output.includes(this.expectRule),
    `expected rule "${this.expectRule}" in output:\n${this.result.output}`,
  );
});

After(function () {
  if (this.root) {
    try {
      rmSync(this.root, { recursive: true, force: true });
    } catch (err) {
      console.warn(`fixture cleanup failed: ${err.message}`);
    }
  }
});
