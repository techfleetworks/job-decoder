# Skeptical audit — live decode of an Indeed Product Manager posting

**Date:** 2026-11-03
**Subject:** One live decode run of a real "Product Manager" job posting (Indeed, AI eval platform role), keyword + LLM.
**Model:** `deepseek/deepseek-v4.1-flash-1017` via deepinfra (pinned, no fallback, data collection denied; ADR-0036).
**Harness:** `eval/run.mjs --fixtures <posting> --detail` (dependency-free dev-tooling).
**Auditor note:** This posting was decoded as a demo, not scored against a hand-labeled fixture, so accuracy here is `not-assessed`. Evidence states follow the repo discipline: `proven` / `observed` / `inferred` / `not-assessed`.

---

## 1. What was claimed vs. what the evidence supports

### Holds up

| Claim | State | Source |
|---|---|---|
| `Product Manager` resolves to the Product Manager function | `proven` | `decode.mjs:21` (`resolveTitle`); harness printed `title: Product Manager -> function: Product Manager` |
| Verdict is **Partial / 50%** (1 of 2 standard hats covered) | `proven` | Deterministic in `decode.mjs:57-59` given the matched set |
| The **headline verdict was stable across two runs** | `observed` | Background run returned 14 items, this run 17; **both** gave Product Management = covered, Account Management = missing → 50% both times. The score was reproducible even though the item list was not. |
| Product Management's "covered" is well-supported (not a fluke single match) | `observed` | Receipt shows 3 independent signals: Roadmap, Strategy Definition, Product Roadmap Maintenance |

Correction to the earlier live render: it implied the *result* was shaky because of run-to-run variance. More precisely — the **detail** moved (14 vs. 17 items), the **headline did not**.

### Does not hold up / flagged

| Claim | State | Finding |
|---|---|---|
| "9 added (non-standard) hats" | `observed` | Oversells it: several hats rest on a **single** signal. |
| Figma contributes modestly | `observed` | **Figma alone confers 3 hats.** UX Writing and Graphic Design are **Figma-only**; it also feeds UX Design and UX Research. Remove Figma and two hats disappear. |
| `Creating REST APIs → Development` | `inferred` | **Likely false positive.** The posting says the PM *defines* APIs/SLAs, not that they build them; the model reached for an engineering activity on the word "APIs." This is auditor judgment, not proven — a labeled fixture would settle it. |
| Coverage audit "3 lines matched, 14 unplaced" | `observed` | **Undercounts the AI.** 17 items matched, but the line-level audit still credits only the keyword stage, because LLM matches are not line-attributed. A real reporting gap. |
| "This is the decode result" | `not-assessed` | A single decode is one sample from a sampling model; not reproducible item-for-item. No scored fixture exists for this posting yet. |

### Single-signal hats in this run (`observed`, from the receipt)

- **Project Management** ← Roadmap only
- **UX Writing** ← Figma only
- **Graphic Design** ← Figma only
- **Everyone** ← Creating Presentations only
- **Development** ← Creating REST APIs only (the likely false positive)

Well-supported hats (≥3 signals): Product Management, Product Ownership, Business Analysis.

### Net

The **title-fit answer is trustworthy** — this is a genuine Product Management role, not an account-management one. The **added-hats list is noisy** and partly an artifact of the decode mechanism: a single match, even a generic tool, can confer an entire hat.

---

## 2. Root-cause finding: the "has the hat" threshold is 1 (and tools count)

**Current rule:** a hat is marked **covered** (standard) or **added** (non-standard) if **one or more** matched leaf items roll up to it. There is **no count, no minimum, and no weighting**, and a **tool counts the same as an activity**.

Evidence (`proven`, code read):
- `decode.mjs:28-31` — every matched item (activity, deliverable, **or tool**) is rolled into one `matchedDuties` set via `itemDuties`.
- `decode.mjs:52-55` — a standard hat is covered iff `matchedDuties.has(d)`; any non-standard matched duty becomes an added hat.
- `decode.mjs:18` — the `BANDS` thresholds (strong 0.6 / partial 0.25) gate only the **overall** verdict on the **fraction** of standard hats covered. They do nothing for whether an **individual** hat is "shown."

This is why one "Figma" confers four UX hats and one "Creating REST APIs" confers "Development."

---

## 3. Open decision (owner: Morgan — not set here)

How many (and which kind of) signals should a posting show before it "has" a hat? Effect on **this** posting:

| Option | Rule for "has the hat" | Effect here |
|---|---|---|
| **A** (current) | ≥1 any leaf item | 9 added hats, incl. Figma-only UX Writing & Graphic Design |
| **B** | ≥1 item, but **tools alone don't count** | Drops UX Writing & Graphic Design (Figma-only) |
| **C** | **≥2 distinct items** | Drops every single-signal hat: Project Management, UX Writing, Graphic Design, Everyone, Development |
| **D** | ≥1 **activity** specifically (deliverable/tool can't stand alone) | Tightest; a hat must show actual work |

Auditor lean (non-binding): at least B (a generic tool should not confer a hat alone); C is defensible. The choice trades **recall of hats** (surface more for a job seeker to weigh) against **precision** (only hats the posting clearly demands). It is a product decision and changes what "covered" means, so it warrants an ADR when set.

---

## 4. Follow-ups this audit surfaces

1. **Set the hat threshold** (section 3) and record it as an ADR; it changes decode semantics.
2. **Fix the coverage audit** so LLM matches are reflected in `linesMatched` (or label the metric clearly as keyword-only line attribution).
3. **Hand-label this PM posting** and add it to `eval/fixtures.labeled.json` so claims like "Creating REST APIs is a false positive" become `observed`, not `inferred`.
4. **Decide tool→hat attribution**: should generic tools (Figma, ChatGPT) confer hats at all? ChatGPT and "AI Model" matched but rolled to no hat this run — inconsistent treatment worth a rule.

---

## Appendix — raw matched set (this run, 17 items)

```
Kickoff / Intake              → Business Analysis          [keyword+llm]
User Story Generation         → Business Analysis          [keyword]
Roadmap (deliverable)         → Product Ownership | Product Management | Project Management  [keyword+llm]
Identifying Priorities        → Product Ownership          [keyword+llm]
A/B Prototype Test Creation   → UX Research                [keyword]
Prototype Creation            → UX Design                  [keyword]
Collecting Analytics          → UX Research                [keyword]
Figma (tool)                  → UX Design | UX Research | UX Writing | Graphic Design  [keyword+llm]
ChatGPT (tool)                → (no hat)                   [keyword+llm]
Strategy Definition           → Product Management         [llm]
Product Roadmap Maintenance   → Product Management         [llm]
Product Backlog Maintenance   → Product Ownership          [llm]
Creating Presentations        → Everyone                   [llm]
Experiment Design             → UX Research                [llm]
Creating REST APIs            → Development                [llm]   ⚠ likely false positive
User Story Statements (deliv) → Business Analysis          [llm]
AI Model (tool)               → (no hat)                   [llm]
```

Standard hats: **Product Management** (covered), **Account Management** (missing). Verdict: Partial, 50%.
