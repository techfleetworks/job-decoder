# ADR-0005: MVP 1 scope — decode one posting, about the job, not the candidate

- Status: Accepted
- Date: 2026-10-31
- Deciders: Morgan (mdenner@techfleet.org)
- Relates to: [ADR-0004](0004-on-device-matching-engine.md); the vision use cases in `job_seeker_use_cases.csv`

## Context

The vision lists 21 "future scenarios to support" across six job-seeker problems.
Several of them are about the **candidate** (personal fit, which gaps to close,
compare to my level) and need the person to tell the app about themselves.
Others need capabilities the framework data does not provide (a seniority model)
or more than one posting at a time. Without an explicit line, the build drifts
into candidate features and the product stops being shippable as a first release.

An earlier traceability matrix (generated during planning) had sorted scenarios
into MVP 1 and Phase 2. That matrix is not the scope of record. Scope is decided
by Morgan.

## Decision

**MVP 1 decodes ONE pasted job posting and explains the job. It asks the person
nothing about themselves and gives no candidate-specific advice.**

In scope (about the job):

- Resolve the job title to a framework Job Function; handle an ambiguous title by
  letting the person pick, and an uncovered title by saying so and listing the
  supported titles.
- The three hat sets: written-and-expected, written-and-not-expected,
  unwritten-but-expected.
- A match score and a title-honesty verdict.
- Over-scope and under-scope flags. This is the **only** seniority signal in
  MVP 1.
- Plain-language meaning per hat (what it is, why it matters, what it takes).
- Role-generic resume highlights (skills, tools, deliverables), with must-show
  (Responsible and Accountable tasks) before nice-to-show (Consulted and
  Informed), and hidden hats first.
- An evidence quote from the posting for every claim.
- No account, local save on the device, and a one-action clear-all.

Out of scope for MVP 1 (deferred, not dropped). Each is deferred for a stated
reason, not because it is unimportant:

- **Anything about the candidate** — personal fit, a go / stretch / no-go call
  for the person, which gaps to close first, comparing the posting to the
  seeker's level, and "which skills I already have." Reason: MVP 1 collects no
  experience or profile from the person.
- **A true seniority read from the duties.** Reason: it needs a seniority model
  that the Skills & Practices Framework does not provide today.
- **A shortlist or comparison of several postings.** Reason: MVP 1 handles one
  posting at a time.
- **All interview preparation** — likely questions, what each hat will probe, a
  prep checklist, and questions to ask the employer. Reason: Morgan placed
  interview prep outside MVP 1.

## Consequences

- The MVP 1 promise is "understand the job," not "coach the candidate." The
  flowchart title and the UI say so, so no one mistakes the result for personal
  advice.
- Of the 21 vision scenarios, 11 are delivered by MVP 1 and 10 are deferred.
  Every deferred item returns once its missing input exists: an experience or
  profile input, a seniority model, or multi-posting support.
- This ADR governs over any conflicting priority tag (Must / Should / Could) or
  line in the requirements documents, which preserve the original Oct-18 handoff
  wording.

## Scope of this ADR

This record is about **feature scope only** (what the app does), and it holds
whether matching runs on-device or through an LLM, and whether hosting is
client-only or three-tier.

The matching approach and the hosting model are **separate decisions**.
ADR-0001 (static, no backend, data never leaves the device) and ADR-0004
(on-device matching, cloud LLM rejected) predate the move to a three-tier app
with an OpenRouter step, so they are under revision and will be superseded by
their own ADRs. Those changes do not alter this scope boundary.

## Alternatives considered

- **Include candidate fit in MVP 1**, as the original handoff did (it marked
  "see which of those they already have" a Must). Rejected by Morgan: MVP 1 is
  about the job, not the candidate.
- **Treat the generated traceability matrix as the scope of record.** Rejected:
  scope is Morgan's decision, not a document produced during planning.
