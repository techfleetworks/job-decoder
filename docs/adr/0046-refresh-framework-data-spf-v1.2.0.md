# ADR-0046: Refresh pinned framework data to SPF v1.2.0 (393b40a)

- Status: Accepted
- Date: 2026-11-09
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0027](0027-data-tier-pipeline-and-release-sources.md) (release sources and the integrity gate), [ADR-0010](0010-framework-source-of-truth.md) (the framework is the source of truth), [ADR-0008](0008-framework-data-model-integrity.md) (integrity rules and the content-hash pin), [ADR-0022](0022-supabase-jsonb-sliced-snapshot.md) (the JSONB plus sliced snapshot).

## Context

Hat Check vendors the Tech Fleet Skills and Practices Framework data in the repo,
pinned by an upstream commit SHA and a content hash (ADR-0027). The pin was at
`636635a`. Upstream shipped SPF v1.2.0, which merged to the framework's `main` as
`393b40a`. That release added two workshop templates (Brand Strategy and Identity,
Nonprofit Strategy Definition) and four deliverables (Mission Statement, Vision
Statement, Organizational Values, Commitment Statement).

Hat Check consumes six entities: `job-function`, `duty`, `activity`, `deliverable`,
`tool`, and `skill` ([manifest](../../pipeline/lib/manifest.mjs)). It does not consume
workshops, workshop steps, or workshop template sections. So of the v1.2.0 additions,
only the four new deliverables are in scope, together with the reverse-lookup links
they add into `activities`, `duties`, and `job-functions`. The upstream diff for the
six consumed files was: `deliverables` +672, `duties` +26, `activities` +16,
`job-functions` +24/-4; `tools` and `skills` unchanged.

Before the refresh, all six vendored files matched the framework at `636635a`
byte for byte, so this is a clean copy-forward with no local edits to preserve.

## Decision

Re-vendor the four changed files from the framework at `393b40a` and move `PINNED_SHA`
from `636635a` to `393b40a`. Rebuild the committed read-side snapshot
(`public/snapshot/`) from the new local data. Leave `tools.json` and `skills.json`
untouched, since they did not change upstream. No schema change and no code change: the
pipeline (ADR-0027) already handles this release shape.

## Evidence (skeptical-audit)

Measured on the refreshed data on 2026-11-09:

- Integrity gate (`check:snapshot-integrity`): zero R1 (unresolved link) and zero R2
  (function/duty disagreement) violations. One R3 note, `everyone` excluded as a hat,
  which is the same benign note ADR-0027 recorded; no new R3 notes.
- Content hash moved `9072373e7186a04b` (at `636635a`, per ADR-0008) to
  `a1f8fcfa87a99ff8`, so the pin and the data moved together.
- Snapshot built: 11 functions, 225 items, 53 titles.
- Full gate suite green: architecture gate PASS, `tsc --noEmit` clean, 161 tests
  passing, dependency gate PASS, lint clean.

Limitation: the production Supabase release (tier 3) is not updated by this change.
`sync:framework` must be run with the service-role credentials to load the new release
into Supabase; until then the production build still reads the previous published
release. The committed snapshot and the local build reflect the new data now.

## Consequences

- The four nonprofit-strategy deliverables are now part of the matchable framework, so
  a posting that maps to those duties and activities can surface them.
- The ADRs that cite `636635a` as point-in-time evidence (ADR-0008, ADR-0021,
  ADR-0022, ADR-0024, ADR-0027) are left unchanged; they record what was verified at
  that commit and remain accurate as history.
- The next refresh is the same three steps: re-vendor the changed files, move
  `PINNED_SHA`, rebuild the snapshot, and re-run the gate.
