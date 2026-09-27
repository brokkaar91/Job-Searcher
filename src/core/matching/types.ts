/**
 * Domain types for the matching engine.
 *
 * COMPLIANCE: `MatchCandidate` intentionally has NO fields for name, age/birth date, gender, photo,
 * nationality or address. Do not add them. `sanitizeCandidate()` (allow-list) and
 * `protected-attributes.test.ts` guard this.
 */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Cefr = (typeof CEFR_LEVELS)[number];

export const RIASEC_KEYS = ["R", "I", "A", "S", "E", "C"] as const;
export type RiasecKey = (typeof RIASEC_KEYS)[number];
/** Normalised interest profile, each dimension 0..1. */
export type RiasecProfile = Record<RiasecKey, number>;

/** O*NET work values (Work Importance Profiler), used for the values ranking. */
export const WORK_VALUES = [
  "achievement",
  "independence",
  "recognition",
  "relationships",
  "support",
  "working_conditions",
] as const;
export type WorkValue = (typeof WORK_VALUES)[number];
export type WorkValueProfile = Record<WorkValue, number>;

export const SENIORITY_LEVELS = [
  "intern",
  "junior",
  "medior",
  "senior",
  "lead",
  "executive",
] as const;
export type Seniority = (typeof SENIORITY_LEVELS)[number];

export const REMOTE_POLICIES = ["onsite", "hybrid", "remote"] as const;
export type RemotePolicy = (typeof REMOTE_POLICIES)[number];
export type RemotePreference = RemotePolicy | "any";

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "freelance",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const COMPANY_SIZES = ["micro", "small", "medium", "large", "enterprise"] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];
export const COMPANY_TYPES = [
  "startup",
  "scaleup",
  "sme",
  "corporate",
  "public",
  "nonprofit",
  "agency",
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const PERMIT_TYPES = [
  "unrestricted",
  "highly_skilled_migrant",
  "eu_blue_card",
  "orientation_year",
  "dependent_free_labour",
  "intra_company_transfer",
  "student",
  "needs_permit",
  "other",
] as const;
export type PermitType = (typeof PERMIT_TYPES)[number];

export const SALARY_NORM_CATEGORIES = ["standard", "reduced", "graduate"] as const;
export type SalaryNormCategory = (typeof SALARY_NORM_CATEGORIES)[number];

export const TRAVEL_MODES = ["public_transport", "car", "bike"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export interface GeoPoint {
  lat: number;
  lng: number;
  city?: string | null;
}

export interface CandidateSkill {
  uri: string;
  label?: string | null;
  /** Year the skill was last used; null = unknown. */
  lastUsedYear?: number | null;
}

export interface CandidateLanguage {
  language: string; // ISO 639-1
  level: Cefr;
}

export interface CandidatePreferences {
  desiredOccupations?: { uri: string; iscoCode: string; label?: string | null }[];
  location?: GeoPoint | null;
  maxTravelMinutes?: number | null;
  travelMode?: TravelMode | null;
  remote?: RemotePreference | null;
  minSalaryMonth?: number | null;
  hoursMin?: number | null;
  hoursMax?: number | null;
  employmentTypes?: EmploymentType[];
  companySizes?: CompanySize[];
  companyTypes?: CompanyType[];
}

export interface MatchCandidate {
  skills: CandidateSkill[];
  languages: CandidateLanguage[];
  workStatus: {
    needsSponsorship: boolean | null;
    permitType: PermitType | null;
    salaryNormCategory: SalaryNormCategory | null;
  };
  preferences: CandidatePreferences;
  seniority: Seniority | null;
  /** EQF level 1..8; only used when a job explicitly requires a minimum level. */
  educationLevel: number | null;
  /** ISCO-08 unit group codes of previous roles. */
  experienceIscoCodes: string[];
  riasec: RiasecProfile | null;
  /** Ranking of the 6 work values, most important first. */
  workValues: WorkValue[] | null;
}

export interface JobSkill {
  uri: string;
  label?: string | null;
  importance: "must" | "nice";
}

export interface LanguageRequirement {
  language: string;
  level: Cefr;
  required: boolean;
}

export interface MatchJob {
  id: string;
  title: string;
  /** Language the ad is written in (ISO 639-1). */
  language: string | null;
  skills: JobSkill[];
  languageRequirements: LanguageRequirement[];
  visaSponsorship: boolean | null;
  company: {
    name?: string | null;
    isRecognisedSponsor: boolean;
    size?: CompanySize | null;
    type?: CompanyType | null;
  } | null;
  location: GeoPoint | null;
  remotePolicy: RemotePolicy | null;
  salaryMinMonth: number | null;
  salaryMaxMonth: number | null;
  hoursMin: number | null;
  hoursMax: number | null;
  employmentTypes: EmploymentType[];
  iscoCode: string | null;
  seniority: Seniority | null;
  /** RIASEC profile of the occupation (0..1 per dimension). */
  riasec: RiasecProfile | null;
  /** Work values profile of the occupation/job (0..1 per value). */
  workValues: WorkValueProfile | null;
  /** Only set when the ad EXPLICITLY requires a minimum education level. */
  educationRequirement: { minEqf: number } | null;
}

/** Pre-computed, non-pure inputs (embeddings, routing, ESCO hierarchy). */
export interface MatchContext {
  /** Cosine similarity between (redacted) experience text and the job, -1..1. */
  experienceSimilarity?: number | null;
  /** Travel time in minutes from a TravelTimeProvider; otherwise estimated from coordinates. */
  travelMinutes?: number | null;
  /** ESCO skill hierarchy: uri → broader uris. */
  skillBroader?: ReadonlyMap<string, readonly string[]>;
  /** Reference date for skill recency. */
  now?: Date;
}

// ─── Output ──────────────────────────────────────────────────────────────────

/** A translatable message: i18n key (under `matching.`) + interpolation params. */
export interface Message {
  key: string;
  params?: Record<string, string | number>;
}

export const KNOCKOUT_RULES = [
  "sponsorship",
  "language",
  "location",
  "salary",
  "contract",
  "education",
] as const;
export type KnockoutRule = (typeof KNOCKOUT_RULES)[number];
export type KnockoutStatus = "pass" | "fail" | "unknown";

export interface KnockoutResult {
  rule: KnockoutRule;
  status: KnockoutStatus;
  message: Message;
}

export const COMPONENTS = [
  "skills",
  "experience",
  "occupation",
  "interests",
  "values",
  "practical",
] as const;
export type ComponentKey = (typeof COMPONENTS)[number];

export interface ComponentScore {
  /** 0..1, or null when there is not enough data (weight is then redistributed). */
  score: number | null;
  /** Effective weight after redistribution, 0..1 (sums to 1 over non-null components). */
  weight: number;
  /** Contribution to the total in points (0..100). */
  points: number;
  message: Message;
}

export interface SkillGap {
  uri: string;
  label: string | null;
  importance: "must" | "nice";
  /** "missing" = no evidence, "related" = only a related (broader/narrower) skill found. */
  status: "missing" | "related";
}

export type MatchLabel = "strong" | "good" | "possible" | "weak";

export interface MatchResult {
  jobId: string;
  totalScore: number; // 0..100, one decimal
  label: MatchLabel;
  components: Record<ComponentKey, ComponentScore>;
  reasons: Message[]; // top 3
  gaps: SkillGap[];
  languageGaps: { language: string; required: Cefr; actual: Cefr | null }[];
  knockouts: KnockoutResult[];
  knockedOut: boolean;
  limitedData: boolean;
  notes: Message[];
}
