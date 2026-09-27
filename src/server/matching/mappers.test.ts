import { describe, expect, it } from "vitest";
import {
  parseVector,
  toMatchCandidate,
  toMatchJob,
  toVectorLiteral,
  type CandidateRows,
  type JobRows,
} from "./mappers";

const candidateRows: CandidateRows = {
  profile: {
    seniority: "senior",
    education_level: 7,
    preferences: {
      location: { lat: 52.37, lng: 4.9, city: "Amsterdam" },
      remote: "hybrid",
      minSalaryMonth: 5000,
      employmentTypes: ["full_time"],
      bogus: "ignored",
    },
    riasec: { R: 0.1, I: 0.9, A: 0.1, S: 0.1, E: 0.1, C: 0.7 },
    work_values: [
      "achievement",
      "independence",
      "recognition",
      "relationships",
      "support",
      "working_conditions",
    ],
  },
  skills: [
    { esco_uri: "urn:jm:skill:python", label: "Python", last_used_year: 2026, confirmed: true },
    { esco_uri: null, label: "Unmapped thing", last_used_year: null, confirmed: true },
  ],
  experiences: [{ isco_code: "2521" }, { isco_code: "2521" }, { isco_code: null }],
  languages: [{ language: "en", level: "C1" }],
};

const jobRows: JobRows = {
  job: {
    id: "j1",
    title: "Data Engineer",
    language: "en",
    esco_skills: [
      { uri: "urn:jm:skill:python", label: "Python", importance: "must" },
      { broken: true },
    ],
    language_requirements: [{ language: "en", level: "C1", required: true }],
    lat: 52.37,
    lng: 4.9,
    city: "Amsterdam",
    remote_policy: "hybrid",
    salary_min_month: 5000,
    salary_max_month: 6000,
    hours_min: 36,
    hours_max: 40,
    employment_types: ["full_time"],
    isco_code: "2521",
    seniority: "senior",
    work_values: null,
    education_requirement: { min_eqf: 7, explicit: true },
  },
  company: { name: "Canal", size: "medium", type: "scaleup" },
  occupation: {
    riasec: { R: 0.5, I: 0.9, A: 0.15, S: 0.15, E: 0.15, C: 0.7 },
    work_values: {
      achievement: 0.8,
      independence: 0.8,
      recognition: 0.4,
      relationships: 0.4,
      support: 0.5,
      working_conditions: 0.6,
    },
  },
};

describe("toMatchCandidate", () => {
  it("maps rows and drops unmapped skills, unknown preference keys and duplicate ISCO codes", () => {
    const c = toMatchCandidate(candidateRows);
    expect(c.skills).toEqual([{ uri: "urn:jm:skill:python", label: "Python", lastUsedYear: 2026 }]);
    expect(c.experienceIscoCodes).toEqual(["2521"]);
    expect(c.preferences).not.toHaveProperty("bogus");
    expect(c.preferences.remote).toBe("hybrid");
    expect(c.workValues?.[0]).toBe("achievement");
    expect(c.riasec?.I).toBe(0.9);
  });

  it("tolerates empty / invalid JSON columns", () => {
    const c = toMatchCandidate({
      ...candidateRows,
      profile: {
        ...candidateRows.profile,
        preferences: "nope",
        riasec: { R: "x" },
        work_values: ["achievement"],
      },
    });
    expect(c.preferences).toEqual({});
    expect(c.riasec).toBeNull();
    expect(c.workValues).toBeNull();
  });
});

describe("toMatchJob", () => {
  it("maps rows, falls back to the occupation's work values and parses the education requirement", () => {
    const j = toMatchJob(jobRows);
    expect(j.skills).toEqual([{ uri: "urn:jm:skill:python", label: "Python", importance: "must" }]); // invalid element dropped
    expect(j.location).toEqual({ lat: 52.37, lng: 4.9, city: "Amsterdam" });
    expect(j.workValues?.achievement).toBe(0.8);
    expect(j.educationRequirement).toEqual({ minEqf: 7 });
    expect(j.riasec?.I).toBe(0.9);
  });

  it("keeps valid skills", () => {
    const j = toMatchJob({
      ...jobRows,
      job: { ...jobRows.job, esco_skills: [{ uri: "u", importance: "nice" }] },
    });
    expect(j.skills).toEqual([{ uri: "u", importance: "nice" }]);
  });
});

describe("vectors", () => {
  it("round-trips pgvector literals", () => {
    expect(parseVector(toVectorLiteral([0.5, -0.25, 1]))).toEqual([0.5, -0.25, 1]);
    expect(parseVector(null)).toBeNull();
  });
});
