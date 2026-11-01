# ADR-0015: Entity relationships and matching granularity

- Status: Accepted (2026-10-31). Refines [ADR-0008](0008-framework-data-model-integrity.md) (data model) and [ADR-0010](0010-framework-source-of-truth.md) / [ADR-0014](0014-receipt-visible-misses-union-matching.md) (matching).
- Deciders: Morgan (mdenner@techfleet.org)

## Context

Morgan set the model plainly: a job function is the title, a duty is a hat, and the
two are related. One title has many duties; one duty has many activities, skills,
deliverables, and tools. A posting describes activities mainly, but deliverables and
tools (and skills) may be described too, so matching cannot be duty-level text
alone. It must work at the item level and roll up.

## Decision

- **Terms.** Job function = the title. Duty = a hat.
- **Relationships (from SPF).** One job function has many duties (its standard
  hats). One duty has many activities, skills, deliverables, and tools, each linked
  to the duty in the framework.
- **Matchable units** are a duty's activities, deliverables, tools, and skills. The
  app matches the posting's language to these items by exact wording and by
  synonym or similar language (ADR-0010 recognition plus the ADR-0014 keyword
  union). Activities are the primary signal; deliverables, tools, and skills are
  also matched.
- **A hat is referenced to the degree its items are.** The app counts, per duty,
  how many items of each type are referenced, split into exact and similar matches.
- **Roll-up (deterministic, from SPF).** Matched items roll up to referenced
  duties; referenced duties are compared to the title's standard duties to produce
  the matched, expected-but-missing, and non-standard sets, the match percentage,
  and the title-fit verdict. The LLM only proposes item-level matches with quotes;
  it decides none of the roll-up (ADR-0010).
- **The receipt** shows item-level matches (the item, its type, the posting quote,
  and exact or similar) grouped by duty, and lists the posting lines that matched no
  item (ADR-0014).

## Consequences

- More honest matching: a posting that names deliverables and tools but few activity
  verbs still maps to the right hats.
- More framework item types to index and validate at build time (activities,
  deliverables, tools, skills), each resolved by (entity, slug) per ADR-0008.
- The per-hat counts give the user a concrete, checkable signal, and feed the match
  percentage.

## Verify

Fixtures with postings that reference activities, deliverables, and tools; assert
the per-duty counts by type and the exact-versus-similar split, and that every
counted item resolves to a real SPF item under the owning duty.

## Alternatives considered

- **Match at the duty level only (duty name and description text).** Rejected: it
  misses postings that describe the work through deliverables and tools, and gives
  no per-hat count.
- **Match activities only.** Rejected by Morgan: deliverables and tools are
  described too and must be tracked.
