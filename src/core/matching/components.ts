import type { ModelConfig } from "./config";
import { hollandCode, iachanCongruence } from "./riasec";
import { effectiveTravelMinutes } from "./knockouts";
import {
  SENIORITY_LEVELS,
  WORK_VALUES,
  type CandidateSkill,
  type MatchCandidate,
  type MatchContext,
  type MatchJob,
  type Message,
  type SkillGap,
  type WorkValue,
} from "./types";

/** Result of a single component before weighting. `score` 0..1 or null (no data). */
export interface RawComponent {
  score: number | null;
  message: Message;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

// ─── Skills (35%) ────────────────────────────────────────────────────────────

export interface SkillsResult extends RawComponent {
  matched: { uri: string; label: string | null; importance: "must" | "nice"; credit: number }[];
  gaps: SkillGap[];
}

function recencyFactor(skill: CandidateSkill, cfg: ModelConfig, now: Date): number {
  if (skill.lastUsedYear == null) return cfg.skills.unknownRecencyFactor;
  const years = Math.max(0, now.getFullYear() - skill.lastUsedYear);
  for (const band of cfg.skills.recency) {
    if (band.maxYears == null || years <= band.maxYears) return band.factor;
  }
  return cfg.skills.recency[cfg.skills.recency.length - 1]!.factor;
}

/** Two ESCO skills are related when one is broader than the other, or they share a direct parent. */
export function skillsRelated(
  a: string,
  b: string,
  broader?: ReadonlyMap<string, readonly string[]>,
): boolean {
  if (!broader) return false;
  const pa = broader.get(a) ?? [];
  const pb = broader.get(b) ?? [];
  return pa.includes(b) || pb.includes(a) || pa.some((p) => pb.includes(p));
}

export function scoreSkills(
  c: MatchCandidate,
  j: MatchJob,
  cfg: ModelConfig,
  ctx: MatchContext,
): SkillsResult {
  if (j.skills.length === 0) {
    return { score: null, message: { key: "component.skills.noData" }, matched: [], gaps: [] };
  }
  const now = ctx.now ?? new Date();
  const byUri = new Map(c.skills.map((s) => [s.uri, s]));
  let total = 0;
  let earned = 0;
  const matched: SkillsResult["matched"] = [];
  const gaps: SkillGap[] = [];

  for (const js of j.skills) {
    const w = js.importance === "must" ? cfg.skills.mustWeight : cfg.skills.niceWeight;
    total += w;
    const exact = byUri.get(js.uri);
    let credit = 0;
    if (exact) {
      credit = recencyFactor(exact, cfg, now);
    } else {
      const related = c.skills.find((s) => skillsRelated(s.uri, js.uri, ctx.skillBroader));
      if (related) credit = cfg.skills.relatedCredit * recencyFactor(related, cfg, now);
    }
    earned += w * credit;
    if (exact) {
      matched.push({ uri: js.uri, label: js.label ?? null, importance: js.importance, credit });
    } else {
      gaps.push({
        uri: js.uri,
        label: js.label ?? null,
        importance: js.importance,
        status: credit > 0 ? "related" : "missing",
      });
    }
  }

  const score = total > 0 ? earned / total : null;
  const mustTotal = j.skills.filter((s) => s.importance === "must").length;
  const mustMatched = matched.filter((m) => m.importance === "must").length;
  return {
    score,
    matched,
    gaps,
    message: {
      key: "component.skills.summary",
      params: { matched: matched.length, total: j.skills.length, mustMatched, mustTotal },
    },
  };
}

// ─── Experience relevance (20%) – semantic, NOT years ───────────────────────

export function scoreExperience(cfg: ModelConfig, ctx: MatchContext): RawComponent {
  const sim = ctx.experienceSimilarity;
  if (sim == null || Number.isNaN(sim))
    return { score: null, message: { key: "component.experience.noData" } };
  const { similarityFloor: lo, similarityCeil: hi } = cfg.experience;
  const score = clamp01((sim - lo) / (hi - lo));
  const band = score >= 0.66 ? "high" : score >= 0.33 ? "medium" : "low";
  return { score, message: { key: `component.experience.${band}` } };
}

// ─── Occupation family & level (15%) ─────────────────────────────────────────

/** ISCO-08 hierarchy distance → similarity: same unit group 1, minor .75, sub-major .5, major .25. */
export function iscoSimilarity(a: string, b: string): number {
  let common = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] !== b[i]) break;
    common++;
  }
  return common / 4;
}

export function seniorityFit(
  candidate: MatchCandidate["seniority"],
  job: MatchJob["seniority"],
): number | null {
  if (!candidate || !job) return null;
  const diff = Math.abs(SENIORITY_LEVELS.indexOf(candidate) - SENIORITY_LEVELS.indexOf(job));
  return [1, 0.8, 0.5][diff] ?? 0.2;
}

export function scoreOccupation(
  c: MatchCandidate,
  j: MatchJob,
): RawComponent & { familySimilarity: number | null } {
  const codes = [
    ...(c.preferences.desiredOccupations ?? []).map((o) => o.iscoCode),
    ...c.experienceIscoCodes,
  ].filter(Boolean);
  const seniority = seniorityFit(c.seniority, j.seniority);
  if (!j.iscoCode || codes.length === 0) {
    if (seniority == null)
      return {
        score: null,
        familySimilarity: null,
        message: { key: "component.occupation.noData" },
      };
    return {
      score: seniority,
      familySimilarity: null,
      message: { key: "component.occupation.seniorityOnly" },
    };
  }
  const family = Math.max(...codes.map((code) => iscoSimilarity(code, j.iscoCode!)));
  const score = seniority == null ? family : 0.75 * family + 0.25 * seniority;
  const band = family >= 1 ? "same" : family >= 0.5 ? "related" : "different";
  return { score, familySimilarity: family, message: { key: `component.occupation.${band}` } };
}

// ─── Interests (10%) – RIASEC congruence ─────────────────────────────────────

export function scoreInterests(c: MatchCandidate, j: MatchJob): RawComponent {
  if (!c.riasec || !j.riasec)
    return { score: null, message: { key: "component.interests.noData" } };
  const person = hollandCode(c.riasec);
  const env = hollandCode(j.riasec);
  const score = iachanCongruence(person, env);
  return {
    score,
    message: {
      key: "component.interests.summary",
      params: { person: person.join(""), job: env.join("") },
    },
  };
}

// ─── Values / environment fit (10%) ──────────────────────────────────────────

/** Rank weights: most important value gets 6/21, least 1/21. */
export function valueWeights(ranking: WorkValue[]): Record<WorkValue, number> {
  const n = WORK_VALUES.length;
  const denom = (n * (n + 1)) / 2;
  const weights = Object.fromEntries(WORK_VALUES.map((v) => [v, 0])) as Record<WorkValue, number>;
  ranking.slice(0, n).forEach((v, i) => {
    weights[v] = (n - i) / denom;
  });
  return weights;
}

export function scoreValues(
  c: MatchCandidate,
  j: MatchJob,
): RawComponent & { topMatch: WorkValue | null } {
  if (!c.workValues?.length || !j.workValues) {
    return { score: null, topMatch: null, message: { key: "component.values.noData" } };
  }
  const w = valueWeights(c.workValues);
  const score = clamp01(WORK_VALUES.reduce((s, v) => s + w[v] * clamp01(j.workValues![v] ?? 0), 0));
  // The user's highest-ranked value that this job scores well on.
  const topMatch = c.workValues.find((v) => (j.workValues![v] ?? 0) >= 0.6) ?? null;
  return {
    score,
    topMatch,
    message: topMatch
      ? { key: "component.values.top", params: { value: topMatch } }
      : { key: "component.values.weak" },
  };
}

// ─── Practical fit (10%) – salary, travel, remote, hours, company ────────────

const REMOTE_FIT: Record<string, Record<string, number>> = {
  onsite: { onsite: 1, hybrid: 0.8, remote: 0.6 },
  hybrid: { onsite: 0.4, hybrid: 1, remote: 0.9 },
  remote: { onsite: 0, hybrid: 0.4, remote: 1 },
};

export interface PracticalResult extends RawComponent {
  parts: {
    salary: number | null;
    travel: number | null;
    remote: number | null;
    hours: number | null;
    company: number | null;
  };
  travelMinutes: number | null;
}

export function scorePractical(c: MatchCandidate, j: MatchJob, ctx: MatchContext): PracticalResult {
  const p = c.preferences;

  let salary: number | null = null;
  const desired = p.minSalaryMonth;
  if (desired != null && (j.salaryMinMonth != null || j.salaryMaxMonth != null)) {
    const lo = j.salaryMinMonth ?? j.salaryMaxMonth!;
    const hi = j.salaryMaxMonth ?? j.salaryMinMonth!;
    if (lo >= desired) salary = 1;
    else if (hi >= desired) salary = hi === lo ? 1 : 0.5 + 0.5 * ((hi - desired) / (hi - lo));
    else salary = clamp01(hi / desired - 0.5);
  }

  let travel: number | null = null;
  const travelMinutes = j.remotePolicy === "remote" ? 0 : effectiveTravelMinutes(c, j, ctx);
  if (j.remotePolicy === "remote") travel = 1;
  else if (travelMinutes != null && p.maxTravelMinutes) {
    const r = travelMinutes / p.maxTravelMinutes;
    travel = r <= 0.5 ? 1 : r <= 1 ? 1 - (r - 0.5) : 0.2;
    if (j.remotePolicy === "hybrid") travel = Math.min(1, travel + 0.15);
  }

  let remote: number | null = null;
  if (j.remotePolicy) {
    const pref = p.remote ?? "any";
    remote = pref === "any" ? 1 : (REMOTE_FIT[pref]?.[j.remotePolicy] ?? null);
  }

  let hours: number | null = null;
  if ((p.hoursMin != null || p.hoursMax != null) && (j.hoursMin != null || j.hoursMax != null)) {
    const cLo = p.hoursMin ?? 0;
    const cHi = p.hoursMax ?? 60;
    const jLo = j.hoursMin ?? j.hoursMax!;
    const jHi = j.hoursMax ?? j.hoursMin!;
    hours = Math.min(cHi, jHi) >= Math.max(cLo, jLo) ? 1 : 0.3;
  }

  let company: number | null = null;
  const sizeWanted = p.companySizes ?? [];
  const typeWanted = p.companyTypes ?? [];
  if ((sizeWanted.length && j.company?.size) || (typeWanted.length && j.company?.type)) {
    const parts: number[] = [];
    if (sizeWanted.length && j.company?.size)
      parts.push(sizeWanted.includes(j.company.size) ? 1 : 0.4);
    if (typeWanted.length && j.company?.type)
      parts.push(typeWanted.includes(j.company.type) ? 1 : 0.4);
    company = parts.reduce((a, b) => a + b, 0) / parts.length;
  }

  const known = [salary, travel, remote, hours, company].filter((x): x is number => x != null);
  const score = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
  return {
    score: score == null ? null : round2(score),
    parts: { salary, travel, remote, hours, company },
    travelMinutes,
    message:
      score == null
        ? { key: "component.practical.noData" }
        : { key: "component.practical.summary", params: { known: known.length } },
  };
}
