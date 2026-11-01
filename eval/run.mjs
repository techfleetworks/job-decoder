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
import { decodePosting } from './lib/decode.mjs';
import { recognize } from './lib/openrouter.mjs';
import { scoreFixture, aggregate } from './lib/score.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    llm: true,
    model: 'openai/gpt-4o-mini',
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
      '  --model <id>        OpenRouter model id to test (default openai/gpt-4o-mini)',
      '  --fixtures <path>   JSON array of labeled postings (default fixtures.example.json)',
      '  --detail            list each matched item',
      '  --help              show this help',
      '',
      'Set OPENROUTER_API_KEY in the environment for the LLM step.',
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
  const fixtures = JSON.parse(readFileSync(args.fixtures, 'utf8').replace(/^﻿/, ''));

  console.log(
    `Framework: ${fw.items.length} leaf items ` +
      `(${fw.activities.length} activities, ${fw.deliverables.length} deliverables, ${fw.tools.length} tools)`,
  );
  console.log(`Mode: ${args.llm ? 'keyword + LLM (' + args.model + ')' : 'keyword only (--no-llm)'}`);
  console.log(`Aliases: ${args.aliases ? Object.keys(aliasMap).length + ' leaf items (translator table)' : 'off (--no-aliases)'}`);
  console.log(`Fixtures: ${fixtures.length} from ${args.fixtures}`);

  const perList = [];
  let llmDown = 0;
  for (const fx of fixtures) {
    let llm = [];
    if (args.llm) {
      try {
        const r = await recognize(fw, fx.posting, { model: args.model, apiKey });
        llm = r.matches;
      } catch (e) {
        llmDown++;
        console.warn(`  [LLM unavailable for "${fx.name}": ${e.message}] using keyword fallback`);
      }
    }
    const res = decodePosting(fw, fx, llm, aliasMap);
    const exp = fx.expected;
    const hasLabels =
      exp && ((exp.activities && exp.activities.length) ||
        (exp.deliverables && exp.deliverables.length) ||
        (exp.tools && exp.tools.length));
    if (hasLabels) perList.push(scoreFixture(res.matched, exp));
    printFixture(fw, fx, res, args.detail);
  }

  if (perList.length) {
    printMetrics(aggregate(perList), perList.length);
  } else {
    console.log('\nNo fixtures carried an "expected" set, so precision/recall was not computed.');
    console.log('Add expected slugs to the fixtures to measure accuracy.');
  }
  if (llmDown) {
    console.log(`\nNote: the LLM step was unavailable for ${llmDown} fixture(s); those used the keyword fallback.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
