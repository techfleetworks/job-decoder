# ADR-0044: Reading screen with a cancel for a running decode

- Status: Accepted
- Date: 2026-11-04
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0013](0013-ui-design-system-and-rules.md) (the UI design system and one primary action per screen), [ADR-0038](0038-wcag-2.2-aa-conformance-and-focus-management.md) (focus management on view changes), [ADR-0043](0043-decode-rate-limiting.md) (the decode route and its failure reasons).

## Context

The design-fidelity audit (gap C1, now ticket T18) found the app had no Reading screen: while a
decode ran, the input form only swapped its submit button label to "Reading the posting…" and
exposed a hidden live region. The Figma prototype has a dedicated Reading screen (frame 04), a
"still working" state for slow decodes (04b), and a Cancel control. A user who submitted a long
posting saw only a changed button label for several seconds, could not tell working from stuck,
and could not abandon the attempt without reloading and re-pasting.

## Decision

1. **A dedicated Reading screen.** While a decode is in flight, `DecodeFlow` renders `Reading`
   instead of the input form. `Reading` owns an `<h1>` "Reading the posting", a `role="status"`
   `aria-live="polite"` region with a `CircularProgress` (marked `aria-hidden`, so the text is the
   announced progress, not the spinner), and a Cancel button. Focus moves to the heading on mount
   (ADR-0038), so a screen-reader user hears the state change.

2. **Still-working threshold.** After `SLOW_AFTER_MS` (8s) the status text changes to a reassuring
   "still working" message. The threshold is a module constant in `Reading`, and the decode is not
   interrupted — only the copy changes.

3. **Cancel aborts the request.** `DecodeFlow` holds an `AbortController` per submit and passes its
   signal to `decodePosting` (tier-1 client). Cancel calls `abort()`, clears the working state, and
   remounts the input form seeded with the last submitted title and posting (`initialTitle` /
   `initialPosting`), so the person returns to their input intact. `decodePosting` **re-throws**
   `AbortError` rather than mapping it to a failure, so a deliberate cancel is never shown as an
   error screen; every other throw still maps to the `error` reason.

4. **No cancelled decode can land (race).** After the awaited request resolves, `handleSubmit`
   returns early if `controller.signal.aborted`, so a request that resolves in the brief window
   after Cancel never calls `setResult`. Cancel always wins.

## Consequences

- The app matches the prototype's Reading / still-working / Cancel flow; the input screen no longer
  carries any "working" state (it was removed from `InputForm`).
- Dependency direction holds: the abort is presentation state in tier 1; the client wrapper stays a
  thin, pure-over-`fetch` translator; no business rule moved into a view.
- Error handling is explicit: a cancel is re-thrown (reported as a cancel), a failure is mapped to
  the `error` reason (reported on its own screen), and the resolve-after-cancel race is closed — no
  swallowed outcome.
- The behavior is pinned by tests that fail closed: the client contract by a cucumber `@decode`
  feature and a vitest unit suite, and the screen interactions (focus, still-working threshold,
  cancel-restores-input, and the no-race guard) by vitest component tests, all blocking in CI.
