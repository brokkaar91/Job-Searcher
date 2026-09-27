import { WORK_VALUES, type WorkValueProfile } from "../../matching/types";
import type { EscoIndex } from "../../esco";
import type { JobClassificationRaw, ParsedCvRaw } from "./schemas";
import type { JobClassification, ParsedCv } from "./types";

const ISCO = /^\d{4}$/;

/** Map a free-text skill label to an ESCO skill: exact label/alt-label first, then a single clear search hit. */
export function groundSkill(label: string, esco: EscoIndex): string | null {
  const exact = esco.lookupSkill(label);
  if (exact) return exact.uri;
  const inText = esco.findSkillsInText(label);
  if (inText.length === 1) return inText[0]!.ref.uri;
  return null;
}

export function groundCv(raw: ParsedCvRaw, esco: EscoIndex): ParsedCv {
  const seen = new Set<string>();
  const skills: ParsedCv["skills"] = [];
  for (const s of raw.skills) {
    const uri = groundSkill(s.label, esco);
    const key = uri ?? s.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push({
      label: uri ? (esco.skillLabel(uri) ?? s.label) : s.label,
      escoUri: uri,
      lastUsedYear: s.lastUsedYear,
      evidence: s.evidence,
    });
  }
  return {
    summary: raw.summary,
    seniority: raw.seniority,
    educationLevel:
      raw.educationLevelEqf != null && raw.educationLevelEqf >= 1 && raw.educationLevelEqf <= 8
        ? raw.educationLevelEqf
        : null,
    skills,
    experiences: raw.experiences.map((e) => {
      const occ = e.occupationLabel
        ? (esco.lookupOccupation(e.occupationLabel) ?? esco.findOccupationInText(e.title))
        : esco.findOccupationInText(e.title);
      return {
        title: e.title,
        organisation: e.organisation,
        startDate: e.startDate,
        endDate: e.endDate,
        isCurrent: e.isCurrent,
        description: e.description,
        escoOccupationUri: occ?.uri ?? null,
        iscoCode: occ?.iscoCode ?? (e.iscoCode && ISCO.test(e.iscoCode) ? e.iscoCode : null),
      };
    }),
    languages: raw.languages
      .map((l) => ({ language: l.language.toLowerCase().slice(0, 2), level: l.level }))
      .filter(
        (l, i, arr) =>
          /^[a-z]{2}$/.test(l.language) && arr.findIndex((x) => x.language === l.language) === i,
      ),
  };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function groundJob(
  raw: JobClassificationRaw,
  esco: EscoIndex,
  title: string,
): JobClassification {
  const skills: JobClassification["skills"] = [];
  const unmapped: string[] = [];
  for (const s of raw.skills) {
    const uri = groundSkill(s.label, esco);
    if (!uri) {
      unmapped.push(s.label);
      continue;
    }
    const existing = skills.find((x) => x.uri === uri);
    if (existing) {
      if (s.importance === "must") existing.importance = "must";
      continue;
    }
    skills.push({ uri, label: esco.skillLabel(uri) ?? s.label, importance: s.importance });
  }
  const occ =
    (raw.occupationLabel && esco.lookupOccupation(raw.occupationLabel)) ||
    esco.findOccupationInText(title);
  const iscoCode = occ?.iscoCode ?? (raw.iscoCode && ISCO.test(raw.iscoCode) ? raw.iscoCode : null);
  const workValues = Object.fromEntries(
    WORK_VALUES.map((v) => [v, clamp01(raw.workValues[v])]),
  ) as WorkValueProfile;
  return {
    escoOccupationUri: occ?.uri ?? null,
    iscoCode,
    seniority: raw.seniority,
    skills,
    unmappedSkills: unmapped,
    languageRequirements: raw.languageRequirements
      .map((r) => ({ ...r, language: r.language.toLowerCase().slice(0, 2) }))
      .filter((r) => /^[a-z]{2}$/.test(r.language)),
    remotePolicy: raw.remotePolicy,
    employmentTypes: [...new Set(raw.employmentTypes)],
    hoursMin: raw.hoursMin,
    hoursMax: raw.hoursMax,
    educationRequirement:
      raw.explicitMinEducationEqf != null &&
      raw.explicitMinEducationEqf >= 1 &&
      raw.explicitMinEducationEqf <= 8
        ? { minEqf: raw.explicitMinEducationEqf }
        : null,
    workValues,
    // Unmapped skills and a missing occupation lower confidence (→ review queue).
    confidence: clamp01(raw.confidence) * (occ ? 1 : 0.7) * (skills.length === 0 ? 0.6 : 1),
  };
}
