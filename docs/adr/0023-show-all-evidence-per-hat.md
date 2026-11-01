# ADR-0023: Show all relevant evidence per hat, not one example

- Status: Accepted
- Date: 2026-11-01
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: ADR-0007 (grounded LLM matching), ADR-0014 (validation + unplaced
  lines), ADR-0021 (Responsible roll-up).
- Refines: ADR-0013 (UI rules): accordions may expand a hat's full evidence within a
  results step; the MobileStepper stays the results nav.

Note: ADRs 0005 through 0018 live on branch `docs/adr-0005-mvp1-scope`, not yet
merged, so they are referenced here by number.

## Context

The decode keeps a verbatim posting quote on every match (ADR-0007, ADR-0014) and
rolls each match up to its Responsible hat (ADR-0021). The results view was being
designed to show a single example quote per hat (one per results section). One
example reads as weak evidence: a hat the posting describes in four different lines
looks the same as one matched in passing, and the reader cannot see the full basis
for the verdict.

## Decision

For every hat shown in the result, show **all** of its relevant matched quotes, not
one example.

- Each hat lists every matched posting quote that rolled up to it, strongest first:
  exact, then alias, then similar.
- Each quote is paired with the framework item it matched (and its tier/source).
- This is the complete breakdown. A single representative quote is not enough.
- It is a display rule. The matcher already records a quote on every match, so no
  pipeline change is needed; the union and roll-up already produce the full set per
  hat.
- Accordions carry the full list per hat, so a hat with many quotes stays scannable
  (one hat expands to all its evidence).

## Consequences

- The evidence is as strong as the data: the reader sees the full basis for each hat
  and the verdict, not a sample.
- A hat matched by many lines reads as better-evidenced than one matched once, which
  is the honest signal.
- Receipts get longer; the accordions and the strongest-first ordering keep them
  readable.
- **Honest limit:** showing every match surfaces weak (similar-tier) matches too.
  They are ordered last and labeled by tier so the reader can weigh them; they are
  not hidden.

## Alternatives considered

- **One example quote per hat (the prior design):** compact, but it understates the
  evidence and hides how well-supported a hat is. Rejected: the evidence is the
  product.
- **Top-N quotes per hat:** cleaner, but an arbitrary cap silently drops real
  evidence, which contradicts the coverage-audit promise that every line is
  accounted for. Rejected.
