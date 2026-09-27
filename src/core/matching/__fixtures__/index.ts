import { DEFAULT_MODEL_CONFIG } from "../config";
import type {
  MatchCandidate,
  MatchContext,
  MatchJob,
  RiasecProfile,
  WorkValueProfile,
} from "../types";

export const cfg = DEFAULT_MODEL_CONFIG;
export const NOW = new Date("2026-09-01T00:00:00Z");

export const AMSTERDAM = { lat: 52.3676, lng: 4.9041, city: "Amsterdam" };
export const UTRECHT = { lat: 52.0907, lng: 5.1214, city: "Utrecht" };
export const ROTTERDAM = { lat: 51.9244, lng: 4.4777, city: "Rotterdam" };
export const EINDHOVEN = { lat: 51.4416, lng: 5.4697, city: "Eindhoven" };
export const GRONINGEN = { lat: 53.2194, lng: 6.5665, city: "Groningen" };

export const riasec = (code: string): RiasecProfile => {
  const p: RiasecProfile = { R: 0.1, I: 0.1, A: 0.1, S: 0.1, E: 0.1, C: 0.1 };
  [...code].forEach((k, i) => {
    p[k as keyof RiasecProfile] = [0.9, 0.7, 0.5][i] ?? 0.1;
  });
  return p;
};

export const values = (v: Partial<WorkValueProfile>): WorkValueProfile => ({
  achievement: 0.5,
  independence: 0.5,
  recognition: 0.5,
  relationships: 0.5,
  support: 0.5,
  working_conditions: 0.5,
  ...v,
});

/** Skill hierarchy used in tests: python & java are both "programming". */
export const SKILL_BROADER = new Map<string, string[]>([
  ["skill:python", ["skill:programming"]],
  ["skill:java", ["skill:programming"]],
  ["skill:typescript", ["skill:programming"]],
  ["skill:postgresql", ["skill:databases"]],
  ["skill:mysql", ["skill:databases"]],
]);

export const ctx = (extra: Partial<MatchContext> = {}): MatchContext => ({
  now: NOW,
  skillBroader: SKILL_BROADER,
  experienceSimilarity: 0.86,
  ...extra,
});

// ─── Candidates ──────────────────────────────────────────────────────────────

/** Priya – data engineer, needs sponsorship, English only, lives in Amsterdam. */
export const dataEngineer: MatchCandidate = {
  skills: [
    { uri: "skill:python", label: "Python", lastUsedYear: 2026 },
    { uri: "skill:postgresql", label: "PostgreSQL", lastUsedYear: 2025 },
    { uri: "skill:airflow", label: "Apache Airflow", lastUsedYear: 2026 },
    { uri: "skill:spark", label: "Apache Spark", lastUsedYear: 2019 },
  ],
  languages: [{ language: "en", level: "C2" }],
  workStatus: {
    needsSponsorship: true,
    permitType: "needs_permit",
    salaryNormCategory: "standard",
  },
  preferences: {
    desiredOccupations: [{ uri: "occ:data-engineer", iscoCode: "2521" }],
    location: AMSTERDAM,
    maxTravelMinutes: 60,
    travelMode: "public_transport",
    remote: "hybrid",
    minSalaryMonth: 5500,
    hoursMin: 32,
    hoursMax: 40,
    employmentTypes: ["full_time"],
  },
  seniority: "senior",
  educationLevel: 7,
  experienceIscoCodes: ["2521", "2511"],
  riasec: riasec("ICR"),
  workValues: [
    "achievement",
    "independence",
    "working_conditions",
    "recognition",
    "support",
    "relationships",
  ],
};

/** Sanne – nurse, Dutch C2, no sponsorship, Utrecht, part-time. */
export const nurse: MatchCandidate = {
  skills: [
    { uri: "skill:patient-care", label: "patiëntenzorg", lastUsedYear: 2026 },
    { uri: "skill:medication", label: "medicatie toedienen", lastUsedYear: 2026 },
  ],
  languages: [
    { language: "nl", level: "C2" },
    { language: "en", level: "B2" },
  ],
  workStatus: { needsSponsorship: false, permitType: "unrestricted", salaryNormCategory: null },
  preferences: {
    desiredOccupations: [{ uri: "occ:nurse", iscoCode: "2221" }],
    location: UTRECHT,
    maxTravelMinutes: 30,
    travelMode: "bike",
    remote: "onsite",
    minSalaryMonth: 3200,
    hoursMin: 24,
    hoursMax: 32,
    employmentTypes: ["part_time"],
  },
  seniority: "medior",
  educationLevel: 6,
  experienceIscoCodes: ["2221"],
  riasec: riasec("SIC"),
  workValues: [
    "relationships",
    "support",
    "achievement",
    "working_conditions",
    "recognition",
    "independence",
  ],
};

/** Minimal profile: only a CV with skills, nothing else answered yet. */
export const minimal: MatchCandidate = {
  skills: [{ uri: "skill:python", lastUsedYear: null }],
  languages: [],
  workStatus: { needsSponsorship: null, permitType: null, salaryNormCategory: null },
  preferences: {},
  seniority: null,
  educationLevel: null,
  experienceIscoCodes: [],
  riasec: null,
  workValues: null,
};

// ─── Jobs ────────────────────────────────────────────────────────────────────

const baseJob: MatchJob = {
  id: "job-base",
  title: "Base job",
  language: "en",
  skills: [],
  languageRequirements: [],
  visaSponsorship: null,
  company: { name: "Acme", isRecognisedSponsor: false, size: "medium", type: "scaleup" },
  location: AMSTERDAM,
  remotePolicy: "hybrid",
  salaryMinMonth: null,
  salaryMaxMonth: null,
  hoursMin: 36,
  hoursMax: 40,
  employmentTypes: ["full_time"],
  iscoCode: null,
  seniority: null,
  riasec: null,
  workValues: null,
  educationRequirement: null,
};

export const job = (over: Partial<MatchJob>): MatchJob => ({ ...baseJob, ...over });

/** A near-perfect job for the data engineer at a recognised sponsor. */
export const sponsorDataJob = job({
  id: "job-data-sponsor",
  title: "Senior Data Engineer",
  skills: [
    { uri: "skill:python", label: "Python", importance: "must" },
    { uri: "skill:postgresql", label: "PostgreSQL", importance: "must" },
    { uri: "skill:airflow", label: "Apache Airflow", importance: "nice" },
  ],
  languageRequirements: [{ language: "en", level: "C1", required: true }],
  visaSponsorship: true,
  company: { name: "Canal Analytics", isRecognisedSponsor: true, size: "large", type: "scaleup" },
  salaryMinMonth: 6000,
  salaryMaxMonth: 7500,
  iscoCode: "2521",
  seniority: "senior",
  riasec: riasec("ICE"),
  workValues: values({ achievement: 0.9, independence: 0.8, working_conditions: 0.7 }),
});

export const dutchNurseJob = job({
  id: "job-nurse-utrecht",
  title: "Verpleegkundige interne geneeskunde",
  language: "nl",
  skills: [
    { uri: "skill:patient-care", label: "patiëntenzorg", importance: "must" },
    { uri: "skill:medication", label: "medicatie toedienen", importance: "must" },
    { uri: "skill:wound-care", label: "wondverzorging", importance: "nice" },
  ],
  languageRequirements: [{ language: "nl", level: "C1", required: true }],
  company: {
    name: "Ziekenhuis Domstad",
    isRecognisedSponsor: false,
    size: "enterprise",
    type: "public",
  },
  location: UTRECHT,
  remotePolicy: "onsite",
  salaryMinMonth: 3300,
  salaryMaxMonth: 4700,
  hoursMin: 24,
  hoursMax: 36,
  employmentTypes: ["part_time", "full_time"],
  iscoCode: "2221",
  seniority: "medior",
  riasec: riasec("SIC"),
  workValues: values({ relationships: 0.9, support: 0.8 }),
});
