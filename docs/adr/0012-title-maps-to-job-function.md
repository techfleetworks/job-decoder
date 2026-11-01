# ADR-0012: A title maps directly to a job function; the app never asks the user to disambiguate

- Status: Accepted (2026-10-31). Supersedes rule 5 of [ADR-0008](0008-framework-data-model-integrity.md).
- Deciders: Morgan (mdenner@techfleet.org)

## Context

Morgan: the app must "do the math against the skills and practices framework and
tell the user whether the title fits the description," and "job function == title."
ADR-0008 rule 5 had the app ask the person to choose when a title mapped to several
job functions. Morgan rejected putting that decision on the user.

## Decision

- A job title resolves **directly** to its job function (job function == title).
  There is no disambiguation step and the app never asks the user to pick.
- The output the user wants is the computed **title-fit verdict** (does this title
  fit this posting), plus the three hat sets and the match score, all from SPF.
- Where a title string could map to more than one function, resolution is
  deterministic (exact match on the job-function name first). That is a build-time
  data decision, not a runtime question to the user.

## Consequences

- One fewer screen; no decision pushed onto the person. The "which role?" wireframe
  is removed.
- A title that truly cannot resolve is a coverage-honesty case (handled inline, if
  kept), not a disambiguation prompt.
- The ADR-0008 observation that four title strings overlap several functions still
  holds; it is now resolved in data and code, not by asking the user.

## Verify

Title resolution is a deterministic function with fixture tests over the title set,
including the previously-ambiguous strings, each asserting one resolved function.

## Alternatives considered

- **Ask the user to disambiguate (ADR-0008 rule 5).** Rejected by Morgan: the app
  does the math; it does not interrogate the user.
