import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { decode } from "../../src/domain/decode";
import type { FunctionSlice, SnapshotItem } from "../../src/domain/decode/types";

// Small, hand-built framework, the same shape the snapshot emits. The decode domain is
// pure, so these scenarios run over fixtures with no snapshot or I/O.
const items: SnapshotItem[] = [
  { slug: "wireframing", type: "activity", label: "Wireframing", aliases: ["wireframes"], duties: ["ux-design"] },
  { slug: "user-research", type: "activity", label: "User Research", aliases: [], duties: ["ux-research"] },
  { slug: "product-roadmap", type: "deliverable", label: "Product Roadmap", aliases: [], duties: ["product-mgmt"] },
];
const slice: FunctionSlice = {
  function: { slug: "ux-designer", name: "UX Designer", description: "" },
  standardHats: [
    { slug: "ux-design", name: "UX Design", description: "" },
    { slug: "ux-research", name: "UX Research", description: "" },
  ],
};
const dutyNames: Record<string, string> = {
  "ux-design": "UX Design",
  "ux-research": "UX Research",
  "product-mgmt": "Product Management",
};

function sliceFor(title: string): FunctionSlice | null {
  return title === "UX Designer" ? slice : null;
}

Given("the title {string} and a posting that names wireframing and user research", function (title: string) {
  this.title = title;
  this.posting = "You will do Wireframing and User Research.";
  this.slice = sliceFor(title);
});

Given("the title {string} and a posting that names only wireframing", function (title: string) {
  this.title = title;
  this.posting = "You will do Wireframing.";
  this.slice = sliceFor(title);
});

Given("the title {string} and a posting that also names a product roadmap", function (title: string) {
  this.title = title;
  this.posting = "You will do Wireframing and User Research.\nAlso own the Product Roadmap.";
  this.slice = sliceFor(title);
});

Given("the title {string} and any posting", function (title: string) {
  this.title = title;
  this.posting = "You will do Wireframing.";
  this.slice = sliceFor(title);
});

Given("the title {string} and a posting with a matching line and an unrelated line", function (title: string) {
  this.title = title;
  this.posting = "You will do Wireframing.\nWe value teamwork and good coffee.";
  this.slice = sliceFor(title);
});

When("the posting is decoded", function () {
  this.result = decode({ posting: this.posting, items, slice: this.slice, dutyNames });
});

Then("both standard hats are covered", function () {
  assert.equal(this.result.covered.length, 2);
  assert.equal(this.result.missing.length, 0);
});

Then("the title-fit verdict is {string}", function (verdict: string) {
  assert.equal(this.result.verdict, verdict);
});

Then("the research hat is reported as missing", function () {
  assert.ok(this.result.missing.some((h: { slug: string }) => h.slug === "ux-research"));
});

Then("a non-standard hat is reported with its name", function () {
  assert.ok(this.result.nonStandard.length >= 1);
  assert.ok(
    this.result.nonStandard.every((h: { name: string }) => typeof h.name === "string" && h.name.length > 0),
  );
});

Then("the result is {string}", function (verdict: string) {
  assert.equal(this.result.verdict, verdict);
});

Then("no hats are covered", function () {
  assert.equal(this.result.covered.length, 0);
});

Then("every line is either matched or unplaced", function () {
  assert.equal(this.result.linesMatched + this.result.unplaced.length, this.result.linesAudited);
});
