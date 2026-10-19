/**
 * Builds, for each duty, the phrases that count as evidence of that duty in a
 * job description: its name plus the labels of its tasks, activities,
 * deliverables, required skills, and tools. Pure: no I/O, no DOM.
 *
 * Matching is grounded entirely in these framework-derived phrases — the engine
 * never claims a duty the data does not support.
 */
import {
  DUTY_FIELD,
  ENTITY,
  type FrameworkData,
} from "../framework/types";
import { getPrimaryName, getRefs, listRecords } from "../framework/resolver";
import { normalize } from "../text";
import type { EvidencePhrase } from "./types";

/** Duty relationship fields whose labels are evidence phrases. */
const EVIDENCE_ARRAY_FIELDS: string[] = [
  DUTY_FIELD.responsibleTasks,
  DUTY_FIELD.accountableTasks,
  DUTY_FIELD.consultedTasks,
  DUTY_FIELD.informedTasks,
  DUTY_FIELD.activities,
  DUTY_FIELD.responsibleDeliverables,
  DUTY_FIELD.skillsRequired,
  DUTY_FIELD.uniqueTools,
];

/** Map each duty slug to its de-duplicated evidence phrases. */
export function buildDutyEvidence(
  data: FrameworkData,
): Map<string, EvidencePhrase[]> {
  const result = new Map<string, EvidencePhrase[]>();

  for (const duty of listRecords(data, ENTITY.duties)) {
    const phrases: EvidencePhrase[] = [];
    const seen = new Set<string>();

    const add = (label: string, source: string): void => {
      const phrase = normalize(label);
      if (phrase.length === 0 || seen.has(phrase)) return;
      seen.add(phrase);
      phrases.push({ phrase, label, source });
    };

    add(getPrimaryName(data, ENTITY.duties, duty), "duty-name");
    for (const field of EVIDENCE_ARRAY_FIELDS) {
      for (const ref of getRefs(duty, field)) add(ref.label, field);
    }

    result.set(duty.slug, phrases);
  }

  return result;
}
