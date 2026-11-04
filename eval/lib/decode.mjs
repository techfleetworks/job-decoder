// The decode pipeline, shared shape with the app route (src/domain/decode):
//   resolve title -> keyword match (always) union validated LLM match
//   -> roll up matched items to hats via RACI -> score each hat by the share of
//   its work the posting names -> match levels and the title-fit verdict.
//
// Scoring is proportional (ADR-0039): a hat's score is its matched activities and
// deliverables over all the activities and deliverables that roll up to it, both via the
// same Responsible roll-up (ADR-0021). Full at 25% or more, partial above 0 and under 25%,
// none at 0. Tools and the "everyone" duty never count. The overall title-fit is Formula D:
// a full hat counts 1, a partial 0.5, over all the title's standard hats.
//
// It also carries a coverage audit: one record per posting line, each either matched to
// items or marked unplaced. Every line is accounted for, by construction.
//
// This is the build-time twin of src/domain/decode; the two carry the same algorithm and
// the T12 accuracy gate runs these fixtures so they cannot drift silently (ADR-0028).

import { resolveTitle, itemDuties } from './framework.mjs';
import { keywordMatch, unionMatches } from './match.mjs';

// Title-fit verdict bands (ADR-0018, unchanged by ADR-0039).
export const BANDS = { strong: 0.6, partial: 0.25 };

// A hat is "full" at this share of its activities + deliverables (ADR-0039). Locked.
export const FULL_THRESHOLD = 0.25;

// Per-hat proportional score (ADR-0039) for a set of item references [{ slug, type }], via
// the Responsible roll-up (ADR-0021). Tools and the "everyone" duty never count, so the
// share is 0..1. Returns Map<dutySlug, { num, den, score, level }> for every duty that owns
// at least one activity or deliverable, plus any matched duty. This is the single owner of
// the per-hat math in the eval twin: decodePosting (predicted) and the harness's expected-
// level check both call it, so they cannot diverge.
export function scoreHats(fw, itemRefs) {
  const totals = new Map();
  for (const it of fw.items) {
    if (it.type === 'tool') continue;
    for (const d of itemDuties(fw, it)) if (d !== 'everyone') totals.set(d, (totals.get(d) ?? 0) + 1);
  }
  const num = new Map();
  for (const m of itemRefs) {
    if (m.type === 'tool') continue;
    for (const d of itemDuties(fw, m)) {
      if (d === 'everyone') continue;
      if (!num.has(d)) num.set(d, new Set());
      num.get(d).add(m.slug);
    }
  }
  const out = new Map();
  for (const d of new Set([...totals.keys(), ...num.keys()])) {
    const n = num.get(d)?.size ?? 0;
    const den = totals.get(d) ?? 0;
    const score = den > 0 ? n / den : 0;
    const level = n === 0 ? 'none' : score >= FULL_THRESHOLD ? 'full' : 'partial';
    out.set(d, { num: n, den, score, level });
  }
  return out;
}

export function decodePosting(fw, fixture, llmMatches, aliasMap) {
  const fnSlug = resolveTitle(fw, fixture.title);

  const { matches: keyword, coverage } = keywordMatch(fixture.posting, fw.items, aliasMap);
  const llm = Array.isArray(llmMatches) ? llmMatches : [];
  const matched = unionMatches(keyword, llm);

  const result = {
    fnSlug,
    matched,
    standard: [],
    covered: [],
    missing: [],
    nonStandard: [],
    hats: {}, // slug -> { num, den, score, level } for standard + matched non-standard hats
    pct: 0,
    verdict: 'not-covered',
    // Line-accountability audit: every unit is matched or unplaced.
    linesAudited: coverage.length,
    linesMatched: coverage.filter((c) => c.items.length > 0).length,
    unplaced: coverage.filter((c) => c.items.length === 0).map((c) => c.unit),
    coverage,
  };

  if (!fnSlug) return result; // title not covered: report honestly, do not guess

  const hats = scoreHats(fw, matched);
  const scoreFor = (d) => hats.get(d) ?? { num: 0, den: 0, score: 0, level: 'none' };
  const standard = fw.functionToDuties.get(fnSlug) ?? new Set();
  result.standard = [...standard].filter((d) => d !== 'everyone');
  for (const d of result.standard) {
    const s = (result.hats[d] = scoreFor(d));
    (s.level === 'none' ? result.missing : result.covered).push(d);
  }
  for (const [d, s] of hats) {
    if (standard.has(d) || d === 'everyone' || s.level === 'none') continue;
    result.hats[d] = s;
    result.nonStandard.push(d);
  }

  // Overall title-fit, Formula D (ADR-0039): full counts 1, partial 0.5, over all standard hats.
  const weighted = result.covered.reduce((sum, d) => sum + (result.hats[d].level === 'full' ? 1 : 0.5), 0);
  result.pct = result.standard.length ? weighted / result.standard.length : 0;
  result.verdict =
    result.pct >= BANDS.strong ? 'strong' : result.pct >= BANDS.partial ? 'partial' : 'mismatch';
  return result;
}
