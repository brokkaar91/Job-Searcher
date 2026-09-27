/**
 * In-memory ESCO lookup used for grounding (LLM output → valid URIs), the mock parser and
 * autocomplete fallbacks. Pure – built from rows loaded by the caller.
 */

export interface EscoSkillRef {
  uri: string;
  preferredLabelEn: string;
  preferredLabelNl?: string | null;
  altLabels?: string[];
  broaderUris?: string[];
}

export interface EscoOccupationRef {
  uri: string;
  iscoCode: string;
  preferredLabelEn: string;
  preferredLabelNl?: string | null;
  altLabels?: string[];
}

export function normalizeLabel(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.\s-]/gu, " ")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface LabelEntry<T> {
  label: string;
  norm: string;
  ref: T;
  re: RegExp;
}

function buildEntries<
  T extends { preferredLabelEn: string; preferredLabelNl?: string | null; altLabels?: string[] },
>(refs: T[]): LabelEntry<T>[] {
  const out: LabelEntry<T>[] = [];
  for (const ref of refs) {
    const labels = new Set(
      [ref.preferredLabelEn, ref.preferredLabelNl ?? "", ...(ref.altLabels ?? [])].filter(Boolean),
    );
    for (const label of labels) {
      const norm = normalizeLabel(label);
      if (norm.length < 1) continue;
      // Very short labels ("R", "C", "Go") only match case-sensitively as whole tokens.
      const re =
        norm.length <= 2
          ? new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(label)}(?![\\p{L}\\p{N}+#])`, "u")
          : new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(norm)}(?![\\p{L}\\p{N}+#])`, "u");
      out.push({ label, norm, ref, re });
    }
  }
  // Longest labels first so "project management software" wins over "project management".
  return out.sort((a, b) => b.norm.length - a.norm.length);
}

export interface TextMatch<T> {
  ref: T;
  label: string;
  index: number;
}

export class EscoIndex {
  readonly skills: Map<string, EscoSkillRef>;
  readonly occupations: Map<string, EscoOccupationRef>;
  private skillEntries: LabelEntry<EscoSkillRef>[];
  private occupationEntries: LabelEntry<EscoOccupationRef>[];

  constructor(skills: EscoSkillRef[], occupations: EscoOccupationRef[] = []) {
    this.skills = new Map(skills.map((s) => [s.uri, s]));
    this.occupations = new Map(occupations.map((o) => [o.uri, o]));
    this.skillEntries = buildEntries(skills);
    this.occupationEntries = buildEntries(occupations);
  }

  /** ESCO hierarchy for the matching engine. */
  broaderMap(): Map<string, string[]> {
    return new Map([...this.skills.values()].map((s) => [s.uri, s.broaderUris ?? []]));
  }

  skillLabel(uri: string, locale: "nl" | "en" = "en"): string | null {
    const s = this.skills.get(uri);
    if (!s) return null;
    return locale === "nl" ? (s.preferredLabelNl ?? s.preferredLabelEn) : s.preferredLabelEn;
  }

  /** Exact (normalised) label → skill. */
  lookupSkill(label: string): EscoSkillRef | null {
    const norm = normalizeLabel(label);
    return this.skillEntries.find((e) => e.norm === norm)?.ref ?? null;
  }

  lookupOccupation(label: string): EscoOccupationRef | null {
    const norm = normalizeLabel(label);
    return this.occupationEntries.find((e) => e.norm === norm)?.ref ?? null;
  }

  /** All skills mentioned in a text (each skill once, first occurrence). */
  findSkillsInText(text: string): TextMatch<EscoSkillRef>[] {
    return findAll(this.skillEntries, text);
  }

  /** Best occupation for a job/role title: longest label contained in the title. */
  findOccupationInText(text: string): EscoOccupationRef | null {
    return findAll(this.occupationEntries, text)[0]?.ref ?? null;
  }

  /** Simple lexical search (autocomplete fallback / LLM grounding candidates). */
  searchSkills(query: string, limit = 10): EscoSkillRef[] {
    const q = normalizeLabel(query);
    if (!q) return [];
    const scored = new Map<string, number>();
    for (const e of this.skillEntries) {
      const score = e.norm === q ? 3 : e.norm.startsWith(q) ? 2 : e.norm.includes(q) ? 1 : 0;
      if (score > (scored.get(e.ref.uri) ?? 0)) scored.set(e.ref.uri, score);
    }
    return [...scored.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([uri]) => this.skills.get(uri)!);
  }
}

function findAll<T extends { uri: string }>(
  entries: LabelEntry<T>[],
  text: string,
): TextMatch<T>[] {
  const norm = normalizeLabel(text);
  const seen = new Set<string>();
  const out: TextMatch<T>[] = [];
  for (const e of entries) {
    if (seen.has(e.ref.uri)) continue;
    const m = e.norm.length <= 2 ? e.re.exec(text) : e.re.exec(norm);
    if (m) {
      seen.add(e.ref.uri);
      out.push({ ref: e.ref, label: e.label, index: m.index });
    }
  }
  return out.sort((a, b) => a.index - b.index || b.label.length - a.label.length);
}
