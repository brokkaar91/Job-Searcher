import type { PracticalResult, SkillsResult } from "./components";
import type {
  ComponentKey,
  ComponentScore,
  KnockoutResult,
  MatchCandidate,
  MatchJob,
  MatchResult,
  Message,
  WorkValue,
} from "./types";

/**
 * Plain-language explanations. Template-based (i18n keys + params, rendered in NL/EN by the UI),
 * never generated free text – so every explanation is reproducible and auditable.
 */

interface Candidate extends Message {
  strength: number;
}

interface ReasonInput {
  candidate: MatchCandidate;
  job: MatchJob;
  components: Record<ComponentKey, ComponentScore>;
  skills: SkillsResult;
  occupation: { familySimilarity: number | null; score: number | null };
  values: { topMatch: WorkValue | null };
  practical: PracticalResult;
  knockouts: KnockoutResult[];
}

/** Short display label: "Python (computer programming)" → "Python". */
export const shortLabel = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, " ").trim();

const labelList = (xs: (string | null | undefined)[], n = 2) =>
  xs
    .filter((x): x is string => !!x)
    .map(shortLabel)
    .slice(0, n)
    .join(", ");

export function buildReasons(i: ReasonInput): Message[] {
  const out: Candidate[] = [];
  const { components: comp, candidate: c, job: j } = i;

  const s = comp.skills;
  if (s.score != null && s.score >= 0.5) {
    const mustTotal = j.skills.filter((x) => x.importance === "must").length;
    const mustMatched = i.skills.matched.filter((m) => m.importance === "must").length;
    const examples = labelList(
      [...i.skills.matched]
        .sort((a, b) => Number(b.importance === "must") - Number(a.importance === "must"))
        .map((m) => m.label),
    );
    out.push(
      mustTotal > 0 && mustMatched === mustTotal
        ? {
            key: "reason.skillsAllMust",
            params: { count: mustTotal, examples },
            strength: s.points + 2,
          }
        : {
            key: "reason.skills",
            params: { matched: i.skills.matched.length, total: j.skills.length, examples },
            strength: s.points,
          },
    );
  }

  const e = comp.experience;
  if (e.score != null && e.score >= 0.6) out.push({ key: "reason.experience", strength: e.points });

  const o = comp.occupation;
  if (o.score != null && i.occupation.familySimilarity != null) {
    if (i.occupation.familySimilarity >= 1)
      out.push({ key: "reason.occupationSame", strength: o.points });
    else if (i.occupation.familySimilarity >= 0.5)
      out.push({ key: "reason.occupationRelated", strength: o.points * 0.8 });
  }

  const it = comp.interests;
  if (it.score != null && it.score >= 0.5) {
    out.push({
      key: "reason.interests",
      params: { code: String(it.message.params?.job ?? "") },
      strength: it.points,
    });
  }

  const v = comp.values;
  if (v.score != null && i.values.topMatch) {
    out.push({ key: "reason.values", params: { value: i.values.topMatch }, strength: v.points });
  }

  const p = i.practical.parts;
  const pw = comp.practical.weight * 100;
  if (p.salary === 1 && (j.salaryMaxMonth ?? j.salaryMinMonth) != null) {
    out.push({
      key: "reason.salary",
      params: { amount: Math.round((j.salaryMaxMonth ?? j.salaryMinMonth)!) },
      strength: pw * 0.5,
    });
  }
  if (j.remotePolicy === "remote" && c.preferences.remote !== "onsite") {
    out.push({ key: "reason.remote", strength: pw * 0.45 });
  } else if (p.travel != null && p.travel >= 0.8 && i.practical.travelMinutes != null) {
    out.push({
      key: "reason.travel",
      params: { minutes: i.practical.travelMinutes },
      strength: pw * 0.4,
    });
  }

  out.sort((a, b) => b.strength - a.strength || a.key.localeCompare(b.key));
  const top = out.slice(0, 3).map(({ key, params }) => (params ? { key, params } : { key }));
  return top.length ? top : [{ key: "reason.fallback" }];
}

export function buildNotes(r: MatchResult): Message[] {
  const notes: Message[] = [];
  if (r.knockedOut) notes.push({ key: "note.knockedOut" });
  for (const k of r.knockouts) if (k.status === "unknown") notes.push(k.message);
  if (r.limitedData) notes.push({ key: "note.limitedData" });
  return notes;
}
