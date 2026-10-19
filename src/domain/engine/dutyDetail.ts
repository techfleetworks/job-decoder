/**
 * Plain-language detail for a duty ("hat"): what it is, why it matters, what it
 * takes to succeed, and the first step to learn it (requirements FR-1.1). Pure:
 * no I/O, no DOM. Missing fields come back as empty strings so the UI can decide
 * what to show rather than crash on absence.
 */
import {
  DUTY_FIELD,
  ENTITY,
  type FrameworkData,
  type FrameworkRecord,
} from "../framework/types";
import { getPrimaryName } from "../framework/resolver";

export interface DutyDetail {
  slug: string;
  name: string;
  description: string;
  whyImportant: string;
  whatItTakes: string;
  firstStep: string;
}

function text(record: FrameworkRecord, field: string): string {
  const value = record[field];
  return typeof value === "string" ? value : "";
}

export function getDutyDetail(
  data: FrameworkData,
  duty: FrameworkRecord,
): DutyDetail {
  return {
    slug: duty.slug,
    name: getPrimaryName(data, ENTITY.duties, duty),
    description: text(duty, DUTY_FIELD.description),
    whyImportant: text(duty, DUTY_FIELD.whyImportant),
    whatItTakes: text(duty, DUTY_FIELD.whatItTakes),
    firstStep: text(duty, DUTY_FIELD.firstStep),
  };
}
