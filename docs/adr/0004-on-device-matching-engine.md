# ADR-0004: On-device keyword/phrase matching engine

- Status: Accepted
- Date: 2026-10-18
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0001](0001-static-spa-no-backend-local-only.md), [ADR-0002](0002-framework-data-layer.md)

## Context

The core feature (Epic 1) reads a pasted job description against a title and
reports the duties ("hats") it describes, the standard ones it omits, and the
non-standard ones it adds, plus an honesty verdict. The open question was HOW to
match the free-text JD to framework duties: on-device keyword/phrase matching, or
a cloud LLM.

A cloud LLM would send the user's pasted JD off the device. That contradicts the
product's central promise and ADR-0001: "no account, your data never leaves your
device." The user chose **on-device keyword/phrase matching**.

## Decision

A pure, local matching engine in `src/domain/engine`, grounded entirely in
framework-derived phrases. Nothing leaves the device.

- **Evidence index (`evidence.ts`).** For each duty, collect its evidence
  phrases: the duty name plus the labels of its RACI tasks, activities,
  deliverables, required skills, and tools. Phrases are normalized and
  de-duplicated. The engine can only ever surface a duty the framework data
  supports — it never invents one.
- **Matcher (`matcher.ts`).** Normalize the JD text once; for each duty, find
  which evidence phrases occur in it on token boundaries. Each matched phrase
  scores its token count, so a specific multi-word phrase outweighs a lone generic
  word. A duty counts as "described" once its score reaches a threshold
  (default 2), which stops a single generic word from implying a whole duty. The
  matched labels are returned so the UI can show WHY each hat matched
  (requirement FR-1.2).
- **Analysis (`analysis.ts`).** Compare the title's standard hats (the Job
  Function's Associated Duties) to the described hats, producing `matched`,
  `expectedMissing`, and `nonStandard`, plus an honesty verdict (`strong` /
  `partial` / `mismatch`) from the coverage ratio (matched / standard). The bands
  are `strong` at ratio >= 0.6, `partial` at >= 0.25, else `mismatch`: a strong
  match means most of the role's standard hats are actually described, a mismatch
  means few are. These are starting thresholds, tunable once there is real usage.
- **Detail (`dutyDetail.ts`).** Plain-language fields per hat (description, why it
  matters, what it takes, first step) for FR-1.1.

## Consequences

- The privacy promise holds by construction: matching is local, deterministic,
  and explainable (every matched hat cites the JD phrases that triggered it).
- No API cost, no key, no latency, works offline after the data loads.
- **Honest limits:** keyword/phrase matching misses paraphrases the framework has
  no phrase for, and can over-match a generic word shared across duties. The score
  threshold and multi-word weighting reduce, but do not remove, this. Because the
  engine is grounded in framework phrases, when it is unsure it simply does not
  claim a hat — consistent with "say so, do not guess." A future LLM option, if
  ever chosen, would require a new ADR revisiting the privacy promise and would be
  injected behind the same analysis interface.

## Alternatives considered

- **Cloud LLM matching:** better at paraphrase, but sends the JD off-device and
  breaks the core privacy promise. Rejected for MVP #1.
- **Embeddings / local ML model:** better recall than keywords without leaving the
  device, but adds model weight and complexity not justified for MVP #1. Revisit
  if keyword recall proves too low in use.
