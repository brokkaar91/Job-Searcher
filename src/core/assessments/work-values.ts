import { WORK_VALUES, type WorkValue } from "../matching/types";

/** The six O*NET work values (Work Importance Profiler). Labels/descriptions live in messages/*.json. */
export { WORK_VALUES };
export type { WorkValue };

export function isValidRanking(ranking: unknown): ranking is WorkValue[] {
  return (
    Array.isArray(ranking) &&
    ranking.length === WORK_VALUES.length &&
    new Set(ranking).size === WORK_VALUES.length &&
    ranking.every((v) => (WORK_VALUES as readonly string[]).includes(v))
  );
}

export function moveValue(ranking: WorkValue[], from: number, to: number): WorkValue[] {
  const next = [...ranking];
  const [item] = next.splice(from, 1);
  if (item) next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}
