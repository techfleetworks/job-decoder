# Architecture review: T17 verdict-count tiles + match-level copy (ADR-0039)

- Date: 2026-11-04
- Change: working tree on `main` — T17 app alignment to the ADR-0039 prototype
- Standard: `decisions.md`, ADR-0039 (proportional per-hat scoring), ADR-0018 (business logic), WCAG 2.2 AA (meaning not by color)
- Review context: fresh (general-purpose subagent, not the authoring context)
- Verdict: **PASS — 2 low-severity findings, both resolved in this change**

## Scope

The app Results UI brought up to the updated Figma prototype (ticket T17): the verdict step
shows three labeled counts (Hats covered / Hidden hats / Extra hats) and the step-2 group
headings use the final match-level wording.

- `src/components/resultSummary.ts` — added the pure `verdictCounts(result)` helper, the
  `VerdictCount` type, and the `GROUP_HEADINGS` wording constant.
- `src/components/Results.tsx` — step 1 renders `<ul aria-label="Hat counts">` from
  `verdictCounts`; the two group headings read from `GROUP_HEADINGS`.
- `src/components/resultSummary.test.ts`, `src/components/Results.test.tsx` — unit + render tests.

Every changed production file was reviewed against the four questions; every cell verdicted
with evidence; the grep battery was run.

## Review matrix (production files × four questions)

| File | Boundary | Data ownership | Dependency direction | Error handling |
|---|---|---|---|---|
| `resultSummary.ts` | cleared — pure presentation helper is this module's declared home (header L1-3; decisions.md) | cleared — reads `result.covered/.missing/.nonStandard` lengths; stores/mirrors nothing | cleared — only `import type` from `../domain/decode/types`; grep battery clean | n/a — pure function, no I/O, no catch, no promise |
| `Results.tsx` | cleared — view only; `verdictCounts(result)` → MUI nodes, no scoring/verdict logic inlined | cleared — renders values from `result`; owns only stepper UI state | cleared — grep battery clean (no request/response/window/fetch/supabase) | n/a for the diff — adds only JSX; no new catch/await/failure path |

Test files: `resultSummary.test.ts` adds a `verdictCounts` triple assertion and a
`GROUP_HEADINGS` wording assertion; `Results.test.tsx` asserts the three tile labels render and
keeps the `axe()` zero-violations check.

## Grep battery (re-runnable, from repo root)

```
rg -n -i '\b(request|response|session|cookie|req\.|res\.|window|document|localStorage|sessionStorage|fetch|supabase)\b' src/components/resultSummary.ts src/components/Results.tsx
→ (no matches)
rg -n 'catch|\.then\(|await|return null|return false' src/components/resultSummary.ts src/components/Results.tsx
→ Results.tsx:188 "basic read from keyword matching" — user-facing copy, not an error path
rg -n '#[0-9a-fA-F]{3,6}|rgb\(|rgba\(' src/components/Results.tsx
→ (no literal colors — respects the theme-token rule)
```

## Findings (both LOW — resolved)

- **F1 — reworded group-heading copy shipped without a guarding test** (`@question:boundary`
  `@severity:low` `@file:src/components/Results.tsx`). The module header states copy changes
  must be caught by its tests, but the two group-heading strings lived inline in the component
  and no test asserted them. **Resolution: fixed** — moved into `GROUP_HEADINGS` in
  `resultSummary.ts` and asserted in `resultSummary.test.ts`.
- **F2 — two parallel label sets for the same three counts** (`@question:boundary`
  `@severity:low` `@file:src/components/Results.tsx`). The tile labels and the step titles word
  the same counts differently and could drift. **Resolution: partially addressed** — the group
  headings are now single-sourced in `GROUP_HEADINGS`; consolidating the tile labels and step
  titles into one wording map is noted as an optional follow-up, not required (numbers are
  single-sourced from `DecodeResult`, so this is a wording-drift risk only).

## Over-/under-engineering

No over-engineering (`VerdictCount` is a used 2-field return type; no factory/manager). No
under-engineering (the helper is pure and unit-tested; meaning carried by label text not color;
`aria-label` on the list; `axe` check retained).

## Mechanical gate & verification

- `npm run check:architecture`: PASS.
- Full gate suite (12 checks: arch, lint, typecheck, test:run, 4 BDD gates, snapshot-integrity,
  dependencies, build): PASS, exit 0.
- Tests: `tsc` clean, `next lint` clean, affected Vitest 8/8 pass (new `verdictCounts` and
  `GROUP_HEADINGS` cases; `axe` zero violations retained).

## Limitation

The reviewer read the diff and ran the grep battery; it did not exercise the live rendered UI.
The stat-tile *visual* treatment (gauge rendering, stat-tile cards, filter chips, accordion
hat-card chrome) is out of scope here — it is the separate Design-fidelity pass; this change
aligns the information architecture and copy only.
