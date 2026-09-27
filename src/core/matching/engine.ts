import type { ModelConfig } from "./config";
import {
  scoreExperience,
  scoreInterests,
  scoreOccupation,
  scorePractical,
  scoreSkills,
  scoreValues,
  type RawComponent,
} from "./components";
import { buildNotes, buildReasons } from "./explain";
import { evaluateKnockouts } from "./knockouts";
import { sanitizeCandidate } from "./sanitize";
import {
  COMPONENTS,
  type ComponentKey,
  type ComponentScore,
  type MatchCandidate,
  type MatchContext,
  type MatchJob,
  type MatchLabel,
  type MatchResult,
} from "./types";
import { meetsCefr } from "./cefr";

export function labelFor(score: number, cfg: ModelConfig): MatchLabel {
  const t = cfg.thresholds;
  if (score >= t.strong) return "strong";
  if (score >= t.good) return "good";
  if (score >= t.possible) return "possible";
  return "weak";
}

/**
 * Match one candidate against one job. Pure and deterministic (given ctx.now).
 * The candidate is re-sanitised through an allow-list so protected attributes can never be used.
 */
export function matchJob(
  candidateInput: MatchCandidate,
  job: MatchJob,
  cfg: ModelConfig,
  ctx: MatchContext = {},
): MatchResult {
  const c = sanitizeCandidate(candidateInput);

  const knockouts = evaluateKnockouts(c, job, cfg, ctx);
  const skills = scoreSkills(c, job, cfg, ctx);
  const occupation = scoreOccupation(c, job);
  const values = scoreValues(c, job);
  const practical = scorePractical(c, job, ctx);
  const raw: Record<ComponentKey, RawComponent> = {
    skills,
    experience: scoreExperience(cfg, ctx),
    occupation,
    interests: scoreInterests(c, job),
    values,
    practical,
  };

  // Redistribute weights over components that have data.
  const available = COMPONENTS.filter((k) => raw[k].score != null);
  const totalWeight = COMPONENTS.reduce((s, k) => s + cfg.weights[k], 0);
  const availableWeight = available.reduce((s, k) => s + cfg.weights[k], 0);
  const missingShare = totalWeight > 0 ? 1 - availableWeight / totalWeight : 1;

  const components = {} as Record<ComponentKey, ComponentScore>;
  let total = 0;
  for (const k of COMPONENTS) {
    const score = raw[k].score;
    const weight = score == null || availableWeight === 0 ? 0 : cfg.weights[k] / availableWeight;
    const points = score == null ? 0 : weight * score * 100;
    total += points;
    components[k] = {
      score: score == null ? null : Math.round(score * 1000) / 1000,
      weight: Math.round(weight * 1000) / 1000,
      points: Math.round(points * 10) / 10,
      message: raw[k].message,
    };
  }
  const totalScore = Math.round(total * 10) / 10;
  const knockedOut = knockouts.some((k) => k.status === "fail");
  const limitedData = missingShare > cfg.limitedDataThreshold;

  const languageGaps = job.languageRequirements
    .filter((r) => r.required)
    .map((r) => ({
      req: r,
      has: c.languages.find((l) => l.language === r.language)?.level ?? null,
    }))
    .filter(({ req, has }) => !meetsCefr(has, req.level))
    .map(({ req, has }) => ({ language: req.language, required: req.level, actual: has }));

  const result: MatchResult = {
    jobId: job.id,
    totalScore,
    label: labelFor(totalScore, cfg),
    components,
    reasons: [],
    gaps: skills.gaps.sort((a, b) =>
      a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1,
    ),
    languageGaps,
    knockouts,
    knockedOut,
    limitedData,
    notes: [],
  };
  result.reasons = buildReasons({
    candidate: c,
    job,
    components,
    skills,
    occupation,
    values,
    practical,
    knockouts,
  });
  result.notes = buildNotes(result);
  return result;
}

/** Match against many jobs, sorted: not knocked out first, then by score (desc), then job id. */
export function rankJobs(
  candidate: MatchCandidate,
  jobs: MatchJob[],
  cfg: ModelConfig,
  ctxFor: (job: MatchJob) => MatchContext = () => ({}),
): MatchResult[] {
  return jobs
    .map((j) => matchJob(candidate, j, cfg, ctxFor(j)))
    .sort(
      (a, b) =>
        Number(a.knockedOut) - Number(b.knockedOut) ||
        b.totalScore - a.totalScore ||
        a.jobId.localeCompare(b.jobId),
    );
}
