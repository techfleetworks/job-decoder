// Cucumber.js configuration. Runs in strict mode, so an undefined or pending step
// is a hard failure, never a silent pass (bdd-comprehensive-testing skill). Steps are
// ESM (.mjs) for build-tooling features and TypeScript (.ts) for features that import
// the app's TypeScript domain directly; the `test:bdd` script runs cucumber under the
// tsx loader so both load.
export default {
  paths: ["features/**/*.feature"],
  import: ["features/support/**/*.mjs", "features/**/*.steps.mjs", "features/**/*.steps.ts"],
  strict: true,
  // @wip scenarios are listed in the datastore as "pending" but not executed yet;
  // a feature PR flips its scenarios live by removing @wip.
  tags: "not @wip",
  format: ["summary", "json:reports/cucumber-report.json"],
  formatOptions: { snippetInterface: "async-await" },
};
