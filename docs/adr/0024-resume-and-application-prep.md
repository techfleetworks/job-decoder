# ADR-0024: Resume and application prep, built from the hats

- Status: Accepted (2026-11-01) for the feature, its scope, and its method. The
  "key" ranking rules in the Decision were **approved by Morgan on 2026-11-02**, and the
  skills-data prerequisite is resolved: the snapshot now carries the skills entity (name and
  Skill Type) and each hat's skills, activities, deliverables, and tools.
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: ADR-0005 (MVP scope, amended), ADR-0010 (framework is the source of
  truth), ADR-0013 (UI rules), ADR-0017 (skills route to activities), ADR-0020
  (translator table), ADR-0021 (Responsible roll-up), ADR-0022 (snapshot slices),
  ADR-0023 (all evidence per hat).
- Backlog: T16.

Note: ADRs 0005 through 0018 live on branch `docs/adr-0005-mvp1-scope`, not yet
merged, so they are referenced here by number.

## Context

The decode tells a person which hats a posting covers, misses, and adds, but not how
to prepare for the job. Role-generic resume highlights were in MVP scope (ADR-0005)
but had dropped out of the backlog and designs. On 2026-11-01 Morgan added a full
"Prepare your application" feature to MVP 1, including interview points.

The guide must stay "about the job, not the candidate": it asks the person nothing
about themselves. It must also stay grounded: every item traces to the framework,
and no AI writes any of it (ADR-0010).

## Decision

After the result, offer a "Prepare your application" flow with its own stepper
(ADR-0013), one part per screen. Every screen orders hats the same way: hidden
(expected but missing) first, then matched, then non-standard as extra scope.

**Who decides what appears.** No AI and no person at run time:

- **The posting** decides which hats and items are present (the decode, ADR-0018).
- **The framework** decides what content belongs to each hat.
- **Fixed rules** below decide which content is key, the order, and placement.

**1. Skills for your resume.** Pool per hat: the duty's "Skills Required For the
Duty" plus skills its matched activities list. Technical or interpersonal comes from
each skill's Skill Type field, never from the activity field named "Required Hard
Skills" (it also lists interpersonal skills). *Proposed* key ranking: (1) skills
named in the posting or matched through the translator table; (2) skills required by
an activity the posting named; (3) the duty's "Foundational Skills." Everything else
goes in an accordion. Hidden hats use their Foundational Skills. A skill shared by
several hats shows once, listing every hat.

**2. Activities and deliverables to highlight.** Items the posting named come first,
with their quotes; the hat's other activities and deliverables go in an accordion.
Each has an outcome template: "[Activity] ____, which resulted in [deliverable] ____,
so that ____." The deliverable comes from the activity's "Associated Deliverables";
the deliverable's "Why Is This Deliverable Important?" is shown as a hint. The person
fills every blank. No numbers are made up.

**3. ATS keywords.** Deduplicated, grouped: in the posting, hats, tools, activities,
skills. Skills are the key skills from step 1 only, so the list is not
keyword-stuffed. A keyword appears once, in its highest group.

**4. Cover letter points.** One per hat, from the duty's "Why Is This Duty Important
to Project Success?" and the hat's deliverables, shown as framework text.

**5. Interview points.** Matched and hidden hats: "Be ready to show [deliverable]"
(a named deliverable first; else one linked to a matched activity; else the hat's
first Responsible Deliverable). Non-standard hats: "Ask how much of the role is
[hat]," naming the strongest matched item.

**Method.** A pure domain function, `buildPrepGuide(decodeResult, functionSlice)`,
runs in the tier-2 decode route after classification. Every item carries its hat,
entity, slug, and source field so it can be traced. No extra AI call.

## Consequences

- The decode turns into concrete action without collecting any personal data.
- Everything stays checkable: each item names its hat and framework field.
- The snapshot slices must carry each referenced skill's Skill Type (ADR-0022
  amendment).
- **Honest limits:** cover letter and interview points are framework text, not
  polished sentences. The step 5 fallback ("first Responsible Deliverable in
  framework order") is a tie-break with no meaning behind it. Duties list many
  skills (UX Design lists 62), so without the ranking rule step 1 would be the word
  salad this feature exists to prevent.

## Evidence

Checked 2026-11-01 against a fresh clone of the framework at commit 636635a: all 115
skills have a Skill Type (92 Technical, 23 Interpersonal); every duty skill link
resolves; all 18 duties and all 104 deliverables have their "why it matters" text;
99 of 100 activities name an associated deliverable. Wireframing's "Required Hard
Skills" lists 34 skills, 13 of them Interpersonal.

## Alternatives considered

- **AI-written resume bullets and cover letters.** Rejected: the AI decides nothing
  and writes nothing the person sees (ADR-0010); invented metrics would be a real risk.
- **Show every skill a hat lists.** Rejected: dozens per hat is word salad.
- **A hand-made technical vs interpersonal mapping table.** Not needed: the framework
  already types every skill.
- **Read the person's resume and compare.** Rejected for MVP 1: that is about the
  candidate (ADR-0005), and stays Phase 2.
