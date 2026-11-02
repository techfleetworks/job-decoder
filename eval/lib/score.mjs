// Precision / recall / F1 of predicted leaf items against a fixture's labeled set.
// Scored per entity type (activity, deliverable, tool) and overall, micro-averaged
// across fixtures. Only items are scored here; roll-up and classification are
// deterministic from the framework and are checked separately.

const TYPES = ['activity', 'deliverable', 'tool'];

export function scoreFixture(predictedItems, expected) {
  const exp = {
    activity: new Set((expected && expected.activities) || []),
    deliverable: new Set((expected && expected.deliverables) || []),
    tool: new Set((expected && expected.tools) || []),
  };
  const pred = { activity: new Set(), deliverable: new Set(), tool: new Set() };
  for (const p of predictedItems) if (pred[p.type]) pred[p.type].add(p.slug);

  const per = {};
  for (const t of TYPES) {
    let tp = 0, fp = 0, fn = 0;
    for (const s of pred[t]) (exp[t].has(s) ? tp++ : fp++);
    for (const s of exp[t]) if (!pred[t].has(s)) fn++;
    per[t] = { tp, fp, fn };
  }
  return per;
}

export function aggregate(perList) {
  const tot = {};
  for (const t of TYPES) tot[t] = { tp: 0, fp: 0, fn: 0 };
  for (const per of perList) {
    for (const t of TYPES) {
      tot[t].tp += per[t].tp;
      tot[t].fp += per[t].fp;
      tot[t].fn += per[t].fn;
    }
  }
  const out = {};
  let TP = 0, FP = 0, FN = 0;
  for (const t of TYPES) {
    out[t] = prf(tot[t].tp, tot[t].fp, tot[t].fn);
    TP += tot[t].tp; FP += tot[t].fp; FN += tot[t].fn;
  }
  out.overall = prf(TP, FP, FN);
  return out;
}

function prf(tp, fp, fn) {
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { tp, fp, fn, precision, recall, f1 };
}
