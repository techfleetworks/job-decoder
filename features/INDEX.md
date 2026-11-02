# BDD scenario index

Generated from the feature files by `npm run bdd:index`. Do not edit by hand.

| Domain | Feature | Scenario | Audience | Use case | Category | Quality | Severity | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| architecture | The architecture gate holds the tier boundaries | A hard-coded color in a component is blocked | engineer | gate-literal-color | negative | functional | low | covered |
| architecture | The architecture gate holds the tier boundaries | A secret in the server tier is allowed | engineer | gate-server-secret-ok | boundary | security | high | covered |
| architecture | The architecture gate holds the tier boundaries | A server-only secret in client code is blocked | engineer | gate-secret | permission | security | critical | covered |
| architecture | The architecture gate holds the tier boundaries | localStorage in client code is blocked | engineer | gate-session-only | negative | functional | high | covered |
| architecture | The architecture gate holds the tier boundaries | The database client in browser code is blocked | engineer | gate-db-client | permission | security | critical | covered |
| architecture | The architecture gate holds the tier boundaries | The real source tree passes the gate | engineer | gate-clean | happy | functional | high | covered |
| data-tier | The framework data tier and snapshot build | A dangling framework link fails the build | engineer | integrity-dangling | error | functional | critical | covered |
| data-tier | The framework data tier and snapshot build | A function and duty that disagree fail the build | engineer | integrity-disagree | error | functional | critical | covered |
| data-tier | The framework data tier and snapshot build | The content hash does not depend on record order | engineer | content-hash-stable | boundary | reliability | medium | covered |
| data-tier | The framework data tier and snapshot build | The framework tables are closed to the browser | engineer | framework-rls | permission | security | critical | covered |
| data-tier | The framework data tier and snapshot build | The pinned framework data builds the snapshot read model | engineer | snapshot-build | happy | functional | high | covered |
| decode | Decode a job posting into the hats it expects | A covered title with matching work reads as a strong fit | job-seeker | decode-covered | happy | functional | high | covered |
| decode | Decode a job posting into the hats it expects | An expected hat that is not named is reported as missing | job-seeker | decode-missing | boundary | functional | high | covered |
| decode | Decode a job posting into the hats it expects | An unknown title is reported as not covered, never guessed | job-seeker | decode-not-covered | negative | functional | high | covered |
| decode | Decode a job posting into the hats it expects | Every posting line is accounted for | job-seeker | decode-line-audit | happy | reliability | medium | covered |
| decode | Decode a job posting into the hats it expects | Work the title does not normally cover is shown as non-standard | job-seeker | decode-non-standard | adverse | functional | medium | covered |
| resume-prep | Prepare your application from the hats | A posting with no non-standard hats has no extra-scope items | job-seeker | prep-empty-set | empty-overflow | functional | medium | covered |
| resume-prep | Prepare your application from the hats | An ATS keyword appears only once | job-seeker | prep-ats-dedup | boundary | functional | medium | covered |
| resume-prep | Prepare your application from the hats | An uncovered title gets no prep guide | job-seeker | prep-not-covered | negative | functional | high | covered |
| resume-prep | Prepare your application from the hats | Each activity has an outcome template with blanks and no made-up numbers | job-seeker | prep-outcomes | happy | functional | medium | covered |
| resume-prep | Prepare your application from the hats | Every prep item traces to a hat | job-seeker | prep-traceable | happy | functional | high | covered |
| resume-prep | Prepare your application from the hats | Resume skills are split and the hidden hat comes first | job-seeker | prep-skills | happy | functional | high | covered |
| screens | The result screen speaks plainly | A keyword-only result is labeled a basic read | job-seeker | screen-basic-read | boundary | functional | medium | covered |
| screens | The result screen speaks plainly | A strong fit says so in plain words | job-seeker | screen-strong-headline | happy | functional | medium | covered |
| screens | The result screen speaks plainly | An uncovered title is reported honestly with no percentage | job-seeker | screen-not-covered | negative | functional | high | covered |

Total: 25 scenario(s).
