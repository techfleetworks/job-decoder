#!/usr/bin/env node
// Eval harness CLI. Measures decode accuracy against labeled job postings so the
// model is chosen on evidence, and proves the data flow before the app is built.
//
// Usage:
//   node eval/run.mjs                      keyword + LLM (needs OPENROUTER_API_KEY)
//   node eval/run.mjs --no-llm             keyword-only baseline, no network
//   node eval/run.mjs --model <id>         pick the OpenRouter model to test
//   node eval/run.mjs --fixtures <path>    use your labeled postings
//   node eval/run.mjs --detail             list every matched item
//
// The key is read from the environment only. It is never printed or written.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { loadFramework, loadAliases } from './lib/framework.mjs';
import { decodePosting, scoreHats } from './lib/decode.mjs';
import { recognize } from './lib/openrouter.mjs';
import { scoreFixture, aggregate } from './lib/score.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

function splitList(s) {
  return String(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const args = {
    llm: true,
    // Model and the US-based provider allow-list default from the environment, so the same
    // choice drives the harness and (later) the app. See .env.example and ADR-0036.
    model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324',
    providers: splitList(process.env.OPENROUTER_PROVIDERS || 'gmicloud'),
    fixtures: join(HERE, 'fixtures.example.json'),
    detail: false,
    aliases: true,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-llm') args.llm = false;
    else if (a === '--no-aliases') args.aliases = false;
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--providers') args.providers = splitList(argv[++i]);
    else if (a === '--fixtures') args.fixtures = resolve(argv[++i]);
    else if (a === '--detail') args.detail = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else {
      console.error('Unknown argument: ' + a);
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(
    [
      'Eval harness for Job Decoder',
      '',
      'Measures how well the decode recognizes framework items in a posting.',
      '',
      'Options:',
      '  --no-llm            keyword-only baseline, makes no network call',
      '  --model <id>        OpenRouter model id (default $OPENROUTER_MODEL or deepseek/deepseek-chat-v3-0324)',
      '  --providers <list>  comma-separated US-based provider allow-list, pinned with no',
      '                      fallback (default $OPENROUTER_PROVIDERS or gmicloud)',
      '  --fixtures <path>   JSON array of labeled postings (default fixtures.example.json)',
      '  --detail            list each matched item',
      '  --help              show this help',
      '',
      'Set OPENROUTER_API_KEY in the environment for the LLM step. The request pins to the',
      'provider allow-list with data collection denied (ADR-0036).',
    ].join('\n'),
  );
}

function countType(matches, type) {
  return matches.filter((m) => m.type === type).length;
}

function pct(x) {
  return (x * 100).toFixed(0) + '%';
}

function printFixture(fw, fx, res, detail) {
  const fn = res.fnSlug ? fw.functionName.get(res.fnSlug) : 'NOT COVERED';
  console.log(`\n- ${fx.name}`);
  console.log(`    title: ${fx.title}  ->  function: ${fn}`);
  if (res.fnSlug) {
    console.log(
      `    verdict: ${res.verdict} (match ${pct(res.pct)})  ` +
        `covered ${res.covered.length}/${res.standard.length}, ` +
        `missing ${res.missing.length}, non-standard ${res.nonStandard.length}`,
    );
  }
  console.log(
    `    matched items: ${res.matched.length} ` +
      `(${countType(res.matched, 'activity')} act, ` +
      `${countType(res.matched, 'deliverable')} del, ` +
      `${countType(res.matched, 'tool')} tool)`,
  );
  console.log(
    `    coverage audit: all ${res.linesAudited} lines accounted for ` +
      `(${res.linesMatched} with a framework match, ${res.unplaced.length} unplaced)`,
  );
  if (detail) {
    for (const m of res.matched) {
      const via = [].concat(m.via).join('+');
      const extra = m.tier === 'alias' && m.term ? ` <- "${m.term}"` : '';
      console.log(`      match: [${m.type}] ${m.label} (${m.slug}) ${m.tier}${extra} via ${via}`);
    }
    for (const u of res.unplaced) {
      console.log(`      unplaced: ${u.length > 90 ? u.slice(0, 90) + '...' : u}`);
    }
  }
}

function printMetrics(agg, n) {
  console.log(`\nAccuracy over ${n} labeled fixture(s), micro-averaged:`);
  for (const t of ['activity', 'deliverable', 'tool', 'overall']) {
    const m = agg[t];
    const empty = m.tp + m.fp + m.fn === 0;
    const cell = (x) => (empty ? ' n/a' : pct(x).padStart(4));
    console.log(
      `  ${t.padEnd(11)} P ${cell(m.precision)}  ` +
        `R ${cell(m.recall)}  F1 ${cell(m.f1)}   ` +
        `(tp ${m.tp}, fp ${m.fp}, fn ${m.fn})`,
    );
  }
}

// Every expected slug must be a real framework leaf item of the declared type, or the
// scores are silently wrong. A typo in a hand label would otherwise just depress recall
// with no warning, so fail loud instead of fail open (ADR-0008). Returns the bad labels.
function validateExpected(fw, fixtures) {
  const have = new Set(fw.items.map((i) => i.type + ':' + i.slug));
  const fields = [
    ['activity', 'activities'],
    ['deliverable', 'deliverables'],
    ['tool', 'tools'],
  ];
  const bad = [];
  for (const fx of fixtures) {
    if (!fx.expected) continue;
    for (const [type, key] of fields) {
      for (const slug of fx.expected[key] || []) {
        if (!have.has(type + ':' + slug)) bad.push(`${fx.name || fx.title}: ${type}:${slug}`);
      }
    }
  }
  return bad;
}

// Expected per-hat match levels (ADR-0039), derived from the labeled expected items with the
// same proportional rule the decode uses. The fixtures label expected items; the expected hat
// level is a deterministic function of them, so no separate hat-level labeling is needed.
function expectedRefs(exp) {
  const refs = [];
  for (const s of (exp && exp.activities) || []) refs.push({ slug: s, type: 'activity' });
  for (const s of (exp && exp.deliverables) || []) refs.push({ slug: s, type: 'deliverable' });
  return refs; // tools are excluded from hat scoring (ADR-0039)
}

function hatLevelScore(fw, res, exp) {
  const expected = scoreHats(fw, expectedRefs(exp));
  const rows = [];
  let correct = 0;
  for (const d of res.standard) {
    const predicted = (res.hats[d] && res.hats[d].level) || 'none';
    const want = (expected.get(d) && expected.get(d).level) || 'none';
    if (predicted === want) correct++;
    rows.push({ hat: d, predicted, expected: want });
  }
  return { correct, total: res.standard.length, rows };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (args.llm && !apiKey) {
    console.error(
      'OPENROUTER_API_KEY is not set. Set it, or run with --no-llm for the keyword-only baseline.',
    );
    process.exit(2);
  }

  const fw = loadFramework();
  const aliasMap = args.aliases ? loadAliases() : {};
  const raw = JSON.parse(readFileSync(args.fixtures, 'utf8').replace(/^﻿/, ''));
  // Entries without a title are file metadata (a header note), not postings; skip them
  // so they are not decoded as an empty fixture.
  const fixtures = raw.filter((fx) => fx && typeof fx.title === 'string');
  const skipped = raw.length - fixtures.length;
  const badSlugs = validateExpected(fw, fixtures);
  if (badSlugs.length) {
    console.error(
      'Fixture label error: these expected slugs are not framework leaf items of the ' +
        'declared type. Fix each label (check the slug and its entity type):',
    );
    for (const b of badSlugs) console.error('  ' + b);
    process.exit(2);
  }

  console.log(
    `Framework: ${fw.items.length} leaf items ` +
      `(${fw.activities.length} activities, ${fw.deliverables.length} deliverables, ${fw.tools.length} tools)`,
  );
  console.log(`Mode: ${args.llm ? 'keyword + LLM (' + args.model + ')' : 'keyword only (--no-llm)'}`);
  if (args.llm) {
    console.log(
      `Providers: ${args.providers.length ? args.providers.join(', ') + ' only, no fallback' : 'any'}, data_collection denied`,
    );
  }
  console.log(`Aliases: ${args.aliases ? Object.keys(aliasMap).length + ' leaf items (translator table)' : 'off (--no-aliases)'}`);
  console.log(
    `Fixtures: ${fixtures.length} from ${args.fixtures}` +
      (skipped ? ` (skipped ${skipped} metadata entr${skipped === 1 ? 'y' : 'ies'})` : ''),
  );

  const perList = [];
  let hatCorrect = 0;
  let hatTotal = 0;
  let llmDown = 0;
  let negCount = 0;
  let negConfirmedFp = 0;
  for (const fx of fixtures) {
    let llm = [];
    if (args.llm) {
      try {
        const r = await recognize(fw, fx.posting, { model: args.model, apiKey, providers: args.providers });
        llm = r.matches;
      } catch (e) {
        llmDown++;
        console.warn(`  [LLM unavailable for "${fx.name}": ${e.message}] using keyword fallback`);
      }
    }
    const res = decodePosting(fw, fx, llm, aliasMap);
    // Negative out-of-domain fixtures (ADR-0047): no hat should be meaning-confirmed. Count the
    // confirmed false matches so a regression in the meaning check shows up as a rising number.
    if (fx.negative) {
      const confirmed = res.matched.filter((m) => m.confirmed);
      negCount++;
      negConfirmedFp += confirmed.length;
      console.log(`\n- ${fx.name}  [NEGATIVE: out of domain]`);
      console.log(
        `    confirmed matches (want 0): ${confirmed.length}` +
          (confirmed.length ? ' -> ' + confirmed.map((m) => `${m.type}:${m.slug}`).join(', ') : ''),
      );
      continue;
    }
    const exp = fx.expected;
    const hasLabels =
      exp && ((exp.activities && exp.activities.length) ||
        (exp.deliverables && exp.deliverables.length) ||
        (exp.tools && exp.tools.length));
    if (hasLabels) perList.push(scoreFixture(res.matched, exp));
    printFixture(fw, fx, res, args.detail);
    if (hasLabels && res.fnSlug) {
      const hl = hatLevelScore(fw, res, exp);
      hatCorrect += hl.correct;
      hatTotal += hl.total;
      console.log(
        `    hat levels (ADR-0039): ${hl.correct}/${hl.total} standard hats matched the expected level`,
      );
      if (args.detail) {
        for (const r of hl.rows) {
          const mark = r.predicted === r.expected ? 'ok  ' : 'MISS';
          console.log(`      [${mark}] ${r.hat}: predicted ${r.predicted}, expected ${r.expected}`);
        }
      }
    }
  }

  if (perList.length) {
    printMetrics(aggregate(perList), perList.length);
  } else {
    console.log('\nNo fixtures carried an "expected" set, so precision/recall was not computed.');
    console.log('Add expected slugs to the fixtures to measure accuracy.');
  }
  if (negCount) {
    if (!args.llm) {
      // Keyword-only run: nothing is meaning-confirmed, so this count is always 0 and proves
      // nothing. Say so, rather than let a vacuous 0 read as a passing guard.
      console.log(
        `\nNegative fixtures (out-of-domain, ADR-0047): not measured without the recognizer ` +
          `(--no-llm confirms nothing). Run with the recognizer to exercise the meaning check.`,
      );
    } else {
      console.log(
        `\nNegative fixtures (out-of-domain, ADR-0047): ${negConfirmedFp} confirmed false ` +
          `match(es) across ${negCount} posting(s) (want 0).`,
      );
    }
  }
  if (hatTotal) {
    console.log(
      `\nHat-level accuracy (ADR-0039): ${hatCorrect}/${hatTotal} standard hats got the expected ` +
        `match level (${pct(hatCorrect / hatTotal)}).`,
    );
  }
  if (llmDown) {
    console.log(`\nNote: the LLM step was unavailable for ${llmDown} fixture(s); those used the keyword fallback.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
