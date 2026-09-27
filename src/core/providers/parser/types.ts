import type {
  Cefr,
  EmploymentType,
  LanguageRequirement,
  RemotePolicy,
  Seniority,
  WorkValueProfile,
} from "../../matching/types";
import type { EscoIndex } from "../../esco";

/** CV parse result after ESCO grounding. Input text is ALWAYS redacted before parsing. */
export interface ParsedCv {
  summary: string;
  seniority: Seniority | null;
  educationLevel: number | null;
  skills: {
    label: string;
    escoUri: string | null;
    lastUsedYear: number | null;
    evidence: string;
  }[];
  experiences: {
    title: string;
    organisation: string | null;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    description: string;
    escoOccupationUri: string | null;
    iscoCode: string | null;
  }[];
  languages: { language: string; level: Cefr }[];
}

export interface JobInput {
  title: string;
  description: string;
  companyName?: string | null;
}

export interface JobClassification {
  escoOccupationUri: string | null;
  iscoCode: string | null;
  seniority: Seniority | null;
  skills: { uri: string; label: string; importance: "must" | "nice" }[];
  unmappedSkills: string[];
  languageRequirements: LanguageRequirement[];
  remotePolicy: RemotePolicy | null;
  employmentTypes: EmploymentType[];
  hoursMin: number | null;
  hoursMax: number | null;
  educationRequirement: { minEqf: number } | null;
  workValues: WorkValueProfile | null;
  confidence: number;
}

export interface ParserContext {
  esco: EscoIndex;
}

/**
 * Pluggable CV parser / job classifier. Implementations: Claude (default in prod), mock
 * (heuristic, offline). Textkernel can be added later behind this interface.
 */
export interface ParserProvider {
  readonly name: string;
  readonly version: string;
  parseCv(redactedText: string, ctx: ParserContext): Promise<ParsedCv>;
  classifyJob(job: JobInput, ctx: ParserContext): Promise<JobClassification>;
}
