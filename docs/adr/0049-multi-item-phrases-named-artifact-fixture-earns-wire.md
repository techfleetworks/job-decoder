# ADR-0049: One phrase can name an activity and a deliverable; the named-artifact rule governs, and a failing fixture earns each wire

- Status: Accepted
- Date: 2026-11-12
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0020](0020-translator-table-alias-layer.md) (translator table is the alias source of truth), [ADR-0014](0014-receipt-visible-misses-union-matching.md) (union matching, visible misses), [ADR-0047](0047-vocabulary-finds-meaning-confirms.md) (vocabulary finds, meaning confirms), [ADR-0048](0048-measure-by-outcomes-evidence-symmetric-labels.md) (measure by outcomes, bind labels to evidence), [ADR-0028](0028-decode-engine-and-route.md) (decode twins carry one algorithm).
- Tracks ticket: multi-item-per-phrase capability.

## Context

A posting phrase often names more than one thing at once. "You will author the user stories" names the activity of writing them *and* the artifact (user story statements). Today the translator table maps "user stories" only to the activity `user-story-generation`, so the decoder reports the activity and silently misses the deliverable. The Business Analyst fixture shows this exactly: it matches the activity and records `user-story-statements` as a false negative.

Two questions had to be settled before wiring more of these.

**Does multi-item need an engine change? No.** The recognizer already returns multiple items per quote and the scorer counts per slug (ADR-0014, and the fixtures `_labeling_rule` note). A single phrase appearing in both an activity alias list and a deliverable alias list is matched independently against each. So "multi-item per phrase" is expressed purely as translator-table data, not code.

**Can the SPF relationship graph drive it? No.** Walking an activity to its "Associated Deliverables" over-generates. Of 106 corpus-present activity phrases, 43 fan out to three to seven deliverables ("intake" to seven, "specifications" to six). Auto-adding those would assert artifacts the posting never names, the exact false reporting ADR-0048 is built to stop. The graph proposes candidates; it does not authorize them.

The corpus (934 postings, word-bounded frequency) was mined for phrases that name an artifact in words unlike the deliverable's label, so the exact tier misses them and only the activity alias exists. The precision-first finding: the real gap is narrow, and most graph-proposed candidates are traps where the activity is mentioned but the artifact is not named.

## Decision

1. **A phrase may map to more than one framework item (multi-item), expressed as data, not code.** The phrase keeps its activity alias and gains a deliverable alias; the matcher already returns both. No change to `match` in either twin.

2. **The named-artifact rule governs which deliverable a phrase earns.** A phrase maps to a deliverable when it either (a) names that artifact as a noun or a direct synonym ("redlines" = design annotation), or (b) is the gerund or verb form of producing a *specifically named* SPF deliverable ("roadmapping" → roadmap, "storyboarding" → storyboard, "journey mapping" → user journey map). A phrase that only names the producing activity, with no reference to a named artifact, does **not** earn the deliverable. ("database design" → entity-relationship-diagrams is rejected: "design a database" is the activity; the ERD artifact is not named.)

3. **The SPF graph is a review aid, not an auto-expander.** A human picks each mapping; the named-artifact rule is the test it must pass. The graph's fan-out is surfaced to the reviewer precisely so over-labeling candidates are visible and rejected.

4. **A failing fixture earns each wire.** A multi-item deliverable alias is added only when a labeled fixture that uses the exact phrase currently records that deliverable as a deterministic false negative, and matches after the wire. The demonstrator fixture is committed with the wire. This keeps every recall addition evidence-bound, symmetric with ADR-0048 binding the labels themselves to evidence: the SPF graph proposes, a failing fixture earns.

5. **The agreed initial set** (corpus-grounded, word-bounded frequency in parentheses):
   - `user stories` / `writing user stories` → `user-story-statements` (32 / 5)
   - `roadmapping` → `roadmap` (5)
   - `journey mapping` / `customer journey mapping` → `user-journey-map` (5 / 2)
   - `storyboarding` → `storyboard` (4)
   - `redlines` → `design-annotation` (2)
   Rejected: `database design` → `entity-relationship-diagrams` (names the activity, not the artifact; and its two corpus hits are one duplicated posting).

## Consequences

- **No engine change.** The capability is translator-table rows, the matching `aliases.json`, demonstrator fixtures, and this rule. `translator-table.csv` stays the single source (ADR-0020); `aliases.json` is edited in lockstep with it by hand (there is no generator script). That hand-sync was a standing silent-drift risk — the CSV's "single source" status was aspirational, nothing enforced it. This change **closes it**: `check:alias-csv-parity` fails closed unless every leaf (activity/deliverable/tool) alias in `aliases.json` has a matching `term,spf_entity,spf_slug` row in the CSV and vice versa, and it ships a discrimination self-test (verifiable-quality-gates). It runs in CI. The snapshot is rebuilt so both twins (ADR-0028) carry identical aliases.
- **Confidence is unaffected.** Mechanism B (ADR-0047) still holds: these aliases raise deterministic recall, but a match is confident only when the recognizer confirms meaning. A multi-item wire cannot by itself assert unconfirmed work on an out-of-domain posting; the meaning check demotes it.
- **Deterministic deliverable recall rises** as each demonstrator fixture converts its false negative to a match. The paraphrase misses that use a *different* wording (for example `user-journey-map` labeled "map customer journeys", or `design-annotation` labeled "annotated designs") are out of this scope and remain for the recognizer or a future single-item alias.
- **Honest limits.** This is on-fixture recall: the phrases were chosen from these fixtures, so a demonstrator passing proves the wire works, not that the system generalizes to unseen phrasings. The gerund rule is a human judgment encoded as data, not a mechanical guarantee; a gerund that does not truly imply its artifact would be a mislabel caught only by review. Four of the five phrases occur five times or fewer in 934 postings, so the frequency evidence is thin.

## Alternatives considered

- **Auto-expand each phrase across the SPF graph's associated deliverables.** Rejected: it over-generates (43 of 106 phrases fan out to three or more), manufacturing false positives.
- **Wire only the one proven phrase (`user stories`).** Considered and offered. The decision is the fuller evidence-checked set, with each of the other four earned by its own demonstrator fixture rather than deferred.
- **Wire the set without demonstrator fixtures.** Rejected: an unproven wire is speculation and breaks the evidence-bound symmetry of ADR-0048.

## Verify (Confirmation)

- `node eval/run.mjs --no-llm --fixtures eval/fixtures.labeled.json`: each demonstrator fixture's deliverable moves from false negative to matched, and deterministic deliverable recall increases by exactly those items.
- Each demonstrator proves multi-item directly: the same quote yields both the activity match and the deliverable match in the coverage audit.
- `npm run check:fixture-evidence`: every demonstrator deliverable records its verbatim naming phrase (ADR-0048 guard), so the labels stay evidence-bound.
- `npm run check:snapshot-integrity`: the rebuilt snapshot is reproducible, so the app twin carries the same new aliases as the eval twin (ADR-0028).
- `npm run check:alias-csv-parity` (and `-- --self-test`): aliases.json and translator-table.csv agree on every leaf mapping (0 drift), and the gate is proven to detect a row or phrase present in only one file. Closes the hand-sync drift risk surfaced in the ADR-0049 architecture review.
