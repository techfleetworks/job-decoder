# ADR-0029: The input and result screens

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0013](0013-ui-design-system-and-rules.md) (UI rules), [ADR-0011](0011-session-only-state.md) (session-only), [ADR-0018](0018-mvp1-business-logic.md) (business logic), [ADR-0023](0023-show-all-evidence-per-hat.md) (evidence per hat), [ADR-0028](0028-decode-engine-and-route.md) (the decode route).
- Amended by [ADR-0039](0039-proportional-hat-scoring.md): the result groups hats by match level (full / partial / none) with each hat's share shown, in place of the three covered / missing / non-standard sets.

## Context

The decode engine and `/api/decode` exist (ADR-0028), but nothing uses them in the browser.
This ADR records the tier-1 screens (tickets T01, T02, T06 to T08): the input screen, the
result stepper with evidence, and the how-it-works panel.

## Decision

**A single client flow** (`src/components/DecodeFlow.tsx`) holds the screen state and shows
the input screen or the result. It is tier-1 presentation: it calls `/api/decode` through a
client wrapper (`src/data/decodeClient.ts`) and holds no business rules. State is
session-only (ADR-0011): the current scan lives in this tab and is restored from the session
store on reload, never saved to the device and never kept as history.

**The session store has one owner** (`src/data/session/sessionStore.ts`), the only module
the architecture gate allows to touch `sessionStorage`. Every access is guarded, so a
blocked or private-mode store degrades to in-memory state.

**The screens follow ADR-0013**: Material UI with the theme as the only source of color,
one H1 per screen, 20px body, one primary action per screen, and the result shown one part
at a time with `MobileStepper` (verdict, then each hat set), not a stack of accordions. Each
hat carries its receipt: the posting phrases that rolled up to it, with the item, its type,
and whether the wording was exact or close (ADR-0023). The how-it-works panel lists the
ADR-0018 steps in order, and a test holds it to that count so a step cannot go missing.

**It states what it does not know.** An uncovered title is reported plainly with no match
percentage and no guess (ADR-0008, ADR-0012). Until the AI recognizer (T05) ships, every
result is the keyword "basic read" and is labeled as such (ADR-0018 step 15).

**Accessibility is WCAG 2.2 AA** (ADR-0013): labelled fields, one primary action, 44px
targets from the theme, focus moved to the step heading on each step so screen-reader users
land on the new part, and meaning carried by words, not color. jest-axe tests assert the
input and result render with no violations.

## Pattern choice (pattern-selector)

- A thin **presentation layer** over the pure domain and the data wrapper, with the
  user-facing wording pulled into pure helpers (`resultSummary.ts`) so it is tested without
  rendering. Forces resolved: the components stay about layout and interaction, and the
  copy and the verdict mapping are unit-tested directly.
- Rejected: fetching and decoding inside the component (couples the UI to transport and the
  matcher, and cannot be tested without a DOM and a network).

## Security and resilience (owasp, ADR-0009)

- The browser never holds a secret or calls the database; it calls `/api/decode`, which
  bounds the input and owns the data. The client wrapper turns a failed or unreachable
  request into a plain-language message, so the UI never shows a raw error or crashes.

## Consequences

- The app is usable end to end in the browser: paste a posting, read the hats, see the
  receipt, read how it works.
- **Honest limits:**
  - Resume and application prep (T16) is a later screen, not here.
  - The receipt is shown per hat within the stepper rather than as its own screen; this
    keeps "one part per screen" for the hat sets while keeping each hat's evidence with it.
  - An uncovered title does not yet list the supported titles (the result does not carry
    them); it names a few examples. Listing the full set is a small follow-up.

## Alternatives considered

- **Separate routes per screen.** Rejected: the state is session-only and client-held, so a
  single client flow is simpler and avoids passing the scan between routes.
