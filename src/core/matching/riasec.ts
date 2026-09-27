import { RIASEC_KEYS, type RiasecKey, type RiasecProfile } from "./types";

/** Holland code: the top-3 letters, ties broken by canonical RIASEC order (deterministic). */
export function hollandCode(profile: RiasecProfile, length = 3): RiasecKey[] {
  return [...RIASEC_KEYS]
    .map((k, i) => ({ k, v: profile[k], i }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .slice(0, length)
    .map((x) => x.k);
}

/**
 * Iachan (1984) M index for three-letter codes: weighted agreement of letters by position.
 * Max = 28. Returned normalised to 0..1.
 */
const IACHAN = [
  [22, 10, 4],
  [10, 5, 2],
  [4, 2, 1],
] as const;

export function iachanCongruence(person: RiasecKey[], environment: RiasecKey[]): number {
  let sum = 0;
  person.slice(0, 3).forEach((p, i) => {
    const j = environment.slice(0, 3).indexOf(p);
    if (j >= 0) sum += IACHAN[i]![j]!;
  });
  return sum / 28;
}
