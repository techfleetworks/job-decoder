# ADR-0011: Client state is session-only; no saved history, no accounts

- Status: Accepted (2026-10-31). Supersedes the local-save stance in [ADR-0005](0005-mvp1-scope-job-not-candidate.md) and the already-superseded [ADR-0001](0001-static-spa-no-backend-local-only.md).
- Deciders: Morgan (mdenner@techfleet.org)

## Context

Morgan, verbatim: "Do not save specifically on the device. use html5 sessions. do
not save state, no previous saves." Earlier docs described local save with a
saved-scans list and a clear-all action.

## Decision

- User state lives only in the browser **session** (HTML5 `sessionStorage`), for
  the life of the tab. No `localStorage`, no IndexedDB, no cross-visit persistence.
- No saved-scans history, no "clear all" screen, no accounts. Closing the tab ends
  the session and the state is gone.
- Nothing user-side is written to Supabase; the browser never connects to it
  (ADR-0006).

## Consequences

- Simpler and more private: no persistence layer to secure, migrate, or delete
  on request.
- The person cannot return to a past scan. Accepted for MVP 1.
- The "saved on device" and "clear all" wireframe screens are removed.

## Verify

An architecture-gate rule forbids `localStorage` and IndexedDB in the client; a
discriminating test plants a `localStorage` call and requires the gate to fail
(verifiable-quality-gates).

## Alternatives considered

- **Local persistence with history (the earlier plan).** Rejected by Morgan.
- **Accounts and server-side history.** Out of scope (ADR-0005, no candidate data;
  ADR-0006, no user data server-side).
