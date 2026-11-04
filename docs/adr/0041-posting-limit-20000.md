# ADR-0041: Reconcile the posting limit to 20,000 characters

- Status: Accepted
- Date: 2026-11-04
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0035](0035-decode-input-validation-gate.md) (server-side input validation, the DoS cap), [ADR-0013](0013-ui-design-system-and-rules.md) (the input screen rules).

## Context

The prototype's input screen states a 20,000-character posting limit and counts the
characters down as the person types. The code did not match: the input field capped at
50,000 and showed no counter, and the server-side validator's `MAX_POSTING` was 50,000. The
design-fidelity audit flagged this as gap B1 (an inconsistency, not just a missing counter).

`MAX_POSTING` is the single DoS cap (ADR-0035): an oversized request is turned away before the
matcher runs. The input field and the validator should enforce the same number, and it should
be the number the product promises.

## Decision

Set `MAX_POSTING = 20_000`. The one constant is the single source of truth: the input field's
`maxLength` and its live character counter both read it, and the server-side validator rejects
anything longer. Lowering the cap only tightens the DoS limit, so it is strictly safer; no
security scenario weakens (the oversized-posting test and `@security` scenario build their
posting from `MAX_POSTING + 1`, so they continue to exercise the boundary).

## Consequences

- The input screen now matches the prototype: a 20,000 cap with a live counter.
- The server rejects postings over 20,000 (was 50,000) with the same `too-long` / 413 rule.
- No test or scenario hardcodes the old number, so the change is localized to the constant.
