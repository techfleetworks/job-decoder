// Cucumber.js configuration. Runs in strict mode, so an undefined or pending step
// is a hard failure, never a silent pass (bdd-comprehensive-testing skill). Step
// definitions are plain ESM (.mjs) for now; a TypeScript loader is added when a
// feature's steps need to import the TypeScript domain directly.
export default {
  paths: ["features/**/*.feature"],
  import: ["features/support/**/*.mjs", "features/**/*.steps.mjs"],
  strict: true,
  // @wip scenarios are listed in the datastore as "pending" but not executed yet;
  // a feature PR flips its scenarios live by removing @wip.
  tags: "not @wip",
  format: ["summary", "json:reports/cucumber-report.json"],
  formatOptions: { snippetInterface: "async-await" },
};
