# Hat Check

Paste one job posting and see the real responsibilities behind the title: the ones it
names, the ones it expects but leaves out, and the ones that do not usually belong.
Then turn the result into concrete application prep.

Every answer is grounded in the
[Tech Fleet Skills and Practices Framework](https://github.com/techfleetworks/skills-and-practices-framework),
an open standard, so you get facts about the role instead of guesses. The framework is
the source of truth; the AI only recognizes which framework items the posting's
wording describes, and it decides nothing.

## What it does (MVP 1)

Hat Check decodes one posting and explains the job, not the candidate. It:

- resolves your job title to a framework job function, and says so plainly when a
  title is not covered;
- sorts the role's hats (duties) into three sets: covered by the posting, expected but
  missing, and present but not standard for the title;
- gives a match score and a title-fit verdict (strong, partial, or mismatch);
- shows a receipt, every match tied to the exact words in the posting, and lists the
  lines it could not place;
- turns the result into application prep: resume skills and highlights, ATS keywords,
  and cover-letter and interview points, all built from the framework.

It asks nothing about you and keeps no history. See
[ADR-0005](docs/adr/0005-mvp1-scope-job-not-candidate.md) for the full scope and what
is deferred to a later phase.

## Architecture

A three-tier app ([ADR-0006](docs/adr/0006-three-tier-architecture.md)):

- **Tier 1:** Next.js and Material UI, static on Vercel's CDN. Runs the screens and
  never holds a secret or touches the database.
- **Tier 2:** server code on Vercel. The `/api/decode` route holds the OpenRouter key
  and owns the decode logic; a build step reads the published framework version from
  Supabase and publishes a read-only snapshot to the CDN.
- **Tier 3:** Supabase Postgres, holding the framework data only (no user data), with
  row-level security on.

See [decisions.md](decisions.md) for the boundaries and [docs/adr/](docs/adr/) for
every decision.

## Privacy

No account and no sign-up. Your scan is kept only in the browser tab for the session
and is cleared when you close it ([ADR-0011](docs/adr/0011-session-only-state.md)). To
decode, the posting you paste is sent to our server and to an AI service (OpenRouter)
to analyze; you are told before you submit, and the posting is never stored or logged.
This replaces the earlier "nothing leaves your device" plan.

## Status

In active build. The decisions of record (ADRs 0001 to 0025) and the eval harness that
validates the matching approach are in place. The three-tier app, data tier, decode
engine, screens, and quality gates are being built in sequence; see the pending list
in [decisions.md](decisions.md) and the backlog in Notion.

## Develop

The eval harness runs today (dependency-free, Node 18+). The Next.js app scripts
arrive with the app-platform work (T10).

```bash
node eval/run.mjs --no-llm          # keyword-only accuracy on the example fixtures
node eval/run.mjs --model <model-id>  # add the grounded LLM pass (needs OPENROUTER_API_KEY)
```

## Licenses

- This application's code is released under the [MIT License](LICENSE), copyright Tech
  Fleet.
- The Skills and Practices Framework by Tech Fleet is licensed under CC BY 4.0.
  Attribution is shown wherever the data appears. Source:
  https://github.com/techfleetworks/skills-and-practices-framework
