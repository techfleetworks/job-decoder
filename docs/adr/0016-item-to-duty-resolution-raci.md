# ADR-0016: Resolving posting items to duties via RACI, and the "posting says duties but means activities" guard

- Status: Accepted (2026-10-31). Refines [ADR-0015](0015-entity-relationships-matching-granularity.md), [ADR-0010](0010-framework-source-of-truth.md), [ADR-0014](0014-receipt-visible-misses-union-matching.md).
- Deciders: Morgan (mdenner@techfleet.org)

## Context

Morgan specified exactly how a matched leaf item resolves to a duty (hat) and what
to show, and flagged a language trap: a job posting usually uses the word "duties"
(or "responsibilities") for what the framework calls **activities**, not for
framework **Duties**. The app must never map the posting word "duty" to a framework
Duty by name. A framework Duty is only ever inferred by rolling matched leaf items
up through the framework's relationships.

## Decision

Matching always runs **posting text → leaf item → duty → job function**, never
posting text → Duty by the duty's name.

**1. The leaf match.** Match the posting's wording to a framework **activity,
deliverable, tool, or skill** by exact or similar language (ADR-0010 recognition
unioned with keyword matching, ADR-0014). Every match is validated against SPF and
carries its quote.

**2. The roll-up to a duty, by item type:**

- **Activity described** → find the duty that is **Responsible, Accountable, or
  Consulted** for that activity (not merely Informed). Show which duty is
  associated and the RACI role. SPF links: activity `Who's Responsible? /
  Accountable? / Consulted?` and duty `Responsible / Accountable / Consulted
  Tasks`.
- **Deliverable described** → find the duty that is Responsible, Accountable, or
  Consulted for it; show the duty and the RACI role. SPF links: deliverable `Duty
  Who Owns the Deliverable` and duty `Responsible Deliverables`.
- **Tool described** → find the framework entity that **uses** the tool (the duty,
  and through it the job function). Show the association. **If the tool maps to
  nothing in scope, ignore it** (do not surface it). SPF links: tool `Roles`, duty
  `Unique Required Tools`, job function `Required Tools`.

**3. The RACI filter.** For activities and deliverables, only **Responsible,
Accountable, or Consulted** associations count a duty as referenced. **Informed
does not**: being informed is not doing the work. Responsible and Accountable mean
the duty does it; Consulted is shown as a weaker, secondary association.

**4. The "duties" word guard (architect for this specifically).** Treat a posting's
"Duties", "Responsibilities", or "Key responsibilities" section as a list of
**activities** (and deliverables and tools), never as framework Duties. The matcher,
in both the LLM prompt and the deterministic pass, maps those lines to leaf items
only. A framework Duty is surfaced solely by rolling matched leaf items up via the
links above. So a posting line "Duties: own the roadmap" maps to the activity
"roadmap ownership", which rolls up to its Responsible duty, rather than being
matched to a Duty named "..." by the word "duties".

## UI

The receipt shows, per match: the posting quote, the leaf item and its type, exact
or similar, **the duty it rolls up to, and the RACI role** (R, A, or C). A tool
shows the duty or function that uses it. Items that roll up to nothing are not shown
(tools) or listed under "lines we could not place" (ADR-0014).

## Consequences

- Correct, explainable roll-up, and the user sees *why* a duty is implicated (the
  RACI role), not just that it is.
- Avoids the duty-word confusion that would otherwise mis-map a posting's "duties"
  list straight onto framework Duties.
- More SPF link types to index and validate (activity↔duty RACI, deliverable↔duty,
  tool↔duty and tool↔function), each resolved by (entity, slug) per ADR-0008.
- An activity can map to several duties with different RACI roles; show each, and
  treat the duty in the title's standard set as the primary one for the counts.

## Verify

Fixtures assert: a line under a "Duties:" header maps to activities, never to a
framework Duty by name; an activity maps to its Responsible/Accountable/Consulted
duties and not to an Informed-only duty; a tool with no in-scope association is
ignored; each receipt row shows the duty and RACI role.

## Alternatives considered

- **Match the posting's "duties" section to framework Duties directly.** Rejected:
  the words collide; a posting "duty" is a framework activity. This is the specific
  trap this ADR exists to prevent.
- **Count Informed associations as a referenced duty.** Rejected by Morgan: only
  R, A, or C.
