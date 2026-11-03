import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { MAX_POSTING, validateDecodeInput } from "../../src/domain/decode";

// The validator is pure, so these @security scenarios run over it directly, with no HTTP
// request. Each builds an untrusted body, runs the server-side rules, and asserts the
// request is turned away (or, for the mass-assignment case, that only the two fields bind).

Given("a decode request whose posting is longer than the allowed limit", function () {
  this.body = { title: "UX Designer", posting: "x".repeat(MAX_POSTING + 1) };
});

Given("a decode request whose posting is a number, not text", function () {
  this.body = { title: "UX Designer", posting: 123 };
});

Given("a decode request whose body is a bare array", function () {
  this.body = ["UX Designer", "Do wireframing."];
});

Given("a decode request whose posting is only whitespace", function () {
  this.body = { title: "UX Designer", posting: "   \n\t  " };
});

Given("a decode request with a valid title and posting plus an unexpected admin field", function () {
  this.body = { title: "UX Designer", posting: "Do wireframing.", isAdmin: true };
});

When("the input is validated", function () {
  this.check = validateDecodeInput(this.body);
});

Then("it is rejected as too large", function () {
  assert.equal(this.check.ok, false);
  assert.equal(this.check.reason, "too-long");
  assert.equal(this.check.status, 413);
});

Then("no decoding is attempted", function () {
  // The validator returns before any decode input is built; the failed result carries no value.
  assert.equal(this.check.ok, false);
  assert.equal("value" in this.check, false);
});

Then("it is rejected as invalid", function () {
  assert.equal(this.check.ok, false);
  assert.equal(this.check.status, 400);
});

Then("only the title and posting are accepted", function () {
  assert.equal(this.check.ok, true);
  assert.deepEqual(Object.keys(this.check.value).sort(), ["posting", "title"]);
});
