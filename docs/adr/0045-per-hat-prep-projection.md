# ADR-0045: A pure per-hat prep projection for the prep flow

- Status: Accepted
- Date: 2026-11-05
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0024](0024-resume-and-application-prep.md) (the prep guide and its hat order), [ADR-0028](0028-decode-engine-and-route.md) (the pure decode domain), [ADR-0039](0039-proportional-hat-scoring.md) (hat scoring and levels), [ADR-0040](0040-per-hat-detail-in-result.md) (per-hat detail on the result).

## Context

The prep flow (`PrepView`) was built (ADR-0024) as flat lists per step: one list of
skills, one of activities, one of ATS keywords, and so on. The Figma prototype
(file `HvbMGxsYUXHCJmt0pv8bg3`, prep frames `53:628`, `53:845`, `53:1181`, `53:1372`,
`53:1520`) designs a different information architecture, read screen by screen in the
T20 fidelity ticket:

- **ATS keywords** is category **chip** sections (In the posting, Hats, Tools, Activities,
  Key skills), not per-hat.
- **Skills** is three sections: *Named in the posting*, *Shared by several Hats*, and a
  per-hat *By Hat* list.
- **What to highlight**, **Cover letter**, and **Interview** are **per-hat cards**, each
  headed with the Hat's name and a **status pill** (Expected but missing / Matched / Not
  standard), hidden hats first.

The `buildPrepGuide` output (ADR-0024) already carries each item's hat and hat set
(`hidden` | `matched` | `non-standard`), so the per-hat view is a **regrouping** of data
the guide already owns, not a new computation over the snapshot. The open question was
*where* that regrouping lives: in the React component, or in the domain.

## Decision

**Add a pure projection, `projectPrep(guide)`, in `src/domain/decode/prepByHat.ts`.** It
takes a `PrepGuide` and returns the per-step, per-hat view model the prototype needs: the
Skills step's three sections, and the Highlights / Cover / Interview per-hat card lists,
each card tagged with its hat set so the view can show the status pill. It is a
deterministic, side-effect-free function of its input.

**The component does not compute the grouping.** `PrepView` calls `projectPrep` once and
renders the result. The grouping rules (which hat owns which item, hidden-first ordering,
which skills are "named in the posting", how highlight items split into shown vs. the
"More from this Hat" overflow) live in the domain, where they are unit-tested in isolation
and cannot drift per render.

**`PrepGuide` stays the single owner; the projection derives, it does not store.** The
per-hat view model is computed at render from the guide and never persisted. The stored
scan shape (ADR-0024) and its `isPrepGuideShape` guard are unchanged, so there is no second
copy of the prep data to keep in sync.

**Grounded quotes only; nothing is invented.** The Skills step's *Named in the posting*
section pairs each posting-sourced key skill with a verbatim quote taken from that hat's
matched activity in the guide (`HighlightItem.quote`). When no grounded quote exists for
the hat, the skill is shown without one. No quote is ever fabricated to fill the slot.

## Pattern choice (pattern-selector)

- **Presentation Model / View Model** (Fowler): a plain, UI-shaped projection of domain
  data, built in the domain and consumed by the view. Forces resolved: the four-questions
  dependency rule holds (the projection has no `request`, `response`, or React import, and
  the component depends on the domain, never the reverse); the grouping is testable without
  a DOM; the next screen that needs per-hat prep data reuses the projection instead of
  re-deriving it.
- **Rejected:** computing the grouping with `useMemo` inside `PrepView`. It would bury the
  rules in a view that can only be tested through the DOM, and the four-questions boundary
  check would flag a business rule living in a component.
- **Rejected:** precomputing the per-hat view in the route and storing it on the result.
  That duplicates facts the guide already owns, enlarges the stored scan, and risks the two
  copies drifting — the data-ownership red flag. The projection is cheap and pure, so
  deriving at render is strictly better.

## Consequences

- The prep flow matches the prototype's hybrid IA, and the per-hat card + status pill is a
  single, reusable shape across the Skills (By Hat), Highlights, Cover, and Interview steps.
- The grouping logic is covered by domain unit tests that fail closed; the view keeps only
  presentation (which section heading, which copy, when to collapse an accordion).
- **Honest limits:**
  - The projection is only as grounded as `buildPrepGuide`. It adds no framework data; it
    regroups what the guide already carries. A gap in the guide is a gap here.
  - "Named in the posting" skills reuse the hat's matched-activity quote as a representative
    phrase, because the domain never matches skills directly (`Match` is
    activity/deliverable/tool only, ADR-0028). This is a grounded approximation, not a
    skill-level recognizer; a skill named in prose but not via a matched activity carries no
    quote.
  - How many highlight items show before the "More from this Hat" accordion is a
    presentation threshold in the view, not a domain rule; the projection returns the full
    ordered list and marks which items are matched, and the view decides the cutoff.
