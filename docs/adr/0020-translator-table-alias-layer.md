# ADR-0020: Translator table (alias layer) for matching recall

- Status: Accepted
- Date: 2026-11-01
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: ADR-0010 (framework is the source of truth), ADR-0014 (union matching),
  ADR-0017 (skills route to activities), ADR-0019 (eval harness).

Note: ADRs 0005 through 0018 live on branch `docs/adr-0005-mvp1-scope`, not yet
merged, so they are referenced here by number.

## Context

Exact and line-scoped keyword matching misses how real postings phrase the work.
On real postings the framework label "Prototype Creation" never appears; postings
say "prototyping". "Developing Information Architecture" appears as "IA";
"Customer Experience Mapping" as "journey mapping"; "A/B Prototype Test Creation"
as "A/B testing". Measured on a 934-posting corpus, exact label matching reached
only 88 of 221 leaf items. We need higher recall without handing the decision to an
AI at runtime.

## Decision

Maintain a **translator table**: a reviewed mapping of real-posting terms to SPF
entities, and wire its leaf-item entries into the matcher as an `alias` tier.

- The table is `eval/translator-table.csv` and is the **source of truth** (columns:
  term, spf_entity, spf_slug, spf_label, relation, doc_frequency, pct_postings,
  top_titles, source). `eval/aliases.json` is generated from it for the matcher.
- It was built from a **934-posting corpus** gathered across Greenhouse, Lever, and
  Ashby for nine role families, plus domain knowledge. Each term's document
  frequency across the corpus is recorded, so "most common" is measured, not
  guessed. Every term maps to a real SPF slug (validated; zero bad slugs).
- Only the matchable leaf entities (activity, deliverable, tool) feed the matcher.
  Skills and duties are in the table for reference; skills route via their activity
  (ADR-0017).
- Alias phrases match **line-scoped** like labels, as their own tier below `exact`
  and above `similar`, so the receipt shows a match came from an alias and which
  term triggered it. The alias is authored and reviewable; the framework still
  decides what exists.
- The table **grows from evidence**: the harness's unplaced lines across postings
  are the backlog of missing phrasings.

## Consequences

- Recall rose sharply: distinct leaf items matched across the corpus went from 88 to
  141 of 221; on the real test posting matches went from 7 to 15 (now catching
  prototyping, journey mapping, A/B testing, WCAG, requirements/specifications, and
  more).
- **Honest limits.** This is not exhaustive. We sampled nine role families, so SPF
  areas like security, QA, and account management are thin. Broad single-word
  aliases (for example "testing", "coaching") can create false positives and must be
  tightened or qualified; `relation` flags them for review. The coverage audit
  guarantees 100% line-accountability by construction; matching recall is a measured
  number that improves over time, never a structural guarantee.
- A few common posting terms have no SPF item at all (for example "conversion
  optimization", and tools like Jira that are not in the framework). Those stay
  unplaced on purpose, per "say so, do not guess."

## Alternatives considered

- **LLM paraphrase only:** kept as a complementary recall layer, but a deterministic,
  reviewable table is auditable, offline, and does not let an AI decide; it reduces
  reliance on the model.
- **Stemming / fuzzy token overlap:** weaker and lower precision; it was the
  scattered-word problem ADR-0019's line-scoping fixed. The curated table is higher
  precision for the common phrasings.
- **No alias layer:** rejected; exact matching alone has unacceptably low recall on
  real postings.
