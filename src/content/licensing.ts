/**
 * Single source of truth for licensing and attribution text.
 *
 * The framework data is CC BY 4.0 and attribution is REQUIRED wherever the
 * data is shown (Handoff requirements, section 4). Every place that displays
 * framework data must render `FRAMEWORK_ATTRIBUTION` rather than hand-copying
 * the credit line, so the wording stays correct in exactly one place.
 */

export const FRAMEWORK_ATTRIBUTION = {
  creditLine:
    "The Skills & Practices Framework by Tech Fleet, licensed under CC BY 4.0.",
  licenseName: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  sourceUrl:
    "https://github.com/techfleetworks/skills-and-practices-framework",
} as const;

export const APP_LICENSE = {
  name: "MIT License",
  summary: "This application's own code is released under the MIT License.",
  sourceUrl: "https://github.com/techfleetworks/job-decoder",
} as const;
