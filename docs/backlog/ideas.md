# Hat Check — backlog ideas (post-MVP)

Durable log of product/engine improvements raised during work, to triage later.
Not committed scope; each item needs Morgan's prioritization and (where it changes
engine semantics) an ADR.

---

## 1. Surface the unmatched remainder of a matched hat — "what you may also be responsible for"

**Raised:** 2026-11-03 (while modeling the proportional hat-match threshold).

**Idea:** When a posting matches enough of a hat to "have" it (e.g. ≥33% of the
hat's activities and deliverables under the proportional rule), the results should
also show the job seeker the **unmatched remainder** of that hat — the other ~66% of
its activities and deliverables that the posting did *not* name — framed as **"what
you may also be responsible for."** Whatever did not match should be *uncovered* to
the user, not hidden.

**Why it matters:** Today the decode shows only what the posting states. A posting
is a partial, self-serving description of a role; the framework knows the *full*
scope of each hat. Showing the gap turns Hat Check from "what this posting says" into
"the real shape of the job you'd be doing," which is the product's whole premise
(cutting through how companies under- or mis-describe roles). It warns the seeker
about duties the employer left out.

**How it fits the current design:**
- The per-hat full item list already exists: `buildPrepGuide` (ADR-0024) composes
  each hat's skills, activities, deliverables, and tools. This feature is largely a
  **presentation** of matched vs. unmatched within that existing data, not new
  framework plumbing.
- It pairs naturally with the proportional threshold (matched/total per hat): the
  same denominator that decides "has the hat" also yields the "remainder to surface."
- Decode output would need, per matched hat, the split: `matched[]` vs
  `unmatched[]` activities and deliverables. That is a small addition to the decode
  result shape (and a consumer/UI change on the results screen).

**Open questions (Morgan's call):**
- Show the remainder only for *matched* hats, or also for *missing* standard hats
  (the hats the title implies but the posting omitted entirely)?
- Cap how many unmatched items are shown (some hats own 20+ items)?
- Does this change the title-fit score, or is it purely informational?

**Depends on:** the hat-match threshold decision (integer vs proportional; AND vs OR;
the cutoff value) — because "matched enough to show the remainder" is defined by that
same rule.
