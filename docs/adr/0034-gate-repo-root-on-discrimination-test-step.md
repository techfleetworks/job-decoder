# ADR-0034: Pin GATE_REPO_ROOT on the gate discrimination-test step

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0047 (upstream genesis)](../../gate-manifest.json) via the `esk-genesis`-generated `enterprise-gates` workflow.

## Context

The enterprise gate scripts resolve their default repo root by walking **four levels up** from the
script (`scripts/ci/check-*.mjs` → `REPO_ROOT = resolve(SCRIPT_DIR, "..", "..", "..", "..")`). That depth
is correct for the gate's *upstream* home (`.claude/skills/judge-arch/scripts/`), but in a consumer the
gate is vendored at `scripts/ci/`, where four levels up overshoots the repo and lands on the runner's
parent work directory (`/home/runner/work`), which holds `_actions/` (GitHub's downloaded-action cache).

The generated `enterprise-gates.yml` works around this by setting `GATE_REPO_ROOT` on the **gate run**
step, so the gate run itself is fine. But it omitted that env on the **discrimination-test** step. The
`reference-links` discrimination suite includes a "the real repository has no dangling references" case
that spawns the gate with **no `--root`** (`test/reference-links.test.mjs:137`). Inheriting a test-step
env without `GATE_REPO_ROOT`, that spawn fell back to the four-levels-up default, scanned `_actions/`, and
failed on two dangling links inside `actions/checkout`'s own README — files that are not part of this
repo. The gate run passed; only its discrimination test, run in that step, failed. This reds the required
`enterprise-gates` check on every PR, for a problem that does not exist in the repo.

The deepest fix (make the gate's root resolution layout-robust, e.g. walk up to the nearest `.git`) lives
in the vendored, hash-verified gate script, which is upstream's to change, not a consumer's to edit. The
consumer-side fix is to give the discrimination-test step the same root pin the gate step already has.

## Decision

- **Set `GATE_REPO_ROOT: ${{ github.workspace }}` on the discrimination-test step** of
  `.github/workflows/enterprise-gates.yml`, matching the gate-run step. A gate spawned by its test with no
  `--root` then resolves the repo root to the checkout, so the real-repo case scans this repo only.
- **The planted-violation discrimination cases are unaffected and still discriminate.** Every such case
  passes its own `--root` (which takes precedence over the env) or sets `GATE_REPO_ROOT` explicitly per
  spawn; only the one real-repo case, which deliberately uses the default root, changes behavior, and the
  change makes it correct. Verified locally: all 25 `reference-links` cases pass with the env pinned, and
  the "FAILS on ..." cases still return exit 1.
- **This is a deliberate divergence from the `esk-genesis`-generated workflow,** recorded here because the
  file is stamped "re-run esk-genesis to keep it current": a future regeneration from an unfixed template
  would silently revert this and re-red CI. The real resolution is an upstream genesis-template fix (set
  this env on the test step, or make the gate root resolution layout-robust), tracked alongside the
  existing genesis-gap issues #203/#204.
- **Confirmation.** The `enterprise-gates` → `gate (reference-links)` check is green on this PR with the
  fix, and red without it (the failing run is recorded on PR #15). The discrimination suite still returns
  exit 1 on planted violations, proving the pin did not neuter detection.

## Consequences

- The required `enterprise-gates` check stops failing on a runner-only directory the repo does not own,
  so PRs are no longer blocked by a false positive.
- **Honest limits:**
  - This patches the *symptom* in the generated workflow, not the *cause* in the gate script. Until the
    upstream template or gate is fixed, re-running `esk-genesis` here must re-apply this env (or pick up a
    fixed template). That re-application risk is the reason this ADR exists.
  - The pin relies on `GATE_REPO_ROOT` continuing to take precedence over the script default and to be
    overridable by `--root`; both are covered by the gate's own discrimination tests (ISSUE-121a/b), so a
    regression in that precedence would fail CI.

## Alternatives considered

- **Edit the vendored gate script to resolve the root robustly (walk up to `.git`/`package.json`).**
  Rejected here: the gate scripts are hash-verified and provenance-bound (the `manifest-provenance` and
  `skill-gate-parity` gates). Editing one in the consumer breaks parity and is upstream's call. Recorded as
  the recommended upstream fix instead.
- **Add `_actions` (and the runner work dir) to the gate's ignore set.** Rejected: it treats a root-
  resolution bug as an ignore-list problem, would have to be re-stated for every consumer, and leaves the
  default root pointing outside the repo, where the next stray directory causes the same failure.
- **Mark the check non-blocking / waive it.** Rejected: the gate is working as intended once pointed at the
  right root; the problem was the root, not the gate. Weakening a real gate to pass a false positive hides
  future true positives.
