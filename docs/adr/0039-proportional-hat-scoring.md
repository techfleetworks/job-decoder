# ADR-0039: Proportional per-hat scoring; tools excluded from hat membership

- Status: Accepted (decision made; code owed, see below)
- Date: 2026-11-04
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0008](0008-framework-data-model-integrity.md) (the `everyone` duty is excluded; the zero-activity duties are expected-only), [ADR-0015](0015-entity-relationships-matching-granularity.md) (per-hat counts), [ADR-0016](0016-item-to-duty-resolution-raci.md) / [ADR-0021](0021-responsible-rollup.md) (roll-up and the tool clause), [ADR-0018](0018-mvp1-business-logic.md) (business logic, steps 8 to 11), [ADR-0023](0023-show-all-evidence-per-hat.md) (evidence per hat), [ADR-0028](0028-decode-engine-and-route.md) (the decode domain), [ADR-0029](0029-result-screens.md) (the result screens).
- Amends: ADR-0015 (counts become a proportional score), ADR-0018 (steps 8 to 11), ADR-0021 (tools no longer confer a hat), ADR-0023 (hats are grouped by match level), ADR-0029 (the result screens group by match level).

## Context

The rule to date (ADR-0015, ADR-0018 steps 10 to 11): a hat is "covered" (standard) or
"added" (non-standard) if **one or more** matched items roll up to it, where a matched
item is an activity, a deliverable, **or a tool**. There is no minimum, no weighting, and
a tool counts the same as an activity.

On the real Indeed Product Manager posting, decoded live, this produced **9 added hats**,
several resting on a single signal. One match of the tool "Figma" conferred four UX hats
(UX Design, UX Research, UX Writing, Graphic Design); two of those existed only because
"Figma" appeared. The headline title-fit answer was right, but the list of hats around it
was noisy, and a single generic tool could create a whole hat. The root cause is written
up in the 2026-11-03 skeptical audit (`docs/audit/2026-11-03-pm-decode-skeptical-audit.md`):
the "has the hat" threshold is one item, and tools count.

Morgan decided a posting should "have" a hat only when it names a meaningful **share** of
that hat's real work, and that tool mentions are too vague to concretely match a hat's
work, so they should not confer a hat at all.

## Decision

1. **Score each hat by the share of its real work the posting names:**

   `score = (distinct matched activities + distinct matched deliverables for the hat) / (that hat's total framework activities + deliverables)`

   Both the numerator and the denominator count the activities and deliverables that
   roll up to the hat under the **Responsible** rule (ADR-0021), computed the same way,
   so the share is always between 0 and 100%. An activity Responsible for several duties
   counts toward each of them.

2. **Match level per hat** (replacing the covered/added/missing boolean):
   - **full**: score is **0.25 or more** (25%).
   - **partial**: score is above 0 but under 0.25.
   - **none**: no matched activities or deliverables roll up to the hat; it is not shown.

3. **Tools do not count toward hat membership or the score**, in the numerator or the
   denominator. This supersedes the tool roll-up clause carried from ADR-0016 into
   ADR-0021. Tools may still be shown as supporting evidence; whether to display them at
   all is deferred (see Open decisions).

4. **The universal `everyone` duty is excluded entirely** from scoring. ADR-0008 rule 3
   marks `everyone` a degenerate duty, but the matcher today can still surface it as a
   non-standard hat (the live run put "Creating Presentations" under `everyone`). This
   rule enforces the exclusion in scoring, so `everyone` never scores, standard or
   non-standard.

5. **The overall title-fit percentage uses Formula D** over the title's standard hats:

   `title-fit = (full standard hats x 1 + partial standard hats x 0.5) / (count of all standard hats)`

   The verdict thresholds are **unchanged**: strong at 60% or more, partial at 25% or
   more, mismatch below 25% (ADR-0018 step 11).

6. **The 25% full threshold is locked** (not a tunable starting value like the prior
   verdict bands). The 0.5 partial weight in Formula D is a fixed value of this decision.

### Worked example (illustrative)

A live DeepSeek decode of the Indeed Product Manager posting, scored under this rule
(activities and deliverables only, tools excluded, `everyone` dropped):

| Hat | Matched (act / del) | Share | Match level |
| --- | --- | --- | --- |
| Product Ownership | 2 / 1 | 3 of 11 = 27% | full |
| Business Analysis | 2 / 1 | 3 of 27 = 11% | partial |
| Project Management | 0 / 1 | 1 of 9 = 11% | partial |
| Product Management | 2 / 1 | 3 of 30 = 10% | partial |
| UX Research | 3 / 0 | 3 of 41 = 7% | partial |
| UX Design | 1 / 0 | 1 of 24 = 4% | partial |

The standard hats of the Product Manager function are **Product Management** (10%, partial)
and **Account Management** (0%, none). Formula D gives title-fit = (0 + 0.5) / 2 = **25%**,
a partial fit. Of the 11 job functions, only **Business Analyst** has a single standard
hat; Formula D reports a lone partial there as 50% (partial), where the rejected Option B
would have reported 100% (strong).

## Consequences

- "Covered" changes meaning: from "any item rolls up" to "reaches full (25% or more)." Each
  hat in the decode result now carries a **score and a match level**, not a boolean.
- Tool-only hats (UX Writing and Graphic Design from "Figma" in the example) can no longer
  appear, because a tool confers no hat.
- The change touches **both** copies of the decode, which must stay in step: the
  request-time TypeScript domain (`src/domain/decode`, ADR-0028) and the build-time eval
  harness (`eval/lib/decode.mjs`, ADR-0019). The accuracy gate (T12) runs the eval fixtures
  so the two cannot drift silently.
- The result screens (ADR-0029) change from three boolean sets (covered / missing /
  non-standard) to hats grouped by match level (full, then partial), with each hat's share
  shown.
- The eval scorer (`eval/lib/score.mjs` and its consumers) reads match levels, so a labeled
  fixture should carry an expected **level** per standard hat, not just presence.
- **Honest limit:** the worked numbers come from one live, non-deterministic run on a
  posting that is not yet hand-labeled. The scoring rule is deterministic given a matched
  set, but the matched set is not. Matching accuracy stays not-assessed until the posting is
  hand-labeled and added to the eval set (T12).
- **Denominator note:** three hats own zero deliverables and several own few items, so a
  hat's size (its denominator) is read from the framework. A hat with a small denominator
  reaches full on fewer matches; that is intended, because the rule measures the share of
  the role the posting names, not an absolute count. A one-item hat therefore goes full on
  a single matched item, which is correct: that item is its whole scope.
- **Count source to confirm in code:** ADR-0008 describes `ux-user-experience-strategy`
  and `account-management` as zero-activity duties, while the Responsible roll-up used
  here counts a few items for them (UX Strategy 4 activities, Account Management 1). The
  denominator must be read from the same roll-up as the numerator; T-prop-1 confirms the
  per-hat totals against the framework so the number is settled in code, not assumed.

## Alternatives considered

- **Keep the one-item rule (status quo).** Rejected: one match, even a generic tool,
  confers a whole hat, which is the noise this ADR removes.
- **Count 5 or more activities AND 5 or more deliverables.** Rejected as infeasible: most
  hats in the framework can never reach it, and three hats own zero deliverables, so they
  could never qualify.
- **Count N or more activities OR deliverables (flat integer).** Rejected: a flat count is
  size-blind. Three of twenty-five items is only 12% of a large hat yet would pass, while
  three of three fully covers a small one.
- **Overall title-fit, Option A (count full hats only).** Rejected: on the example it gives
  0% (mismatch), too brutal a swing from a genuine product role.
- **Overall title-fit, Option B (count any match as covered).** Rejected: it reintroduces
  "any mention counts" at the overall level, the exact thing the per-hat rule removes, and a
  single-standard-hat function (Business Analyst) turns any partial into a 100% strong fit.
- **Overall title-fit, Option C (average of per-hat shares).** Rejected: because no hat
  reaches far past 27%, every title-fit number collapses into single digits, forcing a
  rebuild of the strong/partial/mismatch thresholds.
- **Overall title-fit, Option D (weighted: full x 1, partial x 0.5).** Chosen: it honors the
  per-hat rule (a partial is half a fit, not a whole one) without A's brutal zero or C's
  threshold rebuild, and keeps the existing 60% / 25% thresholds.

## Open decisions (owner: Morgan)

- Whether tools still **display** as supporting evidence under a hat, or are dropped from the
  matching output entirely. The rationale for excluding them from scoring ("too vague")
  could support either; not decided here.

## Code owed (documentation-first; nothing built yet, per Morgan)

- **T-prop-1:** proportional classification in `src/domain/decode` (TypeScript) and
  `eval/lib/decode.mjs` (the build-time twin).
- **T-prop-2:** the decode result shape carries a per-hat score and match level in place of
  the covered/missing boolean.
- **T-prop-3:** the result screens group hats by match level and show the share (ADR-0029).
- **T-prop-4:** `eval/lib/score.mjs` reads match levels; labeled fixtures carry an expected
  level per standard hat.

## Verify

- Unit tests on the pure scorer: a hat at exactly 25% is full, 24.9% is partial, 0 is none;
  a roll-up from a tool alone yields none; the `everyone` duty never scores.
- A Formula D test: full x 1 + partial x 0.5 + none x 0 over the standard hats; a
  one-standard-hat function with a single partial computes to 50% (partial).
- The eval harness reproduces the per-hat scores on a labeled fixture, and the TypeScript
  domain and the `.mjs` twin agree on the same fixtures (the T12 accuracy gate).
