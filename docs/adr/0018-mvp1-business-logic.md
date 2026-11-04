# ADR-0018: The complete MVP 1 business logic (numbered)

- Status: Accepted (2026-10-31). Consolidates the decode logic from ADR-0005, 0007, 0008, 0010, 0012, 0014, 0015, 0016, and 0017.
- Deciders: Morgan (mdenner@techfleet.org)
- Amended by [ADR-0039](0039-proportional-hat-scoring.md): steps 8 to 11 change — tools no longer roll up to a hat, the per-duty counts become a proportional per-hat score, classification is full / partial / none at the 25% line, and the title-fit percentage uses Formula D (full x 1 + partial x 0.5, over the standard hats).

## Context

Morgan asked for every line of the app's business logic written out, and for the
UI "How it works" panel to show the same numbered list. This ADR is the integrated,
authoritative list. Where a line summarizes an earlier ADR, that ADR governs the
detail of its own topic; this one is the single place to read the whole decode. The
UI panel must stay in step with this list.

## Decision: the business logic, in order

1. The user enters a job title and pastes one job posting. No account; state is
   session-only, in the browser session, with no saved history (ADR-0005, ADR-0011).
2. The app resolves the title to one job function (title = job function). It never
   asks the user to disambiguate; if the title is not covered, it says so
   (ADR-0012, ADR-0008).
3. From the framework (a pinned snapshot), it loads that job function's standard
   duties (hats) and each duty's activities, deliverables, and tools (ADR-0008,
   ADR-0015).
4. It matches the posting's wording to those activities, deliverables, and tools, by
   exact wording and by similar wording. The AI recognizes wording and a keyword
   match runs alongside; the two are unioned. The AI only proposes (ADR-0010,
   ADR-0014).
5. It validates every proposed match against the framework: the item must exist and
   its quote must appear verbatim in the posting. Anything else is dropped. Nothing
   is shown without a quote (ADR-0010, ADR-0014).
6. A "duties" or "responsibilities" list in the posting is read as activities, not
   as framework Duties. The word "duty" is never matched to a framework Duty by name
   (ADR-0016).
7. If the posting lists skills, the app does not use the skill directly. It maps the
   skill to its activity and goes off the activity (ADR-0017).
8. Each matched item rolls up to its duty: an activity or deliverable to the duty
   that is Responsible, Accountable, or Consulted for it (not Informed), with the
   RACI role recorded; a tool to the duty or function that uses it, ignored if
   nothing in scope uses it (ADR-0016).
9. It counts, per duty, how many activities, deliverables, and tools the posting
   referenced, split into exact and similar (ADR-0015).
10. It sorts the duties into three sets: in the posting and expected, expected but
    missing (the hidden hats), and in the posting but not standard. The expected set
    comes from the framework, so a missed line never hides a hidden hat (ADR-0014).
11. It computes the match percentage and the title-fit verdict from how the
    referenced duties cover the title's standard duties. Deterministic, from the
    framework (ADR-0010).
12. It shows the result one part at a time: the verdict, then each duty set with its
    counts (ADR-0013).
13. It shows a receipt: each match as the posting quote, the item and its type,
    exact or similar, and the duty and RACI role it rolls up to (ADR-0014, ADR-0016).
14. It lists the posting lines it could not place, so misses are visible, never
    silent (ADR-0014).
15. If the AI is unavailable, the keyword match against the framework is the full
    result, clearly labeled. The app degrades; it never crashes (ADR-0007, ADR-0009).
16. Everything shown comes from the framework. The AI changes no number and no
    verdict (ADR-0010).

## Consequences

- One place to read the whole decode; the UI "How it works" panel mirrors it line
  for line.
- Each line is traceable to the ADR that owns its detail, so this stays an index,
  not a competing source.

## Verify

The eval harness and the BDD scenarios exercise each numbered line; a test asserts
the UI "How it works" list matches this list (so they cannot drift).
