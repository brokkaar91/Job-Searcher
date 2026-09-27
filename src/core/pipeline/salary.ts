import type { RawSalary, SalaryUnit } from "../connectors/types";

/**
 * Normalise salaries to GROSS EUR PER MONTH, excluding the Dutch 8% holiday allowance.
 * Annual Dutch salaries usually include holiday allowance: monthly = annual / 12.96.
 * Non-EUR amounts are not converted (null) – they are kept raw for review.
 */
export const HOLIDAY_FACTOR = 1.08;

export function toMonthly(amount: number, unit: SalaryUnit, hoursPerWeek = 40): number {
  switch (unit) {
    case "hour":
      return (amount * hoursPerWeek * 52) / 12;
    case "day":
      return (amount * 5 * 52) / 12;
    case "week":
      return (amount * 52) / 12;
    case "month":
      return amount;
    case "year":
      return amount / (12 * HOLIDAY_FACTOR);
  }
}

/** Guess the unit from the size of the number when the source doesn't say (NL ranges). */
export function guessUnit(n: number): SalaryUnit {
  if (n < 200) return "hour";
  if (n < 1500) return "week";
  if (n < 15000) return "month";
  return "year";
}

export interface NormalisedSalary {
  minMonth: number | null;
  maxMonth: number | null;
  estimated: boolean;
}

export function normalizeSalary(
  s: RawSalary | null | undefined,
  hoursPerWeek?: number | null,
): NormalisedSalary {
  const empty = { minMonth: null, maxMonth: null, estimated: false };
  if (!s) return empty;
  let { min, max, unit } = s;
  if (min == null && max == null && s.text)
    ({ min, max, unit } = { ...parseSalaryText(s.text), ...(unit ? { unit } : {}) });
  if (min == null && max == null) return empty;
  if (s.currency && s.currency.toUpperCase() !== "EUR") return empty;
  const u = unit ?? guessUnit((max ?? min)!);
  const round = (x: number | null | undefined) =>
    x == null || !Number.isFinite(x) || x <= 0
      ? null
      : Math.round(toMonthly(x, u, hoursPerWeek ?? 40));
  let lo = round(min);
  let hi = round(max);
  if (lo && hi && lo > hi) [lo, hi] = [hi, lo];
  // Plausibility guard: < €800 or > €40k per month is almost certainly a parsing error.
  const ok = (x: number | null) => x == null || (x >= 800 && x <= 40000);
  if (!ok(lo) || !ok(hi)) return empty;
  return { minMonth: lo, maxMonth: hi, estimated: !!s.isEstimate };
}

/** Parse Dutch/English salary strings: "€ 3.500 - € 4.500 per maand", "€45k–€55k per year", "€20/uur". */
export function parseSalaryText(text: string): {
  min: number | null;
  max: number | null;
  unit: SalaryUnit | null;
} {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  const nums = [...t.matchAll(/€?\s?(\d{1,3}(?:[.,\s]\d{3})+|\d+(?:[.,]\d{1,2})?)\s?(k)?/g)]
    .map((m) => {
      let raw = m[1]!.replace(/\s/g, "");
      // "3.500" / "45,000" = thousands separators; "22,50" / "22.50" = decimals
      if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, "");
      else raw = raw.replace(",", ".");
      const n = parseFloat(raw) * (m[2] ? 1000 : 1);
      return n;
    })
    .filter((n) => n >= 5);
  const unit: SalaryUnit | null = /per uur|\/ ?uur|per hour|\/ ?h(ou)?r|hourly|uurloon/.test(t)
    ? "hour"
    : /per dag|per day|daily|dagtarief/.test(t)
      ? "day"
      : /per week|weekly/.test(t)
        ? "week"
        : /per maand|p\/m|p\.m\.|per month|monthly|maandelijks|\/ ?mnd|\/ ?month/.test(t)
          ? "month"
          : /per jaar|per year|annual|yearly|jaarsalaris|p\/j|\/ ?jaar|\/ ?year|pa\b/.test(t)
            ? "year"
            : null;
  if (!nums.length) return { min: null, max: null, unit };
  return { min: nums[0]!, max: nums[1] ?? nums[0]!, unit };
}
