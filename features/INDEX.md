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

Total: 11 scenario(s).
