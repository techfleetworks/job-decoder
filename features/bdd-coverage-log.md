# BDD coverage log

Append-only. Each behavioral change adds a dated entry naming the change, the
scenarios added, updated, or removed with their audience, use case, and severity,
and the gate result that proved them. Never edit or delete a past entry; the
history is the receipt.

## 2026-11-01 — BDD harness and the architecture feature

- Change: `feat/bdd-harness` (the PR after T10). Stands up Cucumber.js in strict
  mode and the gate suite (`check-gherkin-valid`, `check-bdd-tags`,
  `check-bdd-coverage`, `check-bdd-executed`), wired into CI as blocking checks,
  plus the generated datastore (`features/bdd-index.json` and `features/INDEX.md`).
- Scenarios added. Feature "The architecture gate holds the tier boundaries"
  (`@audience:engineer`):
  - `gate-clean` (happy, functional, high)
  - `gate-secret` (permission, security, critical)
  - `gate-db-client` (permission, security, critical)
  - `gate-session-only` (negative, functional, high)
  - `gate-literal-color` (negative, functional, low)
  - `gate-server-secret-ok` (boundary, security, high)
- Gate result: `test:bdd` ran 6 scenarios and 17 steps, all passed;
  `check-gherkin-valid`, `check-bdd-tags`, `check-bdd-coverage`, and
  `check-bdd-executed` all PASS. The ticket feature files (T01 to T16) are added
  with their implementations in later PRs, each appending an entry here.

## 2026-11-02 — T11 framework data tier and snapshot build

- Change: `feat/data-tier` (T11). Adds the Supabase data tier (`spf_release` and
  `spf_record` JSONB, RLS on), the shared relation logic, the ADR-0008 integrity
  gate, and the build-time snapshot pipeline that derives the CDN read model.
- Scenarios added. Feature "The framework data tier and snapshot build"
  (`@audience:engineer`):
  - `snapshot-build` (happy, functional, high)
  - `integrity-dangling` (error, functional, critical)
  - `integrity-disagree` (error, functional, critical)
  - `content-hash-stable` (boundary, reliability, medium)
  - `framework-rls` (permission, security, critical)
- Gate result: `test:bdd` ran all scenarios green; `check-gherkin-valid`,
  `check-bdd-tags`, `check-bdd-coverage`, `check-bdd-executed`, and
  `check:snapshot-integrity` all PASS. The decode-engine and screen tickets add
  their own feature files and entries in later PRs.

## 2026-11-02 — T03 to T09 decode engine (keyword path)

- Change: `feat/decode-engine`. Ports the matcher and scoring into a pure TypeScript
  domain (`src/domain/decode`), adds the server snapshot reader (`src/data/server`) and
  the `/api/decode` route, and wires the snapshot into the build. The grounded LLM
  recognizer (T05) is a follow-up. BDD steps are now TypeScript, run under the tsx loader.
- Scenarios added. Feature "Decode a job posting into the hats it expects"
  (`@audience:job-seeker`):
  - `decode-covered` (happy, functional, high)
  - `decode-missing` (boundary, functional, high)
  - `decode-non-standard` (adverse, functional, medium)
  - `decode-not-covered` (negative, functional, high)
  - `decode-line-audit` (happy, reliability, medium)
- Gate result: `test:bdd` ran 16 scenarios and 49 steps green; `check-gherkin-valid`,
  `check-bdd-tags`, `check-bdd-coverage`, and `check-bdd-executed` all PASS. The route
  and domain also carry Vitest tests (13 cases).

## 2026-11-02 — T01, T02, T06 to T08 result screens (keyword flow)

- Change: `feat/screens` (stacked on the decode PR). The input screen, the result stepper,
  the receipt per hat, the how-it-works panel, and the session-only store, calling
  /api/decode through the client wrapper.
- Scenarios added. Feature "The result screen speaks plainly" (`@audience:job-seeker`):
  - `screen-strong-headline` (happy, functional, medium)
  - `screen-basic-read` (boundary, functional, medium)
  - `screen-not-covered` (negative, functional, high)
- Gate result: `test:bdd` ran 19 scenarios and 59 steps green; `check-gherkin-valid`,
  `check-bdd-tags`, `check-bdd-coverage`, and `check-bdd-executed` all PASS. The screens
  also carry Vitest component and jest-axe accessibility tests (9 cases).

## 2026-11-02 — T16 resume and application prep (logic and data)

- Change: `feat/resume-prep`. Adds the skills entity to the data tier and enriches the
  snapshot (per-hat skills, activities, deliverables, tools; a skills index with Skill Type;
  activity and deliverable detail), plus the pure `buildPrepGuide` the decode route returns.
  The prep screen is a follow-up PR.
- Scenarios added. Feature "Prepare your application from the hats" (`@audience:job-seeker`):
  - `prep-skills` (happy, functional, high)
  - `prep-outcomes` (happy, functional, medium)
  - `prep-ats-dedup` (boundary, functional, medium)
  - `prep-empty-set` (empty-overflow, functional, medium)
  - `prep-not-covered` (negative, functional, high)
  - `prep-traceable` (happy, functional, high)
- Gate result: `test:bdd` ran 25 scenarios green; `buildPrepGuide` has 9 Vitest unit tests;
  the integrity gate gained R4 (every referenced skill resolves and has a Skill Type) with a
  discriminating test; `check-gherkin-valid`, `check-bdd-tags`, `check-bdd-coverage`,
  `check-bdd-executed`, and `check:snapshot-integrity` all PASS.

## 2026-11-02 — T13 decode input validation (OWASP security gate)

- Change: `feat/t13-owasp-gate` (T13). Extracts the `/api/decode` request rules into a pure
  domain check (`src/domain/decode/validate.ts`, `validateDecodeInput`) and has the route call
  it, so the server-side allow-list is tested on its own and enforced in one place (ADR-0035).
  OWASP threat model: Input Validation (high), Denial of Service via oversized input (high),
  Mass Assignment (medium). No new runtime dependency.
- Scenarios added. Feature "The decode endpoint validates untrusted input before any work"
  (`@audience:job-seeker`):
  - `decode-input-oversized` (boundary, security, high)
  - `decode-input-wrong-type` (negative, security, high)
  - `decode-input-not-object` (adverse, security, medium)
  - `decode-input-empty` (empty-overflow, security, medium)
  - `decode-input-extra-fields` (adverse, security, medium)
- Gate result: `test:bdd` ran all scenarios green; `validateDecodeInput` has a discriminating
  Vitest suite (8 cases); `check-gherkin-valid`, `check-bdd-tags`, `check-bdd-coverage`, and
  `check-bdd-executed` all PASS.

## 2026-11-03 — T03 live LLM recognizer in /api/decode

- Change: `feat/t03-live-recognizer` (T03, ADR-0037). Runs the grounded LLM recognizer live on
  the request path: a pure parser/validator in the decode domain
  (`src/domain/decode/recognize.ts`), a server gateway that makes the call and holds the key
  (`src/data/server/openrouter.ts`), and the route wiring that unions the validated matches
  into `decode`. The model recognizes wording only; every slug is validated against the
  framework and every quote against the posting, so a hallucinated or injected item is dropped.
  OWASP threat model: LLM prompt injection (critical), fabricated evidence / input validation
  (high), mass assignment on model output (medium), error handling / DoS via timeout (medium);
  SSRF and secret handling held structurally (fixed endpoint, server-only key). No new runtime
  dependency.
- Scenarios added. Feature "The LLM recognizer cannot change the decode result"
  (`@audience:job-seeker`):
  - `recognizer-injected-slug` (adverse, security, critical)
  - `recognizer-fabricated-quote` (negative, security, high)
  - `recognizer-wrong-type` (negative, security, high)
  - `recognizer-extra-fields` (adverse, security, medium)
  - `recognizer-garbled-output` (error, reliability, medium)
- judge-arch (fresh context) found a slug-alone resolution that `decisions.md`/ADR-0008 forbid
  (slugs collide across entities); fixed to resolve by (type, slug) only, with the
  `recognizer-wrong-type` scenario and the flipped unit case proving a wrong-type slug is now
  dropped.
- Gate result: `test:bdd` ran all scenarios green; `parseRecognitions` has a discriminating
  Vitest suite (11 cases) and the gateway `recognizeMatches` has one (7 cases, fetch mocked);
  `check:architecture`, `check-gherkin-valid`, `check-bdd-tags`, `check-bdd-coverage`, and
  `check-bdd-executed` all PASS.

## 2026-11-05 — T19/T20/T21 prep flow IA to the prototype (ADR-0045)

- Change: `feat/t20-prep-ia`. Rewrote the prep flow to match the Figma prototype (file
  `HvbMGxsYUXHCJmt0pv8bg3`, prep frames `53:628`, `53:845`, `53:1181`, `53:1372`, `53:1520`):
  ATS keywords as five chip sections, Skills as three sections (Named in the posting / Shared by
  several Hats / By Hat), and per-hat cards with status pills on the Highlights, Cover, and
  Interview steps, hidden hats first. Backed by a pure per-hat projection `projectPrep`
  (`src/domain/decode/prepByHat.ts`, ADR-0045) over the existing `PrepGuide`, plus a per-hat
  `role` enrichment on each skill in `buildPrepGuide` so the By-Hat cards can split Needed vs
  Foundational. The view (`PrepView.tsx`, `HatPrepCard.tsx`) renders the projection; it computes
  no grouping.
- Scenarios added to feature "Prepare your application from the hats" (`@audience:job-seeker`):
  - `prep-by-hat-order` (happy, functional, high) — the per-hat steps lead with the hidden hat,
    every card carries a status set.
  - `prep-named-quote` (happy, functional, medium) — a named-in-the-posting skill carries a
    grounded posting quote.
  - `prep-nonstandard-cover` (edge, functional, medium) — a non-standard cover card shows no
    deliverable chips.
- Grounding: the projection adds no framework data; it regroups what the guide already carries
  and uses only grounded quotes (a hat with no matched quote carries none). The "Named in the
  posting" skills reuse the hat's matched-activity quote (the domain never matches skills
  directly, ADR-0028); this is stated in ADR-0045 as a limit, not hidden.
- Gate result: `test:bdd` ran all 39 scenarios green (132 steps); `projectPrep` has a
  discriminating Vitest suite (8 cases) and `buildPrepGuide`'s role split is covered (prep.test);
  `PrepView` has a component suite (10 cases, axe clean); `check:architecture`, `check-gherkin`,
  `check-bdd-tags`, `check-bdd-coverage`, and `check-bdd-executed` all PASS.
