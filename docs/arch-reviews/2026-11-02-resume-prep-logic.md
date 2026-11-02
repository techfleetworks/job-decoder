# Architecture review: resume-prep logic and data enrichment (T16 part 1)

- Date: 2026-11-02
- Change: `feat/resume-prep` (base `main`)
- Standard: `decisions.md`, ADR-0024, ADR-0022, ADR-0010
- Review context: fresh (general-purpose subagent, not the authoring context)
- Verdict: **2 findings (1 med, 1 low), both fixed in this change**; clean on all four questions

## Scope

The skills entity added to the data tier, the snapshot enriched with per-hat detail and a
typed skills index, the integrity R4 skill check, and the pure `buildPrepGuide` the decode
route returns. 8 code files reviewed against the four questions, every cell verdicted with
evidence; the grep battery was run.

## What the review confirmed

- `buildPrepGuide` is a pure domain function: the grep battery found no fetch, storage, DOM,
  `request`/`response`, React, `next`, or data/server imports; it takes all data as
  parameters. The ordering, dedupe, ranking, and templates live in the domain, not the
  route or a component.
- The route stays a thin adapter (validate, load, decode, build prep, respond). The snapshot
  reader is the only I/O, correctly in tier 2, throwing a typed error on a missing file.
- Nothing is invented: every output traces to a framework field, templates add only fixed
  scaffold words with blanks, and no numbers are generated (ADR-0010).
- The technical/interpersonal split uses each skill's own Skill Type, not the activity
  field, honoring the ADR warning; R4 fails the build if a referenced skill is missing or
  untyped.
- The faithfulness checks that passed: hidden-first ordering on every step, cross-hat skill
  dedupe, the outcome template, ATS dedupe once per highest group, and the interview-point
  fallback chain and non-standard framing.

## Findings (both fixed)

- **F1 (med, ADR-0024 faithfulness):** step 1 pooled foundational + matched-activity skills
  but never read the duty's "Skills Required For the Duty," so required skills could be
  dropped, there was no key/accordion distinction, and `skillsRequired` was dead data.
  **Fixed:** the pool now includes `skillsRequired`, each skill carries a `key` flag (key
  skills lead; the rest are the accordion), and `skillsRequired` has a real reader.
- **F2 (low, ADR-0024 faithfulness):** cover-letter points used only "why it matters" and
  dropped a hat with an empty "why," omitting the hat's deliverables. **Fixed:** points now
  carry the hat's deliverables and a hat is kept when it has either.

## Verification

After the fixes: `tsc --noEmit` clean, `buildPrepGuide` unit tests (11) and the route tests
pass, the BDD suite runs the 6 `@resume-prep` scenarios green (25 total), the architecture
gate and the snapshot integrity gate (including R4) pass. The machine-readable record is
appended to `docs/arch-reviews/log.jsonl`.

## Limitation

Step-1 rank (1) "skills named in the posting" is currently unreachable because skills are
not a match type (they route through activities, ADR-0017); this is noted, not a defect. The
prep screen (part 2) is a separate PR; this change delivers the logic and the data.
