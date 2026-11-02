// The deterministic keyword matcher, scoped to a line or sentence so a match needs the
// label's words to appear together, not scattered across a long posting. Tiers, strongest
// first: exact (the whole label on token boundaries in one unit), alias (a reviewed
// translator-table phrase, carried on the item in the snapshot), similar (every content
// token of a two-word-or-longer label in one unit). This mirrors the eval harness
// (pipeline/lib relations and the match step) that validated the approach.
//
// It returns a coverage record too: one entry per unit, listing the items matched there.
// Units with no match are "unplaced." Matched and unplaced units together are every unit,
// by construction, so no line is silently dropped. That is line-accountability, not
// matching accuracy.

import { contentTokens, includesPhrase, normalize, splitUnits } from "./text";
import type { CoverageUnit, Match, MatchTier, SnapshotItem } from "./types";

const TIER_RANK: Record<MatchTier, number> = { similar: 1, alias: 2, exact: 3 };

export function keywordMatch(
  postingText: string,
  items: SnapshotItem[],
): { matches: Match[]; coverage: CoverageUnit[] } {
  const units = splitUnits(postingText ?? "");
  const unitNorm = units.map(normalize);
  const unitTokens = unitNorm.map((n) => new Set(n ? n.split(" ") : []));

  const info = items.map((it) => ({
    it,
    key: `${it.type}:${it.slug}`,
    labelNorm: normalize(it.label),
    ct: contentTokens(it.label),
    aliases: it.aliases.map((a) => ({ raw: a, norm: normalize(a) })).filter((a) => a.norm),
  }));

  const bestByItem = new Map<string, Match>();
  const coverage: CoverageUnit[] = units.map((u, i) => ({ index: i, unit: u, items: [] }));

  for (let i = 0; i < units.length; i++) {
    const hay = unitNorm[i]!;
    const haySet = unitTokens[i]!;
    for (const rec of info) {
      let tier: MatchTier | null = null;
      let term = rec.it.label;
      if (rec.labelNorm && includesPhrase(hay, rec.labelNorm)) {
        tier = "exact";
      } else {
        for (const a of rec.aliases) {
          if (includesPhrase(hay, a.norm)) {
            tier = "alias";
            term = a.raw;
            break;
          }
        }
        if (!tier && rec.ct.length >= 2 && rec.ct.every((t) => haySet.has(t))) tier = "similar";
      }
      if (!tier) continue;
      const unitRec = coverage[i]!;
      if (!unitRec.items.includes(rec.key)) unitRec.items.push(rec.key);
      const prev = bestByItem.get(rec.key);
      if (!prev) {
        bestByItem.set(rec.key, {
          slug: rec.it.slug,
          type: rec.it.type,
          label: rec.it.label,
          tier,
          term,
          via: ["keyword"],
          duties: rec.it.duties,
          unit: i,
        });
      } else if (TIER_RANK[tier] > TIER_RANK[prev.tier]) {
        prev.tier = tier;
        prev.term = term;
        prev.unit = i;
      }
    }
  }
  return { matches: [...bestByItem.values()], coverage };
}

// Union of one or more match lists, keyed by type and slug. The stronger tier wins, the
// sources merge so the receipt can show keyword, llm, or both, and a quote is kept.
export function unionMatches(...lists: Match[][]): Match[] {
  const byKey = new Map<string, Match>();
  for (const list of lists) {
    for (const m of list) {
      const key = `${m.type}:${m.slug}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { ...m, via: [...m.via] });
        continue;
      }
      for (const v of m.via) if (!prev.via.includes(v)) prev.via.push(v);
      if (TIER_RANK[m.tier] > TIER_RANK[prev.tier]) prev.tier = m.tier;
      if (!prev.quote && m.quote) prev.quote = m.quote;
    }
  }
  return [...byKey.values()];
}
