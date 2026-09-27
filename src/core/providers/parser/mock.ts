import type {
  Cefr,
  EmploymentType,
  RemotePolicy,
  Seniority,
  WorkValueProfile,
} from "../../matching/types";
import { groundCv, groundJob } from "./ground";
import type { JobClassificationRaw, ParsedCvRaw } from "./schemas";
import type { JobClassification, JobInput, ParsedCv, ParserContext, ParserProvider } from "./types";

/**
 * Deterministic, offline heuristic parser. Used in tests, local development without an API key,
 * and as the seed/demo parser. Quality is intentionally modest; it only recognises skills that
 * exist in the loaded ESCO subset.
 */

const LANGUAGE_NAMES: Record<string, string[]> = {
  nl: ["dutch", "nederlands", "flemish"],
  en: ["english", "engels"],
  de: ["german", "duits", "deutsch"],
  fr: ["french", "frans", "français"],
  es: ["spanish", "spaans", "español"],
  it: ["italian", "italiaans"],
  pt: ["portuguese", "portugees"],
  pl: ["polish", "pools"],
  tr: ["turkish", "turks"],
  ar: ["arabic", "arabisch"],
  hi: ["hindi"],
  zh: ["chinese", "mandarin", "chinees"],
  ru: ["russian", "russisch"],
  uk: ["ukrainian", "oekraïens"],
};

const LEVEL_WORDS: [RegExp, Cefr][] = [
  [/\b(C2|native|mother tongue|moedertaal|bilingual|tweetalig)\b/i, "C2"],
  [/\b(C1|fluent|vloeiend|proficient|advanced|uitstekend)\b/i, "C1"],
  [/\b(B2|good|goed|professional working|upper[- ]intermediate)\b/i, "B2"],
  [/\b(B1|intermediate|redelijk|conversational)\b/i, "B1"],
  [/\b(A2|basic|basis|elementary|beginner)\b/i, "A2"],
  [/\bA1\b/, "A1"],
];

const YEAR_RANGE =
  /((?:19|20)\d{2})(?:[-/.]\d{1,2})?\s*(?:-|–|—|to|tot|until)\s*((?:19|20)\d{2}(?:[-/.]\d{1,2})?|present|now|current|heden|nu|huidig)/i;

function detectLevel(s: string): Cefr | null {
  for (const [re, level] of LEVEL_WORDS) if (re.test(s)) return level;
  return null;
}

function detectLanguages(
  text: string,
  fallbackLevel: Cefr | null,
): { language: string; level: Cefr }[] {
  const out: { language: string; level: Cefr }[] = [];
  for (const line of text.split(/\n|;|,(?![^(]*\))/)) {
    const lower = line.toLowerCase();
    for (const [code, names] of Object.entries(LANGUAGE_NAMES)) {
      if (!names.some((n) => new RegExp(`\\b${n}\\b`, "i").test(lower))) continue;
      const level = detectLevel(line) ?? fallbackLevel;
      if (level && !out.some((o) => o.language === code)) out.push({ language: code, level });
    }
  }
  return out;
}

function sectionOf(text: string, headings: RegExp): string {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => headings.test(l.trim()));
  if (start < 0) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(
    (l) => /^[A-Z][A-Za-z ]{2,30}:?$/.test(l.trim()) && !/^[-•*]/.test(l.trim()),
  );
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}

function yearOf(s: string, currentYear: number): number {
  return /present|now|current|heden|nu|huidig/i.test(s) ? currentYear : Number(s.slice(0, 4));
}

export class MockParserProvider implements ParserProvider {
  readonly name = "mock";
  readonly version = "mock:v1";
  constructor(private readonly now: () => Date = () => new Date()) {}

  async parseCv(redactedText: string, ctx: ParserContext): Promise<ParsedCv> {
    const currentYear = this.now().getFullYear();
    const lines = redactedText.split("\n");

    // Experience blocks: a line with a year range starts a block.
    const blocks: {
      title: string;
      org: string | null;
      start: number;
      end: number;
      isCurrent: boolean;
      body: string[];
      from: number;
      to: number;
    }[] = [];
    let offset = 0;
    for (const line of lines) {
      const m = YEAR_RANGE.exec(line);
      if (m) {
        const head = line
          .replace(YEAR_RANGE, "")
          .replace(/[()|,–—-]+\s*$/, "")
          .replace(/^[-•*\s]+/, "")
          .trim();
        const [title, org] = head.split(/\s+(?:at|bij|@)\s+|\s+[|–—]\s+|,\s+/i);
        const isCurrent = /present|now|current|heden|nu|huidig/i.test(m[2]!);
        blocks.push({
          title: (title ?? head).trim(),
          org: org?.trim() || null,
          start: Number(m[1]),
          end: yearOf(m[2]!, currentYear),
          isCurrent,
          body: [],
          from: offset,
          to: offset,
        });
      } else if (blocks.length && line.trim()) {
        const b = blocks[blocks.length - 1]!;
        if (
          b.body.length < 8 &&
          !/^(education|opleiding|skills|vaardigheden|languages|talen)\b/i.test(line.trim())
        )
          b.body.push(line.trim());
      }
      offset += line.length + 1;
      if (blocks.length) blocks[blocks.length - 1]!.to = offset;
    }

    const skills: ParsedCvRaw["skills"] = ctx.esco.findSkillsInText(redactedText).map((m) => {
      const block = blocks.find((b) => m.index >= b.from && m.index < b.to);
      const lastUsed = block?.end ?? (blocks.length ? Math.max(...blocks.map((b) => b.end)) : null);
      return {
        label: m.ref.preferredLabelEn,
        lastUsedYear: lastUsed,
        evidence: block ? block.title : m.label,
      };
    });

    const totalYears = blocks.reduce((s, b) => s + Math.max(0, b.end - b.start), 0);
    const latestTitle = blocks.find((b) => b.isCurrent)?.title ?? blocks[0]?.title ?? "";
    const seniority: Seniority | null = /\b(head|director|chief|cto|vp)\b/i.test(latestTitle)
      ? "executive"
      : /\b(lead|manager|principal|teamleider|leidinggevende)\b/i.test(latestTitle)
        ? "lead"
        : blocks.length === 0
          ? null
          : totalYears >= 6
            ? "senior"
            : totalYears >= 2
              ? "medior"
              : "junior";

    const edu = redactedText;
    const educationLevelEqf = /\b(phd|ph\.d|doctorate|promotie)\b/i.test(edu)
      ? 8
      : /\b(msc|m\.sc|master|ma\b|wo\b|university of|universiteit)/i.test(edu)
        ? 7
        : /\b(bsc|b\.sc|bachelor|hbo|university of applied sciences|hogeschool)/i.test(edu)
          ? 6
          : /\bmbo\b/i.test(edu)
            ? 4
            : null;

    const langSection =
      sectionOf(redactedText, /^(languages|talen|language skills)\b/i) || redactedText;
    const summary = sectionOf(
      redactedText,
      /^(profile|profiel|summary|samenvatting|about me|over mij)\b/i,
    )
      .split("\n")
      .slice(0, 3)
      .join(" ")
      .trim();

    const raw: ParsedCvRaw = {
      summary,
      seniority,
      educationLevelEqf,
      skills,
      experiences: blocks.map((b) => ({
        title: b.title,
        organisation: b.org,
        startDate: String(b.start),
        endDate: b.isCurrent ? null : String(b.end),
        isCurrent: b.isCurrent,
        description: b.body.join(" ").slice(0, 600),
        occupationLabel: null,
        iscoCode: null,
      })),
      languages: detectLanguages(langSection, null),
    };
    return groundCv(raw, ctx.esco);
  }

  async classifyJob(job: JobInput, ctx: ParserContext): Promise<JobClassification> {
    const text = `${job.title}\n${job.description}`;
    const lower = text.toLowerCase();

    const niceStart = lower.search(
      /nice to have|nice-to-have|\bpré\b|\bpre\b:|bonus points|preferred|pluspunten|een plus|is een pre|would be a plus|bonus:/,
    );
    const skills = ctx.esco.findSkillsInText(text).map((m) => ({
      label: m.ref.preferredLabelEn,
      importance: (niceStart >= 0 && m.index > niceStart ? "nice" : "must") as "must" | "nice",
    }));

    const languageRequirements: JobClassificationRaw["languageRequirements"] = [];
    for (const sentence of text.split(/[.\n]/)) {
      for (const l of detectLanguages(sentence, "B2")) {
        if (languageRequirements.some((r) => r.language === l.language)) continue;
        const optional = /plus|pré|\bpre\b|nice|bonus|advantage|voordeel|preferred/i.test(sentence);
        languageRequirements.push({ ...l, required: !optional });
      }
    }

    const remotePolicy: RemotePolicy | null =
      /fully remote|100% remote|remote[- ]first|volledig (?:vanuit huis|thuis|remote)|work from anywhere/i.test(
        text,
      )
        ? "remote"
        : /hybrid|hybride|\d days? (?:a week )?(?:in|at) the office|dagen (?:per week )?op kantoor|deels thuis|thuiswerken/i.test(
              text,
            )
          ? "hybrid"
          : /on[- ]site|op locatie|on location|in de winkel|in het ziekenhuis|op de werkvloer/i.test(
                text,
              )
            ? "onsite"
            : null;

    const employmentTypes = new Set<EmploymentType>();
    if (/full[- ]?time|fulltime|voltijd/i.test(text)) employmentTypes.add("full_time");
    if (/part[- ]?time|parttime|deeltijd/i.test(text)) employmentTypes.add("part_time");
    if (/freelance|\bzzp\b|interim/i.test(text)) employmentTypes.add("freelance");
    if (/internship|\bstage\b|stagiair/i.test(text)) employmentTypes.add("internship");
    if (/temporary|tijdelijk|fixed[- ]term/i.test(text)) employmentTypes.add("temporary");

    let hoursMin: number | null = null;
    let hoursMax: number | null = null;
    const hr = /(\d{2})\s*(?:-|–|tot|to)\s*(\d{2})\s*(?:uur|hours|hrs|u\b)/i.exec(text);
    const hs = /(\d{2})\s*(?:uur|hours|hrs)(?:\s*(?:per|p\/)\s*(?:week|w))?/i.exec(text);
    if (hr) [hoursMin, hoursMax] = [Number(hr[1]), Number(hr[2])];
    else if (hs) hoursMin = hoursMax = Number(hs[1]);
    if (hoursMin != null && (hoursMin < 4 || hoursMin > 60)) hoursMin = hoursMax = null;

    const explicitMinEducationEqf =
      /(?:\bwo\b|master'?s?|msc|universitair)[- ]?(?:diploma|degree|opleiding)?\s*(?:is\s*)?(?:vereist|verplicht|required|mandatory)/i.test(
        text,
      )
        ? 7
        : /(?:\bhbo\b|bachelor'?s?|bsc)[- ]?(?:diploma|degree)\s*(?:is\s*)?(?:vereist|verplicht|required|mandatory)/i.test(
              text,
            )
          ? 6
          : /\bmbo\b[- ]?(?:\d\s*)?(?:diploma)\s*(?:is\s*)?(?:vereist|verplicht|required)/i.test(
                text,
              )
            ? 4
            : null;

    const seniority: Seniority | null = /\b(intern|stagiair)\b/i.test(job.title)
      ? "intern"
      : /\b(junior|starter|graduate|trainee)\b/i.test(job.title)
        ? "junior"
        : /\b(head of|director|chief|cto|cfo|vp)\b/i.test(job.title)
          ? "executive"
          : /\b(lead|principal|manager|teamleider|staff)\b/i.test(job.title)
            ? "lead"
            : /\b(senior|sr\.?)\b/i.test(job.title)
              ? "senior"
              : /\b(medior|mid[- ]level)\b/i.test(job.title)
                ? "medior"
                : null;

    const v = (re: RegExp, hit: number) => (re.test(text) ? hit : 0.5);
    const workValues: WorkValueProfile = {
      achievement: v(/impact|challeng|uitdag|groei|growth|ambiti|ownership/i, 0.85),
      independence: v(/autonom|zelfstandig|ownership|vrijheid|freedom|self[- ]directed/i, 0.85),
      recognition: v(
        /career|carrière|doorgroei|recognition|waardering|leadership|promotion/i,
        0.75,
      ),
      relationships: v(/team|collega|colleague|samenwerk|collaborat|community/i, 0.8),
      support: v(
        /training|coaching|mentor|begeleiding|opleidingsbudget|learning budget|onboarding/i,
        0.85,
      ),
      working_conditions: v(
        /flexib|thuiswerk|work[- ]life|balance|pensioen|pension|vakantiedagen|holiday|secondary benefits|arbeidsvoorwaarden/i,
        0.85,
      ),
    };

    const occ = ctx.esco.findOccupationInText(job.title);
    const raw: JobClassificationRaw = {
      occupationLabel: occ?.preferredLabelEn ?? null,
      iscoCode: occ?.iscoCode ?? null,
      seniority,
      skills,
      languageRequirements,
      remotePolicy,
      employmentTypes: [...employmentTypes],
      hoursMin,
      hoursMax,
      explicitMinEducationEqf,
      workValues,
      confidence: Math.min(0.9, 0.5 + 0.1 * Math.min(skills.length, 4)),
    };
    return groundJob(raw, ctx.esco, job.title);
  }
}
