# ADR-0040: Per-hat detail in the decode result (display-only "what it takes")

- Status: Accepted
- Date: 2026-11-04
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0021](0021-responsible-rollup.md) (the Responsible roll-up), [ADR-0023](0023-show-all-evidence-per-hat.md) (evidence per hat), [ADR-0028](0028-decode-engine-and-route.md) (the decode domain and the two twins), [ADR-0039](0039-proportional-hat-scoring.md) (match levels and the result shape), [ADR-0029](0029-result-screens.md) (the result screens).

## Context

The ADR-0029 / Figma prototype shows each matched hat as a card with three accordions:
**Evidence**, **Why it matters**, and **What it takes**. The design-fidelity audit
(`docs/audit/2026-11-04-design-vs-code-fidelity-audit.md`, gap A4) found the app's hat cards
carried only the name, share, and evidence quotes. "Why it matters" and "What it takes" had
no code counterpart, because the decode result's `ScoredHat` carried only `{slug, name,
description, score, scoreWhole, level}` — not the hat's framework activities, deliverables,
and tools.

"Why it matters" is already available: it is the hat's `description` (its plain-language
purpose). "What it takes" is the hat's framework work — the activities, deliverables, and
tools that roll up to it — which is present in the shared item index (`SnapshotItem[]`) the
classifier already receives, but was not surfaced on the result.

## Decision

1. Add an optional **`detail`** field to `ScoredHat`:

   ```ts
   interface HatDetail { activities: string[]; deliverables: string[]; tools: string[]; }
   interface ScoredHat extends Hat { /* …score, level… */ detail?: HatDetail; }
   ```

   `detail` holds display-ready labels aggregated from the items that roll up to the hat
   (same roll-up as scoring, ADR-0021). The result screen renders "What it takes" from it and
   "Why it matters" from the hat's `description`.

2. `classify` computes `detail` for every standard hat (covered and missing) via a pure
   `detailOf(items, slug)` helper. It is derived at read time from the items already passed
   in — no new decode input, no I/O.

3. **`detail` is display-only and NOT part of scoring.** The score and the match level are
   unchanged; `detail` touches neither numerator nor denominator. Therefore the two decode
   twins (ADR-0028) still agree on everything the scoring contract covers. The build-time
   twin (`eval/lib/decode.mjs`) measures accuracy against score and level and does **not** need
   to compute `detail`; the field being optional keeps the twins consistent on the scored
   shape. Tools remain excluded from scoring (ADR-0039); they appear in `detail` only as
   informational "what it takes" content, never as a reason a hat scored.

## Consequences

- The hat card can show all three prototype accordions, closing audit gap A4, with no change
  to the decode route's inputs and no change to the scoring.
- The result is slightly larger (each standard hat carries three string lists). The result is
  session-only (ADR-0011), so this is a display-time cost, not storage or transport at scale.
- The storage-shape guard (`isDecodeResult`) is unaffected: `detail` is optional, so a scan
  saved before this change still validates and simply shows no "What it takes" until re-decoded.
- Skills are intentionally **not** in `detail`: item skills are slugs that need the skills map
  to name, and skills are already surfaced in the prep flow; keeping `detailOf` a pure
  aggregation over the items avoids a new dependency. A later ADR can add named skills if the
  design calls for them on the card.
