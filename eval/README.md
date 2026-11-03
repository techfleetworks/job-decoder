# Eval harness

Measures how well the decode recognizes Skills and Practices Framework items in a
job posting, so we pick the OpenRouter model on evidence and prove the data flow
before building the app. It runs the same pipeline the app will use.

This is a developer tool. It is dependency-free (Node built-ins only) and makes no
change to the app.

## Run it

```bash
# keyword-only baseline, no network, no key needed
node eval/run.mjs --no-llm

# keyword + LLM (reads the key from the environment)
export OPENROUTER_API_KEY=...        # never pass the key on the command line
node eval/run.mjs                    # default model deepseek/deepseek-v4.1-flash-1017, pinned to US providers

# pick a model and the US-based provider allow-list (pinned, no fallback, data collection denied)
node eval/run.mjs --model deepseek/deepseek-v4.1-flash-1017 --providers deepinfra

# compare models on the same fixtures
node eval/run.mjs --model anthropic/claude-3.5-haiku
node eval/run.mjs --model google/gemini-flash-1.5

# use your own labeled postings, list every matched item
node eval/run.mjs --fixtures ./my-postings.json --detail
```

Requires Node 18 or newer (uses the built-in `fetch`).

## What it measures

For each posting it predicts the set of framework leaf items (activities,
deliverables, tools) the posting describes, and compares that to the human-labeled
set in the fixture. It reports precision, recall, and F1 per entity type and
overall, micro-averaged across fixtures. It also prints the decoded result
(resolved function, covered / missing / non-standard hats, match percent, and the
title-fit verdict) so you can eyeball it.

It also prints a **coverage audit**: every posting line is accounted for as either
matched or unplaced, so no line is silently ignored. This is line-accountability
(100% of lines audited), not matching accuracy. A line can be audited and still be
matched wrong or missed; that is a separate, measured property.

## The pipeline

1. **Resolve the title** to a job function by slug. An unknown title stays
   unresolved; it is never guessed (`lib/framework.mjs`).
2. **Keyword match** the posting against every leaf item, scoped to a single line
   or sentence, with an `exact` tier (the whole label as a phrase), an `alias` tier
   (a translator-table phrasing, e.g. "prototyping" to Prototype Creation), or a
   `similar` tier (all of the label's content words in one line). Scoping stops a
   match from being assembled out of common words scattered across a long posting.
   This always runs and is the fallback (`lib/match.mjs`, aliases from
   `../aliases.json`). Run with `--no-aliases` to measure the alias lift.
3. **LLM recognize** (optional): the model is handed the candidate items and the
   posting and may return only candidate slugs; each is validated against the
   framework before use (`lib/openrouter.mjs`).
4. **Union** the keyword and validated-LLM matches (`lib/match.mjs`).
5. **Roll up** each matched item to the hat that is Responsible for it: a posting
   that names an activity or deliverable means the poster is Responsible for it, so
   the hat is the activity's "Who's Responsible?" duty or the deliverable's owning
   duty, not Accountable / Consulted / Informed (ADR-0021). Tools roll up to the
   duties that require them (`lib/framework.mjs`, `lib/decode.mjs`).
6. **Classify** against the function's standard hats into covered, missing, and
   non-standard, then compute the match percent and the title-fit verdict
   (`lib/decode.mjs`).

## Translator table (aliases)

Real postings rarely use the framework's exact labels. The translator table maps
common posting wording to SPF items ("prototyping" to Prototype Creation, "journey
mapping" to Customer Experience Mapping, "IA" to Developing Information
Architecture, "specifications" to Writing Requirements). It is built from a
934-posting corpus (Greenhouse + Lever + Ashby) plus domain knowledge, lives in
`translator-table.csv` (the source of truth, with a document-frequency column), and
is generated into `aliases.json` for the matcher. Only leaf entities (activity,
deliverable, tool) feed the matcher; skills and duties are reference. It grows from
the unplaced lines of new postings. See ADR-0020.

## Fixtures

A fixture is a posting with the items a human says it describes:

```json
{
  "name": "UX Designer posting",
  "title": "UX Designer",
  "posting": "…the full posting text…",
  "expected": {
    "activities": ["wireframing", "prototype-creation"],
    "deliverables": [],
    "tools": ["figma"]
  }
}
```

`expected` uses framework **slugs**, not labels. A fixture with no `expected` set
is still decoded and printed, but not scored.

Two fixture files ship:

- `fixtures.example.json` is illustrative only (two postings). It is the default so
  `node eval/run.mjs` runs with no setup.
- `fixtures.labeled.json` is the hand-labeled starter set used for model selection
  (T12). Run it with `--fixtures eval/fixtures.labeled.json`.

```bash
# keyword-only baseline on the labeled set (no key, no network)
node eval/run.mjs --no-llm --fixtures eval/fixtures.labeled.json

# compare a model against the same labels
node eval/run.mjs --fixtures eval/fixtures.labeled.json --model deepseek/deepseek-v4.1-flash-1017
```

**Labeling convention** (so the labels are repeatable, not a vibe): the postings are
original text written in natural hiring language, not verbatim real postings, so no
copyrighted posting is reproduced and the wording deliberately avoids the framework's
exact labels. The `expected` set is what a human reader says the posting describes:
an **activity** when the posting describes doing the work, a **deliverable** when it
names the artifact produced, a **tool** when it is named. Labels are a human judgment
and reasonable readers can differ at the margin; they are ground truth pending review,
not an oracle. The set covers a strong-match posting for eight of the eleven covered
job functions (ui-designer, ux-writer, and agile-coach are not yet covered) plus a
title-fit mismatch and a not-covered title (both unscored); expand it with more
postings, and the missing functions, before trusting the aggregate. The harness
validates every expected slug against the framework at load and aborts if one is not a
leaf item of the declared type, so a mistyped label fails loud instead of silently
lowering the score.

## Security

- The OpenRouter key is read from `OPENROUTER_API_KEY` only. It is never logged,
  printed, or written to disk, and never passed on the command line.
- The posting is untrusted. The prompt marks it as data, and because the model may
  return only candidate slugs and every slug (and any supplied quote) is validated
  against the framework and the posting, a prompt-injected instruction cannot add a
  fake item or change the result.
- The endpoint is fixed, so there is no user-controlled URL (no SSRF).
- The request is pinned to a US-based provider allow-list (`--providers` or
  `OPENROUTER_PROVIDERS`, default `deepinfra`) with no fallback, and data collection is
  always denied, so the posting only reaches a US-based provider that will not retain or
  train on it, or the call fails closed to keyword-only. Honest limit: OpenRouter does not
  expose a provider's datacenter country, so this pins to US-based provider companies, not a
  guaranteed US datacenter (ADR-0036).
- The LLM call has a timeout; a failure degrades to the keyword-only result rather
  than blocking.

These are the harness controls. The executable `@security` scenarios for the
production `/api/decode` route are tracked under backlog ticket T13.

## Honest limits

- The hand-labeled starter set (`fixtures.labeled.json`) gives a measured keyword
  baseline (`observed`): high precision, low recall, because the postings paraphrase
  the work rather than naming framework items, which is the gap the LLM step exists to
  close. The LLM precision and recall are still `not-assessed` until the model is run
  against the same labels (needs `OPENROUTER_API_KEY`). The **accuracy threshold** that
  gates model selection is a decision for Morgan, not set here. The labels themselves
  are human judgment, so the aggregate is only as good as the label set and its size.
- The keyword matcher is lexical (exact and similar token matching, scoped to a
  line). It does not stem or understand paraphrase, which is exactly the gap the LLM
  step is meant to close and the reason this harness exists: to measure whether it
  does.
- The coverage audit guarantees 100% line-accountability (every line is matched or
  shown as unplaced), by construction. It does not guarantee matching accuracy: a
  line can be audited and still be matched wrong or missed. Accuracy is measured,
  not guaranteed, and is what the LLM step and labeled data improve.
- The decode matches across all leaf items so it can surface non-standard hats;
  the title is used for classification, not to narrow matching.
