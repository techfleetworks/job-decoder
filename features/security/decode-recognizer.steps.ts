import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { parseRecognitions } from "../../src/domain/decode";

// The recognizer's trust boundary is the pure parseRecognitions function, so these @security
// scenarios run over it directly with no network. Each builds the model's raw content, runs
// the validation, and asserts that a hallucinated, injected, fabricated, or garbled response
// cannot add or alter a recognized item (ADR-0037).

const POSTING = "You will build wireframes and a clickable prototype for new features.";

Given("a framework with the wireframing activity", function () {
  this.items = [
    { slug: "wireframing", type: "activity", label: "Wireframing", aliases: [], duties: ["ux-design"] },
  ];
  this.posting = POSTING;
});

Given("the model returns a slug that is not in the framework", function () {
  this.content = JSON.stringify({
    matches: [{ type: "activity", slug: "grant-admin-access", quote: "build wireframes" }],
  });
});

Given("the model returns the wireframing slug but calls it a tool", function () {
  this.content = JSON.stringify({
    matches: [{ type: "tool", slug: "wireframing", quote: "build wireframes" }],
  });
});

Given("the model returns a real slug with a quote that is not in the posting", function () {
  this.content = JSON.stringify({
    matches: [{ type: "activity", slug: "wireframing", quote: "lead the entire design org" }],
  });
});

Given("the model returns a valid item carrying extra forged fields", function () {
  this.content = JSON.stringify({
    matches: [
      {
        type: "activity",
        slug: "wireframing",
        quote: "build wireframes",
        duties: ["cfo"],
        via: ["forged"],
      },
    ],
  });
});

Given("the model returns prose instead of JSON", function () {
  this.content = "I could not find anything useful in this posting.";
});

When("the recognitions are validated", function () {
  this.result = parseRecognitions(this.items, this.posting, this.content);
});

Then("no item is recognized", function () {
  assert.equal(this.result.matches.length, 0);
});

Then("the rejected slug is recorded as not in the framework", function () {
  assert.ok(this.result.dropped.some((d: { reason: string }) => d.reason === "slug-not-in-framework"));
});

Then("the rejected slug is recorded as a non-verbatim quote", function () {
  assert.ok(this.result.dropped.some((d: { reason: string }) => d.reason === "quote-not-verbatim"));
});

Then("the item is recognized with only its framework-owned fields", function () {
  assert.equal(this.result.matches.length, 1);
  const m = this.result.matches[0];
  // duties and via come from the framework item, never from the model's payload.
  assert.deepEqual(m.duties, ["ux-design"]);
  assert.deepEqual(m.via, ["llm"]);
});

Then("the decode can still fall back to the keyword-only read", function () {
  // A garbled response is reported as no-json, so the gateway returns no matches and the
  // decode runs keyword-only rather than failing.
  assert.ok(this.result.dropped.some((d: { reason: string }) => d.reason === "no-json"));
});
