// Deterministic keyword matcher, scoped to a line or sentence so a match needs
// the label's words to actually appear together, not scattered across a long
// posting. Tiers, strongest first:
//   exact   - the whole normalized label appears on token boundaries in one unit
//   alias   - a translator-table alias phrase appears on token boundaries in one unit
//   similar - every content token of the label appears in one unit (label >= 2)
// Single-word labels only ever match "exact" or via an alias.
//
// Aliases (the translator table) are how real-posting wording maps to SPF items:
// "prototyping" -> Prototype Creation, "journey mapping" -> Customer Experience
// Mapping, "IA" -> Developing Information Architecture. They are authored and
// reviewable, not inferred at runtime, so the framework stays the source of truth.
//
// It also returns a coverage record: one entry per unit, listing the items that
// matched there. Units with no match are the "unplaced" lines. The union of
// matched and unplaced units is every unit, by construction, so no line is ever
// silently dropped. That is line-accountability, not matching accuracy.

import { normalize, contentTokens, includesPhrase } from './text.mjs';

const TIER_RANK = { similar: 1, alias: 2, exact: 3 };

// Split on newlines, or on sentence enders followed by whitespace. The lookbehind
// keeps tokens like "Builder.io" intact (the period is not followed by a space).
export function splitUnits(text) {
  return String(text ?? '')
    .split(/\n+|(?<=[.!?])\s+/)
    .map((u) => u.trim())
    .filter(Boolean);
}

export function keywordMatch(postingText, items, aliasMap) {
  aliasMap = aliasMap || {};
  const units = splitUnits(postingText);
  const unitNorm = units.map(normalize);
  const unitTokens = unitNorm.map((n) => new Set(n ? n.split(' ') : []));

  const info = items.map((it) => {
    const key = it.type + ':' + it.slug;
    return {
      it,
      key,
      labelNorm: normalize(it.label),
      ct: contentTokens(it.label),
      aliases: (aliasMap[key] || []).map((a) => ({ raw: a, norm: normalize(a) })).filter((a) => a.norm),
    };
  });

  const bestByItem = new Map();
  const coverage = units.map((u, i) => ({ index: i, unit: u, items: [] }));

  for (let i = 0; i < units.length; i++) {
    const hay = unitNorm[i];
    const haySet = unitTokens[i];
    for (const rec of info) {
      let tier = null;
      let term = rec.it.label;
      if (rec.labelNorm && includesPhrase(hay, rec.labelNorm)) {
        tier = 'exact';
      } else {
        for (const a of rec.aliases) {
          if (includesPhrase(hay, a.norm)) { tier = 'alias'; term = a.raw; break; }
        }
        if (!tier && rec.ct.length >= 2 && rec.ct.every((t) => haySet.has(t))) tier = 'similar';
      }
      if (!tier) continue;
      if (!coverage[i].items.includes(rec.key)) coverage[i].items.push(rec.key);
      const prev = bestByItem.get(rec.key);
      if (!prev) {
        bestByItem.set(rec.key, { slug: rec.it.slug, type: rec.it.type, label: rec.it.label, tier, term, via: 'keyword', unit: i });
      } else if (TIER_RANK[tier] > TIER_RANK[prev.tier]) {
        prev.tier = tier; prev.term = term; prev.unit = i;
      }
    }
  }
  return { matches: [...bestByItem.values()], coverage };
}

// Union of one or more match lists, keyed by type + slug. Stronger tier wins,
// sources are merged so the receipt can show keyword, llm, or both.
export function unionMatches(...lists) {
  const byKey = new Map();
  for (const list of lists) {
    for (const m of list) {
      const key = m.type + ':' + m.slug;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { ...m, via: [].concat(m.via) });
        continue;
      }
      for (const v of [].concat(m.via)) if (!prev.via.includes(v)) prev.via.push(v);
      if ((TIER_RANK[m.tier] || 0) > (TIER_RANK[prev.tier] || 0)) prev.tier = m.tier;
      if (!prev.quote && m.quote) prev.quote = m.quote;
    }
  }
  // Meaning-confirmation (mechanism B, ADR-0047): a match the recognizer recognized carries
  // 'llm' in its sources, so it is meaning-confirmed; a keyword match it did not also recognize
  // is unconfirmed. Set once here from the final merged sources, identically to the app twin.
  return [...byKey.values()].map((m) => ({ ...m, confirmed: m.via.includes('llm') }));
}
