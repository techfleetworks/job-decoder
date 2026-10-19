# Architecture review — Phase 0 foundation

- Date: 2026-10-18
- Change: `de055f9` on branch `feat/phase-0-foundation`
- Scope: Phase 0 foundation, 29 files (14 `.tsx`/`.ts` code/test/config; 15 `.css`/`.json`/`.md`/`.html`/dotfiles)
- Standard: [decisions.md](../../decisions.md), [ADR-0001](../adr/0001-static-spa-no-backend-local-only.md)
- Review context: fresh (general-purpose subagent, separate from the authoring context)

## Verdict

**PASS — 0 findings.** The matrix is complete: every code file reviewed against all four
questions, every cell verdicted with evidence.

Phase 0 is scaffold + accessible shell + licensing. By design it contains no business logic,
no services, no persistence, and no data fetching. The review confirms none crept in early.

## Grep battery (re-runnable, over `src/`)

| Command | Result |
|---|---|
| `rg -n -i "\b(request\|response\|session\|cookie\|window\|document\|localStorage)\b" src` | `main.tsx:8` DOM access at the entry point (the allowed place); `PrivacyBanner.tsx:6` "cookie" in a comment only. No web/DOM concern in non-UI logic. |
| `rg -n "fetch\(\|new Response\|Headers\(\|axios\." src` | no matches — no data fetching yet (deferred to Phase 1) |
| `rg -n "catch…{}\|.catch(()=>\|return (null\|false);" src` | no matches — no swallowed errors |
| `rg -n "licensed under CC BY 4.0" src` | single hit at `licensing.ts:12` — credit line single-sourced, never hand-copied |

## Matrix summary

All 14 reviewed files: boundary / data-ownership / dependency-direction / error-handling each
`cleared` or `n/a` with evidence. Highlights:

- **Attribution single-owned** — the CC BY 4.0 credit line lives only in
  `src/content/licensing.ts`; `SiteFooter.tsx` and `AboutPage.tsx` render it from there.
- **DOM access only at the composition root** — `main.tsx` reads `document.getElementById`
  at the entry point and throws a clear error if the root is missing.
- **No business logic in pages/components**, matching `decisions.md`.

Full per-cell matrix is in [log.jsonl](log.jsonl) for this change ref.

## Notes carried to Phase 1

- The mechanical gate (`npm run check:architecture`) is not yet wired. There is no business
  logic to gate in a scaffold; per `decisions.md` it becomes required when Phase 1 adds logic.

## Author verification (separate from the fresh review)

On `de055f9` the main session ran `tsc -b` (clean), `vite build` (ok), and the test suite
(8/8 passing, including 0 axe accessibility violations).
