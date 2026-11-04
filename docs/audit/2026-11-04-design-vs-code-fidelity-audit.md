# Design ↔ code fidelity audit — Figma prototype vs the merged app (2026-11-04)

Skeptical audit of the gaps between the **Figma prototype** (`HvbMGxsYUXHCJmt0pv8bg3`, 33 screen
frames, updated to ADR-0039 this session) and the **merged app UI** on `main` @ `124f5ce` (after
T17, PR #23). This is the scope of the **Design-fidelity pass** ticket. Follows `skeptical-audit`
evidence discipline: every gap has a re-runnable source.

Method: Figma side = `get_metadata` frame inventory + the Prototypes - Hat Check page descriptions
(`observed`/`documented`). Code side = reading each component + targeted greps (`observed`,
`file:line`). Limitation: the app UI was read from source and not pixel-diffed against rendered
Figma exports; "gap" below means a design element/structure with no code counterpart, evidenced by
source, not a pixel comparison.

## What already matches (not gaps — T17 closed these)
- Match-level grouping (Fully covered / Partly covered), per-hat share, and the verdict counts
  (Hats covered / Hidden hats / Extra hats). `observed`: `Results.tsx`, `resultSummary.ts`.
- Framework attribution on data screens and a license route. `observed`: `FrameworkCredit.tsx`,
  `app/about/page.tsx`.
- Accessibility is *stronger* in code than the prototype specifies (focus management, live regions,
  axe gate). `observed`: `InputForm.tsx:94-112`, `Results.tsx:142-153`.

## Gap ledger (design element → code state)

### A. Results — the verdict & matched steps (largest cluster)
| # | Design element | Code state | Evidence | Kind / severity |
|---|---|---|---|---|
| A1 | Verdict **gauge** showing the match % (Figma 05 "Gauge: 50%") | No gauge/progress element; match % is plain text in `matchSummary` | `rg -i 'gauge|CircularProgress|LinearProgress' src` → 0 UI hits; `resultSummary.ts:42` | visual · **high** |
| A2 | Three **stat-tile cards** (Matched/Hidden/Extra), colored | Plain `<ul>` of three labeled counts | `Results.tsx:72-89` | visual · med |
| A3 | **Filter chips** by match type (All/Exact/Alias/Similar) | Absent — no Chip; evidence shown as a flat list | `rg 'Chip' src/components` → 0 hits | visual · med |
| A4 | Hat cards with **three accordions: Evidence / Why it matters / What it takes** | Each hat is a plain text block: name + description + evidence quotes only. No accordions, and **no "Why it matters" / "What it takes" sections at all** | `Results.tsx:26-56` (HatList); `rg 'Accordion' src/components` → PrepView only | **content + visual · high** |
| A5 | Hat **card container** with a level pill | Plain `<li>`; the level/share is inline text, no card chrome or pill | `Results.tsx:33-35` | visual · low-med |

### B. Input screen
| # | Design element | Code state | Evidence | Kind / severity |
|---|---|---|---|---|
| B1 | Live **character counter**, limit **20,000** (Figma 01) | No counter; `maxLength` is **50,000** | `InputForm.tsx:82` (`maxLength: 50000`); no counter in file | content + inconsistency · med |
| B2 | Field-level error states with a **top error summary** + per-field errors (Figma 02a-d) | Per-field `helperText` errors + a top Alert only for the *server* error | `InputForm.tsx:52-56, 66-69, 83-86` | partial · low-med |

### C. Progress & edge-state screens
| # | Design element | Code state | Evidence | Kind / severity |
|---|---|---|---|---|
| C1 | **Reading** screen + "still working" state + **Cancel** + skeleton gauge (Figma 04/04b) | Inline button label "Reading the posting…" + hidden live region; no screen, no Cancel | `InputForm.tsx:90-112` | med |
| C2 | Dedicated screens: **Decode failed** (19), **Too many decodes** (20), **No lines matched** (21) | Generic inline `Alert` on the input form for any decode error; "no lines matched" has no distinct screen | `DecodeFlow.tsx:47-49`; `InputForm.tsx:52-56` | med |

### D. Prepare-your-application flow
| # | Design element | Code state | Evidence | Kind / severity |
|---|---|---|---|---|
| D1 | Step **order**: ATS keywords (1), Skills (2), Highlights (3), Cover (4), Interview (5) | Skills (1), Activities & deliverables (2), **ATS keywords (3)**, Cover (4), Interview (5) — ATS is 1st in design, 3rd in code | `PrepView.tsx:131-207` vs Prototypes page | structure · med |
| D2 | Each screen is **one list of Hat cards** ("For the [hat] Hat") with a **status pill**, missing hats first | Grouped by skill/activity/keyword **flat lists**, not per-hat cards with pills | `PrepView.tsx:39-110` (SkillColumn/HighlightList/PointList) | **IA · high** |
| D3 | Step title "What to highlight" | "Activities and deliverables to highlight" | `PrepView.tsx:142` | copy · low |

### E. Global chrome
| # | Design element | Code state | Evidence | Kind / severity |
|---|---|---|---|---|
| E1 | Persistent **App bar** on every screen | Per-screen `<h1>`; no persistent app bar/nav | `InputForm.tsx:43`, `Results.tsx:157`, `PrepView.tsx:226` | low |
| E2 | **Footer** (credit + license link) on **every** screen | Results & PrepView carry FrameworkCredit; **InputForm does not**; DecodeFlow has a footer link | `PrepView.tsx:268-269`, `Results.tsx:226`, `DecodeFlow.tsx:79-83`; absent in `InputForm.tsx` | low |
| E3 | How-it-works dialog shows the **verdict thresholds (60% / 25%)** and the framework/AI split (Figma 10) | Dialog lists the steps; no threshold numbers | `rg '60|25|threshold' src/content/howItWorks.ts` → 0 hits | low |

## Severity roll-up (most load-bearing first)
- **High**: A4 (hat cards missing Why-it-matters / What-it-takes content + accordions), A1 (verdict gauge), D2 (prep per-hat card IA).
- **Med**: A2, A3, B1, C1, C2, D1.
- **Low**: A5, B2, D3, E1, E2, E3.

Two of the three "high" gaps are **content/IA**, not mere styling: A4 omits whole design sections
("Why it matters", "What it takes"), and D2 reorganizes prep around a different structure. Those
are the ones a visual-only fidelity pass would miss.

## Open gaps (restated as the Design-fidelity pass backlog)
1. Build the Results verdict visual system: gauge (A1), stat-tile cards (A2), filter chips (A3).
2. Rebuild the matched-hat card with Evidence / Why it matters / What it takes accordions (A4) —
   confirm the domain result carries "why it matters" / "what it takes" data, or add it.
3. Rebuild the prep flow as per-hat cards with status pills, and fix the step order (D1, D2).
4. Add the input character counter and reconcile the 20,000 vs 50,000 limit (B1) — a scope decision.
5. Add the Reading / Decode-failed / Too-many / No-lines screens (C1, C2).
6. Minor: footer on input (E2), how-it-works thresholds (E3), copy (D3), app bar (E1).

7 matched areas, 16 gaps (3 high, 6 med, 7 low). No gap is a regression — they are unbuilt design,
which is exactly what the Design-fidelity pass ticket exists to close.
