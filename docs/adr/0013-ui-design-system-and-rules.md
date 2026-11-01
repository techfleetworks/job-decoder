# ADR-0013: UI design system and interface rules

- Status: Accepted (2026-10-31). Builds on [ADR-0006](0006-three-tier-architecture.md) (which named Material UI).
- Deciders: Morgan (mdenner@techfleet.org)
- Reference: low-fi black-and-white wireframes at https://claude.ai/artifact/JkdiffYJbJrLWefWb76KvV

## Context

The v1 wireframes set the interface conventions, chosen with the usability and
accessibility skills. Recorded here so the build follows them rather than
re-deciding per screen.

## Decision

- **Design system: Material UI.** Components come from MUI; the theme (palette,
  type scale, spacing) is configured once and every screen uses it. No hand-rolled
  component where MUI has one; no color typed straight into a component (read the
  theme).
- **Information hierarchy.** Exactly one H1 per screen, then H2 and H3 for
  subheadings. Body text is 20px (1em = 20px). No eyebrows or decorative kickers
  above headings.
- **One primary action per screen.**
- **One result part per screen.** The results step through parts (the verdict,
  then each hat set) with a stepper (MUI `MobileStepper`), not a stack of
  accordions, so the person focuses on one part at a time.
- **Stack content vertically.** Never cram runs of distinct items onto one line
  with separators; stack them.
- **Plain language and action labels.** Every state is designed: input, working,
  results, and the AI-unavailable fallback.
- **Accessibility: WCAG 2.2 AA** (labels, visible focus, 44px targets, meaning
  never conveyed by color alone), per universal-accessibility-wcag.

## Consequences

- A consistent, scannable, accessible UI; the wireframes are the reference.
- Fidelity (the MUI palette, motion) is applied in the build, against these rules;
  the wireframes stay grayscale and low-fi on purpose.

## Verify

- The accessibility gate (axe + the combined checklist) and a judge-arch review.
- An architecture-gate rule that forbids literal colors in components (theme tokens
  only), with a discriminating test.

## Alternatives considered

- **A stack of accordions for results.** Rejected by Morgan: it fights focus; one
  part per screen via a stepper is clearer.
- **Hand-rolled components / another design system.** Rejected: Material UI is the
  committed system.
