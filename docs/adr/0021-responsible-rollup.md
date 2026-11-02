# ADR-0021: A matched item means the poster is Responsible (roll-up rule)

- Status: Accepted
- Date: 2026-11-01
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: ADR-0015 (entity model), ADR-0016 (item-to-duty roll-up via RACI),
  ADR-0018 (business logic).
- Supersedes: the Responsible/Accountable/Consulted roll-up in ADR-0016.

Note: ADRs 0005 through 0018 live on branch `docs/adr-0005-mvp1-scope`, not yet
merged, so they are referenced here by number.

## Context

When a posting describes an activity or deliverable, the decode rolls it up to the
duty (hat) it belongs to. ADR-0016 rolled up through Responsible, Accountable, or
Consulted. On real data that over-credits: a single common activity is Consulted by
many duties, so a focused posting lit up hats it did not describe. On the real test
posting, R/A/C produced 8 non-standard hats; most traced to Consulted links, not to
anything the posting said.

## Decision

Treat a posting that names an activity or deliverable as the poster being
**Responsible** for it. Roll the item up only to the duty that is Responsible for it:

- For an activity, the duty(s) in its "Who's Responsible?" set.
- For a deliverable, the duty that owns it ("Duty Who Owns the Deliverable").
- Not Accountable, not Consulted, not Informed.
- Tools still roll up to the duty or function that requires them, or are ignored if
  none (unchanged from ADR-0016).

The hat shown for a matched item is therefore the hat Responsible for that item.

## Consequences

- "Non-standard" becomes meaningful: it now means the posting describes work a duty
  **owns** that is not standard for the title, not merely a duty consulted on a
  common task. On the real test posting, non-standard dropped from 8 to 3, and
  "covered" reflects actual ownership.
- Combined with the translator table (ADR-0020), the real posting read as 4/4
  covered with 3 non-standard, from 15 matched items.
- **Honest limit:** an item that a hat is only Accountable or Consulted for no longer
  credits that hat. That is intended; "Responsible" is the faithful reading of "the
  posting describes this responsibility." The RACI data is retained and can still be
  surfaced as secondary context on the receipt.

## Alternatives considered

- **Responsible + Accountable:** keeps sign-off ownership but still adds some noise
  (a duty merely accountable for a named activity). Rejected as less clean.
- **Full R/A/C (ADR-0016):** rejected; it inflates both covered and non-standard and
  weakens the title-fit verdict, which is the product's core judgment.

## Amendment 2026-11-01: edge cases (v1 audit)

Defaults chosen to close gaps the audit found; each is marked for Morgan to confirm
in the audit tracker.

- **Several Responsible duties.** An activity whose "Who's Responsible?" lists more
  than one duty credits each of them. ADR-0016's note to treat one as "primary for
  the counts" is superseded.
- **One owner per deliverable.** Ownership comes only from the deliverable's own
  "Duty Who Owns the Deliverable" field, everywhere (roll-up and resume prep). At
  framework commit 636635a, 14 of 129 duty "Responsible Deliverables" links name a
  different owner; the build reports them.
- **Expected-only duties.** The duties ADR-0008 marks expected-only are never
  credited, including through a matched tool.
- **Tools at the job-function level.** A tool listed only on a job function, and on
  no duty, is ignored, since a job function is not a hat.
