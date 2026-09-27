import { CEFR_LEVELS, type Cefr } from "./types";

export function cefrIndex(level: Cefr): number {
  return CEFR_LEVELS.indexOf(level);
}

/** True when `actual` is at least `required` minus `tolerance` levels. */
export function meetsCefr(actual: Cefr | null | undefined, required: Cefr, tolerance = 0): boolean {
  if (!actual) return false;
  return cefrIndex(actual) >= cefrIndex(required) - tolerance;
}
