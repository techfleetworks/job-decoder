import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSnapshot } from "../../pipeline/build-snapshot.mjs";
import { contentHash } from "../../pipeline/lib/hash.mjs";

const temps = [];

// A tiny, internally consistent framework: every link resolves and the function and
// duty agree. Integrity passes on this; each failure scenario mutates one field.
function cleanFixture() {
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
  };
}

function writeFixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "bdd-data-"));
  temps.push(dir);
  for (const [name, value] of Object.entries(files)) {
    writeFileSync(join(dir, name), JSON.stringify(value, null, 2));
  }
  return dir;
}

function outDir() {
  const dir = mkdtempSync(join(tmpdir(), "bdd-out-"));
  temps.push(dir);
  mkdirSync(dir, { recursive: true });
  return dir;
}

When("the snapshot is built from the pinned framework data", async function () {
  this.snap = await buildSnapshot({ source: "local", out: outDir() });
});

Then("it produces a title index, an item index, and a slice for every job function", function () {
  assert.ok(Object.keys(this.snap.titles.titles).length > 0, "title index is empty");
  assert.ok(Array.isArray(this.snap.items) && this.snap.items.length > 0, "item index is empty");
  assert.equal(
    Object.keys(this.snap.functionSlices).length,
    this.snap.titles.functions.length,
    "one slice per function",
  );
});

Then("the manifest records the pinned commit and a content hash", function () {
  assert.ok(this.snap.manifest.upstreamSha, "no upstream SHA");
  assert.match(this.snap.manifest.contentHash, /^[0-9a-f]{16}$/);
});

Given("framework data with a link to a record that does not exist", function () {
  const files = cleanFixture();
  files["activities.json"][0]["Who's Responsible?"] = [{ slug: "ghost", label: "Ghost" }];
  this.dataDir = writeFixture(files);
});

Given("framework data where a function and its duty disagree on their link", function () {
  const files = cleanFixture();
  files["duties.json"][0]["Associated Team Function"] = [];
  this.dataDir = writeFixture(files);
});

When("the snapshot build runs on that data", async function () {
  try {
    await buildSnapshot({ source: "local", out: outDir(), dataDir: this.dataDir });
    this.error = null;
  } catch (err) {
    this.error = err;
  }
});

Then("the build fails with an integrity violation", function () {
  assert.ok(this.error, "expected the build to fail");
  assert.match(this.error.message, /integrity gate failed/);
});

When("the content hash is computed over the same data in two different orders", function () {
  const a = { duty: [{ slug: "x" }, { slug: "y" }], tool: [{ slug: "t" }] };
  const b = { tool: [{ slug: "t" }], duty: [{ slug: "y" }, { slug: "x" }] };
  this.hashA = contentHash(a);
  this.hashB = contentHash(b);
});

Then("the two hashes are equal", function () {
  assert.equal(this.hashA, this.hashB);
});

When("the data tier migration is read", function () {
  this.sql = readFileSync("supabase/migrations/0001_spf_framework.sql", "utf8").toLowerCase();
});

Then("row-level security is on for every framework table", function () {
  assert.ok(this.sql.includes("spf_release enable row level security"), "RLS missing on spf_release");
  assert.match(this.sql, /spf_record\s+enable row level security/, "RLS missing on spf_record");
});

Then("no policy grants the anon or authenticated role access", function () {
  assert.ok(!this.sql.includes("create policy"), "a policy exists; the tables are not deny-by-default");
});

After(function () {
  while (temps.length) {
    try {
      rmSync(temps.pop(), { recursive: true, force: true });
    } catch (err) {
      console.warn(`fixture cleanup failed: ${err.message}`);
    }
  }
});
