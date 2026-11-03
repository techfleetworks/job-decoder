# WCAG 2.2 AA conformance record (Hat Check, T14)

This is the manual-verdict ledger for Hat Check's accessibility. It gives every applicable
WCAG 2.2 Level A and AA success criterion a verdict with a re-runnable source. Because WCAG 2.2
is the superset, meeting it also satisfies Section 508 (WCAG 2.0 A/AA) and the ADA Title II web
standard (WCAG 2.1 AA).

- **Date of this pass:** 2026-11-03
- **Reviewer:** Morgan (mdenner@techfleet.org), with Claude Code
- **Scope:** the whole app: the input screen, the results stepper, the prep stepper, the
  How-it-works dialog, and the About page (`app/` + `src/components/`).
- **Target deployment:** job-decoder-zeta.vercel.app (the AI step is off there, so results are
  the keyword-only "basic read"; the UI is identical either way).

## Evidence states

- `pass-automated` — covered by the axe component tests (`jest-axe`), which run in CI.
- `pass-manual (a11y tree)` — verified this session by driving the live site: keyboard-only
  operation and inspection of the accessibility tree (name/role/state), computed contrast,
  target sizes, and reflow. This approximates what a screen reader exposes; it is not an audio
  screen-reader pass.
- `not-applicable` — with a reason.

**Honest limit (stated, not hidden):** an audio screen-reader pass with a real reader (NVDA,
JAWS, VoiceOver, or TalkBack) has **not** been run. The accessibility-tree inspection confirms
the names, roles, states, and live regions a reader would use, but hearing them is a remaining
human step. No criterion below is marked `pass-manual` on audio evidence it does not have.

## Perceivable

| Criterion | Level | Verdict | Evidence |
|---|---|---|---|
| 1.1.1 Non-text Content | A | pass-manual (a11y tree) | No informative images. MUI Alert severity icons are decorative and carry accompanying text; the icon buttons in the UI are text buttons. |
| 1.3.1 Info and Relationships | A | pass-manual (a11y tree) | `main`/`footer` landmarks; semantic `ul`/`ol`/`li`; `h1`→`h2`→`h3` in order; fields are `input`/`textarea` with associated labels (observed: both fields report an accessible name and `aria-describedby`). |
| 1.3.2 Meaningful Sequence | A | pass-manual (a11y tree) | Single-column DOM order matches visual order. |
| 1.3.4 Orientation | AA | pass-manual (a11y tree) | No orientation lock; responsive single column. |
| 1.3.5 Identify Input Purpose | AA | not-applicable | The two fields (job title, job posting) collect data about the posting, not about the user, so no `autocomplete` token applies. |
| 1.4.1 Use of Color | A | pass-manual (a11y tree) | Links are always underlined; validation errors are text, not color; the basic-read note is text. |
| 1.4.3 Contrast (Minimum) | AA | pass-manual (a11y tree) | Observed computed ratios: body/headings 17.4:1, secondary text 8.86:1, primary button (white on #1b3a5b) 11.65:1, links 11.65:1, info Alert 9.58:1. All ≥ 4.5:1. |
| 1.4.4 Resize Text | AA | pass-manual (a11y tree) | Type in rem; layout is fluid; no fixed pixel heights that clip text. |
| 1.4.5 Images of Text | AA | not-applicable | No images of text. |
| 1.4.10 Reflow | AA | pass-manual (a11y tree) | No horizontal overflow observed (`scrollWidth === clientWidth`); layout is a single fluid MUI `Container`, buttons stack vertically. (Full 320px-emulation check is a recommended repeat.) |
| 1.4.11 Non-text Contrast | AA | pass-manual (a11y tree) | Button and text-field borders use the ≥3:1 primary/`#4a4a4a` tokens; focus ring is the browser default on a white surface. |
| 1.4.12 Text Spacing | AA | pass-manual (a11y tree) | Line-height 1.6 on body; no fixed-height text containers. |
| 1.4.13 Content on Hover or Focus | AA | not-applicable | No custom hover/focus tooltips or popovers. |

## Operable

| Criterion | Level | Verdict | Evidence |
|---|---|---|---|
| 2.1.1 Keyboard | A | pass-manual (a11y tree) | All controls are native `button`/`a`/`input`; the flow was completed by keyboard, including the stepper and the dialog. |
| 2.1.2 No Keyboard Trap | A | pass-manual (a11y tree) | The dialog is exitable with Escape (observed: dialog closed and focus returned to its trigger). |
| 2.1.4 Character Key Shortcuts | A | not-applicable | No single-character shortcuts. |
| 2.4.1 Bypass Blocks | A | not-applicable | No repeated block of navigation to bypass (single `main`, a one-link footer). |
| 2.4.2 Page Titled | A | pass-manual (a11y tree) | `document.title` is "Hat Check" (observed). |
| 2.4.3 Focus Order | A | pass-manual (a11y tree) | **Fixed this pass.** Results moves focus to the verdict heading on mount and to the step heading on each step change (observed). PrepView now moves focus to its heading on entry, and returning to the form moves focus to its heading; both previously dropped focus to `<body>` (observed before the fix). The dialog returns focus to its trigger on close (observed). |
| 2.4.4 Link Purpose (In Context) | A | pass-manual (a11y tree) | Link text states the destination ("License and attribution", "View the source code", the credit line). |
| 2.4.6 Headings and Labels | AA | pass-manual (a11y tree) | One descriptive `h1` per screen; step headings name the step; field labels are descriptive. |
| 2.4.7 Focus Visible | AA | pass-manual (a11y tree) | Default focus ring is not removed anywhere; visible on the white surface. |
| 2.4.11 Focus Not Obscured (Minimum) | AA | pass-manual (a11y tree) | No sticky/overlay chrome; focused controls are not covered. |
| 2.5.3 Label in Name | A | pass-manual (a11y tree) | Every control's accessible name is its visible text; no `aria-label` overrides the visible label. |
| 2.5.7 Dragging Movements | AA | not-applicable | No drag interactions. |
| 2.5.8 Target Size (Minimum) | AA | pass-manual (a11y tree) | Observed: no interactive target under 24×24 CSS px; buttons enforce a 44px min height (theme). |

## Understandable

| Criterion | Level | Verdict | Evidence |
|---|---|---|---|
| 3.1.1 Language of Page | A | pass-automated | `<html lang="en">` (observed; axe checks it). |
| 3.2.1 On Focus | A | pass-manual (a11y tree) | Focusing a control triggers no context change. |
| 3.2.2 On Input | A | pass-manual (a11y tree) | Typing triggers no automatic submit or navigation; the user presses the button. |
| 3.2.3 Consistent Navigation | AA | pass-manual (a11y tree) | Footer and credit appear in the same relative place across screens. |
| 3.2.4 Consistent Identification | AA | pass-manual (a11y tree) | The same controls ("Decode another posting", "How it works") keep the same name wherever they appear. |
| 3.2.6 Consistent Help | A | not-applicable | No persistent help mechanism; "How it works" is content, in a consistent place. |
| 3.3.1 Error Identification | A | pass-manual (a11y tree) | Empty fields show text errors ("Enter the job title."); a server error renders in an Alert with `role="alert"` (observed role=alert). |
| 3.3.2 Labels or Instructions | A | pass-manual (a11y tree) | Every field has a visible label and helper text with an example. |
| 3.3.3 Error Suggestion | AA | pass-manual (a11y tree) | The error text says what to do ("Enter the job title.", "Paste the job posting."). |
| 3.3.7 Redundant Entry | A | not-applicable (pass) | A single-step form; nothing is asked twice. |
| 3.3.8 Accessible Authentication (Minimum) | AA | not-applicable | No authentication; no accounts. |

## Robust

| Criterion | Level | Verdict | Evidence |
|---|---|---|---|
| 4.1.2 Name, Role, Value | A | pass-manual (a11y tree) | Native controls expose correct roles; the dialog has `role="dialog"`, an accessible name via `aria-labelledby`, and now `aria-modal` (**added this pass**); the stepper's Next/Back are real buttons with disabled state. |
| 4.1.3 Status Messages | AA | pass-manual (a11y tree) | The "reading the posting" state is a visually hidden `role="status"` live region; the copy buttons now announce success/failure in a `role="status"` live region (**added this pass**); the basic-read note renders in `role="alert"`. |

## Findings fixed in this pass

1. **PrepView dropped focus to `<body>` on entry** (2.4.3). Now focuses its heading on mount,
   matching the Results pattern. (`src/components/PrepView.tsx`)
2. **"Decode another posting" dropped focus to `<body>`** (2.4.3). Returning to the form now
   moves focus to its heading, without stealing focus on first load.
   (`src/components/InputForm.tsx`, `src/components/DecodeFlow.tsx`)
3. **The dialog had no `aria-modal`** (4.1.2 best practice). Added `aria-modal`.
   (`src/components/HowItWorks.tsx`)
4. **Copy buttons gave no feedback and failed silently** (4.1.3). They now announce the result
   in a live region, and a blocked clipboard reports the manual-selection fallback instead of
   logging only to the console. (`src/components/PrepView.tsx`)

## How to re-run the evidence

- Automated: `npm run test:run` runs the `jest-axe` component tests (zero violations required).
- Manual (a11y tree): load the deployed app, complete the flow by keyboard only, and inspect
  `document.activeElement`, the accessibility tree, computed contrast, and
  `document.documentElement.scrollWidth` at narrow widths (the method used for this record).

## Remaining human step

Run an audio screen-reader pass (NVDA or JAWS on Windows, VoiceOver on macOS/iOS, TalkBack on
Android) across the input → results → prep → dialog flow, and record it here as a `pass-manual`
verdict with the reader and date. That is the one check this record does not yet carry.
