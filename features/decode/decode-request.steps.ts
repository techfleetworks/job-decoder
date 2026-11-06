import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { decodePosting } from "../../src/data/decodeClient";

// The decode client wrapper is pure over `fetch`, so these scenarios stub a fake fetch and
// assert how each outcome is surfaced: success, a deliberate cancel (AbortError, re-thrown),
// a network failure, and a 429 rate limit. No DOM or network is touched.
function stubFetch(fn: () => Promise<unknown>) {
  globalThis.fetch = fn as unknown as typeof fetch;
}

Given("the decode endpoint will return a decoded result", function () {
  stubFetch(async () => ({ ok: true, status: 200, json: async () => ({ verdict: "strong", prepGuide: null }) }));
});

Given("the decode request is aborted in flight", function () {
  stubFetch(async () => {
    throw new DOMException("The user aborted a request.", "AbortError");
  });
});

Given("the decode endpoint cannot be reached", function () {
  stubFetch(async () => {
    throw new TypeError("Failed to fetch");
  });
});

Given("the decode endpoint responds with a 429 rate limit", function () {
  stubFetch(async () => ({ ok: false, status: 429, json: async () => ({ error: "Too many decodes." }) }));
});

When("the posting is sent to the decoder", async function () {
  this.cancelled = false;
  try {
    this.response = await decodePosting("UX Designer", "a posting");
  } catch (err) {
    this.cancelled = err instanceof DOMException && err.name === "AbortError";
    if (!this.cancelled) throw err;
  }
});

Then("the decoder returns a successful result", function () {
  assert.equal(this.response.ok, true);
});

Then("the request is surfaced as a cancel", function () {
  assert.equal(this.cancelled, true);
});

Then("the decoder reports a failure with the {string} reason", function (reason: string) {
  assert.equal(this.response.ok, false);
  assert.equal(this.response.reason, reason);
});
