# ADR-0025: Match against all framework items; an AI-only match needs a quote and counts as similar

- Status: Accepted (2026-11-01)
- Deciders: Morgan (mdenner@techfleet.org)
- Amends: ADR-0007 and ADR-0010 (candidate scope), ADR-0018 (steps 3 and 4),
  ADR-0022 (read model), ADR-0019 (harness rule for AI quotes).
- Source: the v1 audit of the requirements against the prototype (blockers B1 and
  B2), Notion page "v1 Audit: Requirements vs Prototype (2026-11-01)".

Note: ADRs 0005 through 0018 live on branch `docs/adr-0005-mvp1-scope`, not yet
merged, so they are referenced here by number.

## Context

The audit found two rules that disagreed or did not exist:

1. **What the matcher compares a posting against.** ADR-0019 matches against every
   framework activity, deliverable, and tool. ADR-0007, ADR-0010, ADR-0018, ADR-0022,
   and ticket T03 say the decode reads only the resolved job function's own items.
   Built that way, a posting could never surface a hat outside that job function,
   so the "non-standard" set (and the extra-scope parts of resume prep) would always
   be empty.
2. **A match found only by the AI.** No requirement said which tier it gets or
   whether it needs a quote. The harness keeps an AI match even when it has no quote,
   and labels it "exact". The prototype labels the same kind of match "Similar".

## Decision (Morgan, 2026-11-01)

1. **Match against all framework items.** The matcher compares the posting against
   every framework activity, deliverable, and tool, across all job functions. The
   resolved job function is used to classify hats (covered, hidden, non-standard),
   not to narrow matching. The build publishes a shared index of all items alongside
   the per-function slices (ADR-0022).
2. **An AI-only match needs a verbatim quote and counts as similar.** A match the AI
   proposes is kept only if its item exists in the framework and it quotes the
   posting word for word. A proposal with no quote is dropped. A kept match that only
   the AI found is shown at the similar tier, ranked after exact and alias. When the
   keyword matcher also finds the same item, the stronger keyword tier is kept.

## Consequences

- Non-standard hats and extra-scope prep can work as specified.
- The receipt never shows a match without the posting's own words, and never labels
  an AI recognition as an exact keyword hit.
- The AI prompt grows to the full candidate list (about 221 items), which ADR-0019
  already found affordable in one call.
- **Honest limit:** "similar" now covers two sources (the keyword similar rule and
  AI recognition), so the receipt does not say which one found a similar match.
  Morgan chose this over a separate "AI-recognized" label.
- Code change owed: `eval/lib/openrouter.mjs` must drop quote-less AI matches and
  set their tier to similar (audit B2b, ticket T12).

## Alternatives considered

- **Match only the title's job function.** Smaller prompt, but non-standard hats
  could never appear. Rejected.
- **Label AI-only matches "AI-recognized".** Clearer about the source; Morgan chose
  "Similar" instead.
- **Keyword matching only in v1.** Lower recall; rejected.
