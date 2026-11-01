# ADR-0017: Skills are not matched directly; a skill in the posting routes to its activity

- Status: Accepted (2026-10-31). Refines [ADR-0015](0015-entity-relationships-matching-granularity.md) and [ADR-0016](0016-item-to-duty-resolution-raci.md).
- Deciders: Morgan (mdenner@techfleet.org)

## Context

Morgan: "Skill is going to be tricky. There are many skills associated with the hats
and they repeat." A skill is a noisy signal for which duty is referenced, because
one skill attaches to many duties. Postings do list skills, so they cannot be
ignored outright, but a skill must not directly implicate a duty.

## Decision

- **Skills are not a direct match or roll-up target.** The app never maps a matched
  skill to a duty through a skill-to-duty link.
- **A skill in the posting routes to its activity.** When the posting lists or
  describes a skill, map that skill to its associated activity and proceed from the
  activity (activity to duty via RACI, ADR-0016). Go off the activity, never the
  skill.
- **If a skill maps to no in-scope activity, ignore it** (as with an unmatched
  tool, ADR-0016).
- **The matchable leaf items are therefore activities, deliverables, and tools.**
  Skills are only a bridge to activities. (This supersedes the inclusion of skills
  as a direct matchable unit in ADR-0015 and ADR-0016.)

## Consequences

- Avoids the repeated-skill noise that would otherwise over-implicate many hats from
  a single common skill.
- Keeps the signal on what the work is (activities) and on deliverables and tools.
- A skill with no activity route is dropped, consistent with how misses are handled.

## Verify

Fixtures: a posting that lists a skill maps to the skill's activity and rolls up
from there; a skill with no in-scope activity is ignored; no duty is implicated by a
direct skill-to-duty link.

## Alternatives considered

- **Match skills directly to duties.** Rejected by Morgan: skills repeat across
  hats, so a direct match is noisy and over-broad.
- **Ignore skills in the posting entirely.** Rejected: postings describe real work
  through skills; routing them to activities keeps that signal without the noise.
