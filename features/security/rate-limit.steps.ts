import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { createInMemoryRateLimitStore } from "../../src/data/server/rateLimitStore";
import { decideRateLimit, DECODE_RATE_LIMIT } from "../../src/domain/rateLimit";

// The limiter control runs over the pure decision and the store directly (no HTTP request):
// fill a client's window to the cap, then prove the next request is turned away while a
// different client is still served.

Given("a client that has used its full decode allowance in the window", async function () {
  this.store = createInMemoryRateLimitStore();
  this.key = "client-a";
  for (let i = 0; i < DECODE_RATE_LIMIT.limit; i++) {
    await this.store.hit(this.key, DECODE_RATE_LIMIT.windowSeconds);
  }
});

When("the client makes one more decode request", async function () {
  const count = await this.store.hit(this.key, DECODE_RATE_LIMIT.windowSeconds);
  this.decision = decideRateLimit(count, DECODE_RATE_LIMIT);
});

Then("the request is rejected as rate-limited", function () {
  assert.equal(this.decision.allowed, false);
  assert.ok(this.decision.retryAfterSeconds > 0);
});

Then("a different client still within its allowance is allowed", async function () {
  const count = await this.store.hit("client-b", DECODE_RATE_LIMIT.windowSeconds);
  assert.equal(decideRateLimit(count, DECODE_RATE_LIMIT).allowed, true);
});
