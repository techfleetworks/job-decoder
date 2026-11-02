import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { isBasicRead, matchSummary, verdictHeadline } from "../../src/components/resultSummary";
import type { DecodeResult } from "../../src/domain/decode/types";

function result(over: Partial<DecodeResult>): DecodeResult {
  return {
    functionSlug: "ux-designer",
    functionName: "UX Designer",
    covered: [],
    missing: [],
    nonStandard: [],
    matched: [],
    pct: 0,
    pctWhole: 0,
    verdict: "partial",
    standardCount: 2,
    coverage: [],
    linesAudited: 0,
    linesMatched: 0,
    unplaced: [],
    ...over,
  };
}

Given("a strong-fit result", function () {
  this.result = result({ verdict: "strong", pctWhole: 80, covered: [{ slug: "a", name: "A", description: "" }], standardCount: 1 });
});

Given("a keyword-only result with no AI step", function () {
  this.result = result({
    matched: [{ slug: "x", type: "activity", label: "X", tier: "exact", term: "x", via: ["keyword"], duties: [] }],
  });
});

Given("a result for a title the framework does not cover", function () {
  this.result = result({ verdict: "not-covered", functionName: null, functionSlug: null });
});

When("the result is summarized for the screen", function () {
  this.headline = verdictHeadline(this.result);
  this.basic = isBasicRead(this.result);
  this.summary = matchSummary(this.result);
});

Then("the headline says the posting fits the title well", function () {
  assert.match(this.headline, /fits the title well/i);
});

Then("it is labeled a basic read", function () {
  assert.equal(this.basic, true);
});

Then("the headline says the title is not covered", function () {
  assert.match(this.headline, /do not cover/i);
});

Then("no match percentage is shown", function () {
  assert.doesNotMatch(this.summary, /%/);
});
