# ADR-0042: Consistent app chrome — app bar, footer credit, and verdict bands in How-it-works

- Status: Accepted
- Date: 2026-11-04
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0013](0013-ui-design-system-and-rules.md) (the UI design system and the input screen rules), [ADR-0009](0009-security-resilience-quality-gates.md) (NFR-9: the CC BY credit on every screen that shows framework data), [ADR-0018](0018-mvp1-business-logic.md) (the verdict bands).

## Context

The design-fidelity audit of the prototype against the app found three global chrome gaps: no
persistent app bar (E1), the framework credit missing from the input screen (E2), and the
How-it-works dialog not stating the verdict thresholds or the framework/AI split (E3).

## Decision

1. **E1 — persistent app bar.** `DecodeFlow` renders a single MUI `AppBar` (the `banner` landmark)
   above the `main` content on every screen, with the "Hat Check" brand. The brand is a
   non-heading `span`, so each screen's own `<h1>` stays the first heading and the heading outline
   is unchanged (WCAG 1.3.1 / 2.4.6).

2. **E2 — credit on every screen.** The input screen now renders `FrameworkCredit` (the one CC BY
   component, ADR-0009 NFR-9), as the result and prep screens already do, so the attribution is on
   every screen that shows or leads to framework data.

3. **E3 — verdict bands in How-it-works.** The dialog now states the bands (strong at 60%+, partial
   at 25% to under 60%, mismatch under 25%) and that the framework decides every number and verdict
   while the AI only recognizes reworded phrases. The percentages are derived from `BANDS` (the one
   owner, ADR-0018 / ADR-0039), not retyped, so the copy cannot drift from the scorer.

## Consequences

- The app matches the prototype's global chrome; a11y landmarks improve (a `banner` plus `main`).
- The verdict thresholds shown to the person are guaranteed equal to the ones the scorer uses, by
  reading the same constant.
- No business logic moves into a view: the app bar and credit are presentation, and How-it-works
  reads a domain constant for display (the allowed view → domain direction).
