# Job Decoder

Paste a job posting and see the real responsibilities behind the title: the ones
it names, the ones it expects but left out, and the ones that do not usually
belong. Then see how to prove you can do them on your resume.

Every answer is grounded in the
[Tech Fleet Skills & Practices Framework](https://github.com/techfleetworks/skills-and-practices-framework),
an open standard, so you get facts about the role instead of guesses.

## Privacy

No account. No sign-up. Everything you enter stays in your browser on your
device and is never sent to a server.

## Status

Early build. **Phase 0 (foundation) is in place:** project scaffold, accessible
responsive app shell, the privacy statement, and the licensing/attribution page.
The job-matching tools arrive in later phases. See the build order in the project
handoff.

## Tech stack

Static single-page app with no backend. React 18 + TypeScript, built with Vite.
See [ADR-0001](docs/adr/0001-static-spa-no-backend-local-only.md) and
[decisions.md](decisions.md).

## Develop

```bash
npm install     # install dependencies
npm run dev     # start the dev server
npm run build   # type-check and build static files into dist/
npm run preview # preview the production build
npm run test    # run the test suite (Vitest + Testing Library + jest-axe)
```

## Licenses

- This application's code is released under the [MIT License](LICENSE).
- The Skills & Practices Framework by Tech Fleet is licensed under CC BY 4.0.
  Attribution is shown wherever the data appears. Source:
  https://github.com/techfleetworks/skills-and-practices-framework
