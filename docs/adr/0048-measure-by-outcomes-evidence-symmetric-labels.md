# ADR-0048: Measure matching by accuracy, visibility, precision; bind both the system and the labels to evidence

- Status: Accepted
- Date: 2026-11-10
- Deciders: Morgan (mdenner@techfleet.org)
- Refines: [ADR-0047](0047-vocabulary-finds-meaning-confirms.md) (vocabulary finds, meaning confirms). Builds on [ADR-0014](0014-receipt-visible-misses-union-matching.md) (receipt, visible misses), [ADR-0007](0007-grounded-llm-matching.md) / [ADR-0037](0037-live-llm-recognizer-in-decode.md) (grounded recognizer).
- Tracks ticket: T24.

## Context

ADR-0047 added meaning-confirmation and said the negative fixtures "measure the false-positive rate." A row-by-row review of the deliverable errors (F1 at 81%) surfaced two problems that ADR-0047 did not account for.

**The labels are a source of false reporting, not just the system.** Most of the deliverable "errors" were the model being right and the ground truth being wrong. The model reported a correctly-named artifact the label had omitted (a label gap counted as a false positive), or the label claimed an artifact the posting never names, so the model correctly did not report it (a label error counted as a false negative). The clearest case: Project Manager, "build the schedule" — the model reported `project-plan` (counted a false positive) and missed `gantt-chart` (counted a false negative), but "schedule" is named once and "gantt chart" is never named. One shaky label manufactured two fake errors. So a false negative is not the same as an over-labeled item: a false negative means the artifact was named and the system missed it; an over-labeled item was never named and the system was right to skip it. Conflating them lets the ground truth lie while the number blames the system.

**A single blended F1 hides the outcomes that matter.** From the user's standpoint the outcomes are accuracy (is the read true), visibility (is the whole job surfaced, including hidden work), and precision (no misleading noise). These trade against each other, and averaging them into one F1 hides the trade.

## Decision

1. **Measure by the three user outcomes, not one blended F1.**
   - **Precision** — confirmed false-positive rate, including the out-of-domain negative fixtures: the read never asserts work that is not there.
   - **Visibility** — recall on named-but-paraphrased items, plus the implied heads-up: the whole job is surfaced.
   - **Accuracy** — closest-role and decipher correctness.
   Each is tuned on purpose; the tension is managed, not averaged away.

2. **Bind the labels to evidence, symmetric with the recognizer.** The recognizer already cannot report a match without a verbatim quote from the posting. Apply the identical rule to the ground truth: an expected deliverable must record the verbatim phrase in the posting that names it (`expected.deliverableEvidence`), and a deterministic check (`check:fixture-evidence`) verifies that phrase is present. A label that claims an unnamed artifact fails the check. This makes label-manufactured false reporting structurally catchable, the same way the quote rule makes fabricated matches impossible.

3. **Decompose every error into a class and drive each to its floor:**
   - Fabrication, out-of-framework item, non-verbatim quote → **structurally zero** (enforced, ADR-0007/0037).
   - Unconfirmed shared-word match counted as confident → **structurally impossible** (mechanism B, ADR-0047: confident means recognizer-confirmed).
   - Label-manufactured miss or gap → **structurally catchable** (the evidence guard, this ADR) plus the human label review.
   - Paraphrase recall miss → **near-zero** via deterministic translator-table aliases.
   - Genuine semantic judgment → the **irreducible residual**, kept small, shown as evidence, overridable.

4. **The guarantee the user sees:** no reported item without its evidence (quote or matched term), and no silently dropped line (unplaced lines are shown, ADR-0014). Unevidenced reporting and hidden misses are structurally impossible on both sides. Whether a given quote truly *means* the item is still human judgment, but it is never hidden and always one action to override.

## Consequences

- The deliverable F1 was overstating error because the ground truth was noisy. After the label review (ADD gaps, REMOVE unnamed, ALIAS paraphrases) plus mechanism B, the true residual on the current set is about one. The eval becomes trustworthy only once the labels are evidence-bound.
- The evidence guard adds a required `deliverableEvidence` field to fixtures and a deterministic check. It fits the "CI stays deterministic" decision (ADR context from the T12 parking): it is label-integrity, not an accuracy threshold, so it can gate without flaking or calling a model.
- **Honest limits.** The guard enforces that a naming phrase *exists and is verbatim*, not that it *semantically names* the item — that last step is the human judgment that cannot be structuralized. It removes unevidenced labels, not all label disagreement. "Infallible semantics" stays out of reach; "no unevidenced or hidden report" is the ceiling, and it is reached. The error decomposition is from a single nondeterministic eval run, so the exact rows shift; the classes are stable.

## Alternatives considered

- **Keep a single blended F1.** Rejected: it hides the three outcomes and averages precision against visibility, so neither can be tuned on purpose.
- **Guard only the system, not the labels.** Rejected: the review shows the labels are themselves a false-reporting source; guarding one side while the other lies does not make reporting trustworthy.
- **Fully automate "is it named?"** Rejected: that is the semantic judgment that cannot be made structural. The guard checks that evidence is present and verbatim; a human owns the naming call.

## Verify (Confirmation)

- `check:fixture-evidence --self-test` proves the check discriminates: a fixture whose expected deliverable has no verbatim naming phrase fails; a well-evidenced one passes.
- `check:fixture-evidence` run over the real fixtures fails until every expected deliverable records its naming phrase, so the guard is armed by the label review rather than asserted.
- The negative out-of-domain fixtures (ADR-0047) track the confirmed false-positive rate.
- A unit test asserts mechanism B keeps unconfirmed matches out of the confident count.
