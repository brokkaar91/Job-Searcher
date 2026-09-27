import type { ModelConfig } from "./config";
import { meetsCefr } from "./cefr";
import { estimateTravelMinutes } from "./geo";
import type { KnockoutResult, MatchCandidate, MatchContext, MatchJob } from "./types";

/**
 * Layer A – binary knock-outs. Rules:
 * - missing data never excludes (status "unknown");
 * - every result carries an explanation;
 * - a "fail" hides the job by default, the user can always choose "show anyway".
 */

export function effectiveTravelMinutes(
  c: MatchCandidate,
  j: MatchJob,
  ctx: MatchContext,
): number | null {
  if (ctx.travelMinutes != null) return ctx.travelMinutes;
  const from = c.preferences.location;
  if (!from || !j.location) return null;
  return estimateTravelMinutes(from, j.location, c.preferences.travelMode ?? "public_transport");
}

export function salaryNormFor(c: MatchCandidate, cfg: ModelConfig): number {
  const norms = cfg.salaryNorms;
  // Unknown category → lowest norm, so nobody is wrongly excluded.
  switch (c.workStatus.salaryNormCategory) {
    case "standard":
      return norms.standard;
    case "reduced":
      return norms.reduced;
    case "graduate":
      return norms.graduate;
    default:
      return Math.min(norms.standard, norms.reduced, norms.graduate);
  }
}

function sponsorship(c: MatchCandidate, j: MatchJob, cfg: ModelConfig): KnockoutResult {
  const rule = "sponsorship" as const;
  if (c.workStatus.needsSponsorship !== true) {
    return { rule, status: "pass", message: { key: "knockout.sponsorship.notNeeded" } };
  }
  if (j.visaSponsorship === false) {
    return { rule, status: "fail", message: { key: "knockout.sponsorship.noSponsorship" } };
  }
  if (!j.company?.isRecognisedSponsor) {
    return { rule, status: "fail", message: { key: "knockout.sponsorship.notRecognised" } };
  }
  if (cfg.knockouts.sponsorship.requireSalaryNorm) {
    const norm = salaryNormFor(c, cfg);
    const offered = j.salaryMaxMonth ?? j.salaryMinMonth;
    if (offered == null) {
      return {
        rule,
        status: "unknown",
        message: { key: "knockout.sponsorship.salaryUnknown", params: { norm } },
      };
    }
    if (offered < norm) {
      return {
        rule,
        status: "fail",
        message: { key: "knockout.sponsorship.belowNorm", params: { norm, offered } },
      };
    }
  }
  return { rule, status: "pass", message: { key: "knockout.sponsorship.recognised" } };
}

function language(c: MatchCandidate, j: MatchJob, cfg: ModelConfig): KnockoutResult {
  const rule = "language" as const;
  const required = j.languageRequirements.filter((r) => r.required);
  if (required.length === 0)
    return { rule, status: "pass", message: { key: "knockout.language.none" } };
  if (c.languages.length === 0)
    return { rule, status: "unknown", message: { key: "knockout.language.unknown" } };
  for (const req of required) {
    const has = c.languages.find((l) => l.language === req.language);
    if (!meetsCefr(has?.level, req.level, cfg.knockouts.language.toleranceLevels)) {
      return {
        rule,
        status: "fail",
        message: {
          key: "knockout.language.below",
          params: { language: req.language, required: req.level, actual: has?.level ?? "–" },
        },
      };
    }
  }
  return { rule, status: "pass", message: { key: "knockout.language.met" } };
}

function location(
  c: MatchCandidate,
  j: MatchJob,
  cfg: ModelConfig,
  ctx: MatchContext,
): KnockoutResult {
  const rule = "location" as const;
  const pref = c.preferences.remote ?? "any";
  if (j.remotePolicy === "remote")
    return { rule, status: "pass", message: { key: "knockout.location.remote" } };
  if (pref === "remote" && j.remotePolicy === "onsite") {
    return { rule, status: "fail", message: { key: "knockout.location.remoteOnly" } };
  }
  if (pref === "remote" && j.remotePolicy === "hybrid") {
    return { rule, status: "fail", message: { key: "knockout.location.remoteOnlyHybrid" } };
  }
  const max = c.preferences.maxTravelMinutes;
  if (max == null) return { rule, status: "pass", message: { key: "knockout.location.noLimit" } };
  const minutes = effectiveTravelMinutes(c, j, ctx);
  if (minutes == null)
    return { rule, status: "unknown", message: { key: "knockout.location.unknown" } };
  const factor = j.remotePolicy === "hybrid" ? cfg.knockouts.location.hybridTravelFactor : 1;
  const limit = max * factor + cfg.knockouts.location.graceMinutes;
  if (minutes > limit) {
    return {
      rule,
      status: "fail",
      message: { key: "knockout.location.tooFar", params: { minutes, max } },
    };
  }
  return {
    rule,
    status: "pass",
    message: { key: "knockout.location.within", params: { minutes, max } },
  };
}

function salary(c: MatchCandidate, j: MatchJob, cfg: ModelConfig): KnockoutResult {
  const rule = "salary" as const;
  const min = c.preferences.minSalaryMonth;
  if (min == null) return { rule, status: "pass", message: { key: "knockout.salary.noMinimum" } };
  const offered = j.salaryMaxMonth ?? j.salaryMinMonth;
  if (offered == null)
    return { rule, status: "unknown", message: { key: "knockout.salary.unknown" } };
  if (offered < min * (1 - cfg.knockouts.salary.tolerancePct / 100)) {
    return {
      rule,
      status: "fail",
      message: { key: "knockout.salary.below", params: { offered, min } },
    };
  }
  return {
    rule,
    status: "pass",
    message: { key: "knockout.salary.met", params: { offered, min } },
  };
}

function contract(c: MatchCandidate, j: MatchJob): KnockoutResult {
  const rule = "contract" as const;
  const wanted = c.preferences.employmentTypes ?? [];
  if (
    wanted.length > 0 &&
    j.employmentTypes.length > 0 &&
    !j.employmentTypes.some((t) => wanted.includes(t))
  ) {
    return {
      rule,
      status: "fail",
      message: { key: "knockout.contract.type", params: { types: j.employmentTypes.join(", ") } },
    };
  }
  const { hoursMin, hoursMax } = c.preferences;
  if (hoursMax != null && j.hoursMin != null && j.hoursMin > hoursMax) {
    return {
      rule,
      status: "fail",
      message: {
        key: "knockout.contract.tooManyHours",
        params: { jobHours: j.hoursMin, max: hoursMax },
      },
    };
  }
  if (hoursMin != null && j.hoursMax != null && j.hoursMax < hoursMin) {
    return {
      rule,
      status: "fail",
      message: {
        key: "knockout.contract.tooFewHours",
        params: { jobHours: j.hoursMax, min: hoursMin },
      },
    };
  }
  if (j.employmentTypes.length === 0 && j.hoursMin == null && j.hoursMax == null) {
    return { rule, status: "unknown", message: { key: "knockout.contract.unknown" } };
  }
  return { rule, status: "pass", message: { key: "knockout.contract.met" } };
}

function education(c: MatchCandidate, j: MatchJob): KnockoutResult {
  const rule = "education" as const;
  // Education only counts when the job EXPLICITLY requires it; never as bonus points.
  if (!j.educationRequirement)
    return { rule, status: "pass", message: { key: "knockout.education.none" } };
  const { minEqf } = j.educationRequirement;
  if (c.educationLevel == null)
    return {
      rule,
      status: "unknown",
      message: { key: "knockout.education.unknown", params: { minEqf } },
    };
  if (c.educationLevel < minEqf) {
    return {
      rule,
      status: "fail",
      message: { key: "knockout.education.below", params: { minEqf } },
    };
  }
  return { rule, status: "pass", message: { key: "knockout.education.met", params: { minEqf } } };
}

export function evaluateKnockouts(
  c: MatchCandidate,
  j: MatchJob,
  cfg: ModelConfig,
  ctx: MatchContext = {},
): KnockoutResult[] {
  const k = cfg.knockouts;
  const results: KnockoutResult[] = [];
  if (k.sponsorship.enabled) results.push(sponsorship(c, j, cfg));
  if (k.language.enabled) results.push(language(c, j, cfg));
  if (k.location.enabled) results.push(location(c, j, cfg, ctx));
  if (k.salary.enabled) results.push(salary(c, j, cfg));
  if (k.contract.enabled) results.push(contract(c, j));
  if (k.education.enabled) results.push(education(c, j));
  return results;
}
