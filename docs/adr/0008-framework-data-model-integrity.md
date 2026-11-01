# ADR-0008: Framework data model and integrity rules

- Status: Accepted (2026-10-31). **Rule 5 (ambiguous-title disambiguation) superseded by [ADR-0012](0012-title-maps-to-job-function.md):** the app resolves a title directly to its job function and never asks the user to disambiguate.
- Deciders: Morgan (mdenner@techfleet.org)
- Relates to: [ADR-0006](0006-three-tier-architecture.md), [ADR-0007](0007-grounded-llm-matching.md), [ADR-0009](0009-security-resilience-quality-gates.md)
- Evidence: measured against the framework clone at commit `636635a` (combined content hash `9072373e7186a04b`)

## Context

A skeptical audit of the specs this session found that "relate all records by
slug" (Technical Requirements §6, Backend spec §4) is underspecified and, taken
literally, wrong, and that the data has shapes the specs did not account for. All
figures below are `observed` from a full parse of the pinned clone:

- **183 slugs occur in more than one entity.** A slug alone does not identify a
  record; `wireframing` is both an activity and a duty's task reference.
- **3 of 18 duties have zero activities:** `ux-user-experience-strategy`,
  `account-management`, and `everyone`. `everyone` also has no team functions; it
  is not a real role hat.
- **4 real-world titles map to more than one job function**, e.g. "product
  designer" to three. Picking "the best" silently is a guess.
- **10 of 18 duties have no "Job Titles in the World" value**, so that field is a
  partial signal, not the primary one.
- Consulted/Informed RACI "tasks" are mostly activities owned by **other** duties
  (Consulted 799/808, Informed 1602/1700 are not in the duty's own activity list).

## Decision

The data-source layer enforces these rules; the build fails closed when data
violates them, so a wrong join can never reach a user.

1. **Resolve every link by (entity, slug), never slug alone.** The snapshot build
   resolves each link field to a typed reference using the entity that field is
   known to point at. A link that resolves to zero or more than one entity fails
   the build.
2. **One owner per fact.** The job-function-to-duty relationship is stored once
   (on the job function). The build recomputes the duty side and fails if the two
   disagree. They agree today (37 pairs).
3. **Degenerate duties.** `everyone` is excluded; it is not a role hat. A duty with
   zero activities (`ux-user-experience-strategy`, `account-management`) is kept as
   a standard ("expected") hat for its titles, but the matcher may not report it as
   "written" in a posting, because it has no evidence phrases to match on. This
   bounds the known recall gap instead of hiding it.
4. **Match evidence per hat is the duty's OWN activities and tasks**, not its
   Consulted/Informed references to other duties' activities. Including those would
   make a duty match on text describing a different duty.
5. **Ambiguous titles are never auto-resolved.** When a title maps to more than one
   job function, the domain returns the candidate set and the person chooses. An
   uncovered title is reported plainly with the supported list. The app never
   guesses a baseline (coverage honesty).
6. **Title resolution signal order:** job function names and "Other Job Titles You
   May See in the World" (53 synonyms) first; duty "Job Titles in the World" as a
   secondary signal where present.
7. **Pin by commit, stamp every result.** The manifest version string ("v1") never
   changes, so the snapshot is pinned to the upstream commit SHA, and every result
   records the SHA that produced it. Data refreshes daily upstream; the app moves
   only when the pin moves.

## Consequences

- Wrong joins, drifted copies, and silent title guesses become build failures or
  explicit user choices, not quiet bad answers.
- The recall limit on the two empty duties is stated and bounded, not denied.
- These rules are `documented` now. They become `proven` when the build-time
  validator exists with a discriminating test (ADR-0009, verifiable-quality-gates):
  the test feeds data that breaks each rule and requires the build to fail.

## Alternatives considered

- **"Relate by slug" as written.** Rejected: 183 collisions make it ambiguous.
- **Drop the two empty duties entirely.** Rejected: they are still standard hats a
  title expects; dropping them would under-report the "expected but missing" set.
- **Auto-pick the best job function for an ambiguous title.** Rejected: it is a
  guess, and this product's trust rests on not guessing.
