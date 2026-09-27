import { describe, expect, it } from "vitest";
import {
  iscoSimilarity,
  scoreExperience,
  scoreInterests,
  scoreOccupation,
  scorePractical,
  scoreSkills,
  scoreValues,
  seniorityFit,
  valueWeights,
} from "../components";
import { hollandCode, iachanCongruence } from "../riasec";
import { estimateTravelMinutes, haversineKm } from "../geo";
import {
  AMSTERDAM,
  ROTTERDAM,
  UTRECHT,
  cfg,
  ctx,
  dataEngineer,
  job,
  minimal,
  nurse,
  riasec,
  sponsorDataJob,
  values,
} from "../__fixtures__";

describe("skills component", () => {
  it("weights must-haves double and applies recency", () => {
    const r = scoreSkills(dataEngineer, sponsorDataJob, cfg, ctx());
    // python (must, 2026 → 1.0) + postgresql (must, 2025 → 1.0) + airflow (nice, 1.0) = 5/5
    expect(r.score).toBeCloseTo(1);
    expect(r.gaps).toEqual([]);
  });

  it("reports missing must-haves as gaps", () => {
    const j = job({
      skills: [
        { uri: "skill:kubernetes", label: "Kubernetes", importance: "must" },
        { uri: "skill:python", importance: "nice" },
      ],
    });
    const r = scoreSkills(dataEngineer, j, cfg, ctx());
    expect(r.score).toBeCloseTo(1 / 3);
    expect(r.gaps).toEqual([
      { uri: "skill:kubernetes", label: "Kubernetes", importance: "must", status: "missing" },
    ]);
  });

  it("gives partial credit for related ESCO skills", () => {
    const j = job({ skills: [{ uri: "skill:java", label: "Java", importance: "must" }] });
    const r = scoreSkills(dataEngineer, j, cfg, ctx());
    expect(r.score).toBeCloseTo(cfg.skills.relatedCredit);
    expect(r.gaps[0]?.status).toBe("related");
  });

  it("discounts skills not used recently", () => {
    const j = job({ skills: [{ uri: "skill:spark", importance: "must" }] });
    expect(scoreSkills(dataEngineer, j, cfg, ctx()).score).toBeCloseTo(0.6); // last used 2019
  });

  it("uses the unknown-recency factor when the year is missing", () => {
    const j = job({ skills: [{ uri: "skill:python", importance: "must" }] });
    expect(scoreSkills(minimal, j, cfg, ctx()).score).toBeCloseTo(cfg.skills.unknownRecencyFactor);
  });

  it("returns null for jobs without skills (no penalty)", () => {
    expect(scoreSkills(dataEngineer, job({ skills: [] }), cfg, ctx()).score).toBeNull();
  });
});

describe("experience component (semantic, not years)", () => {
  it("maps cosine similarity through the calibration window", () => {
    expect(scoreExperience(cfg, { experienceSimilarity: 0.72 }).score).toBe(0);
    expect(scoreExperience(cfg, { experienceSimilarity: 0.9 }).score).toBe(1);
    expect(scoreExperience(cfg, { experienceSimilarity: 0.81 }).score).toBeCloseTo(0.5);
    expect(scoreExperience(cfg, { experienceSimilarity: 0.99 }).score).toBe(1);
  });

  it("is null without an embedding", () => {
    expect(scoreExperience(cfg, {}).score).toBeNull();
  });
});

describe("occupation component", () => {
  it("computes ISCO hierarchy distance", () => {
    expect(iscoSimilarity("2521", "2521")).toBe(1);
    expect(iscoSimilarity("2521", "2522")).toBe(0.75);
    expect(iscoSimilarity("2521", "2511")).toBe(0.5);
    expect(iscoSimilarity("2521", "2221")).toBe(0.25);
    expect(iscoSimilarity("2521", "7411")).toBe(0);
  });

  it("scores seniority distance", () => {
    expect(seniorityFit("senior", "senior")).toBe(1);
    expect(seniorityFit("senior", "lead")).toBe(0.8);
    expect(seniorityFit("junior", "senior")).toBe(0.5);
    expect(seniorityFit("intern", "executive")).toBe(0.2);
    expect(seniorityFit(null, "senior")).toBeNull();
  });

  it("combines family (75%) and seniority (25%)", () => {
    expect(scoreOccupation(dataEngineer, sponsorDataJob).score).toBe(1);
    expect(
      scoreOccupation(dataEngineer, job({ iscoCode: "2522", seniority: "junior" })).score,
    ).toBeCloseTo(0.75 * 0.75 + 0.25 * 0.5);
  });

  it("is null without any occupation info", () => {
    expect(scoreOccupation(minimal, job({ iscoCode: "2521" })).score).toBeNull();
  });
});

describe("interests component (RIASEC)", () => {
  it("derives a deterministic Holland code", () => {
    expect(hollandCode(riasec("ICR"))).toEqual(["I", "C", "R"]);
    expect(hollandCode({ R: 0.5, I: 0.5, A: 0.5, S: 0.5, E: 0.5, C: 0.5 })).toEqual([
      "R",
      "I",
      "A",
    ]);
  });

  it("computes the Iachan M index", () => {
    expect(iachanCongruence(["I", "C", "R"], ["I", "C", "R"])).toBe(1);
    expect(iachanCongruence(["I", "C", "R"], ["S", "E", "A"])).toBe(0);
    expect(iachanCongruence(["I", "C", "R"], ["I", "C", "E"])).toBeCloseTo(27 / 28);
    expect(iachanCongruence(["I", "C", "R"], ["C", "I", "R"])).toBeCloseTo(21 / 28);
  });

  it("is null when either profile is missing", () => {
    expect(scoreInterests(minimal, sponsorDataJob).score).toBeNull();
    expect(scoreInterests(dataEngineer, job({ riasec: null })).score).toBeNull();
  });
});

describe("values component", () => {
  it("weights by rank (6/21 … 1/21)", () => {
    const w = valueWeights([
      "achievement",
      "independence",
      "recognition",
      "relationships",
      "support",
      "working_conditions",
    ]);
    expect(w.achievement).toBeCloseTo(6 / 21);
    expect(w.working_conditions).toBeCloseTo(1 / 21);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("rewards jobs that score high on the user's top values", () => {
    const high = scoreValues(nurse, job({ workValues: values({ relationships: 1, support: 1 }) }));
    const low = scoreValues(nurse, job({ workValues: values({ relationships: 0, support: 0 }) }));
    expect(high.score!).toBeGreaterThan(low.score!);
    expect(high.topMatch).toBe("relationships");
  });
});

describe("practical component", () => {
  it("scores salary, travel, remote and hours", () => {
    const r = scorePractical(dataEngineer, sponsorDataJob, ctx({ travelMinutes: 20 }));
    expect(r.parts).toEqual({ salary: 1, travel: 1, remote: 1, hours: 1, company: null });
    expect(r.score).toBe(1);
  });

  it("gives partial salary credit when only the top of the range meets the minimum", () => {
    const r = scorePractical(
      dataEngineer,
      job({ salaryMinMonth: 5000, salaryMaxMonth: 6000 }),
      ctx(),
    );
    expect(r.parts.salary).toBeCloseTo(0.75);
  });

  it("is null when nothing practical is known", () => {
    expect(
      scorePractical(minimal, job({ remotePolicy: null, hoursMin: null, hoursMax: null }), ctx())
        .score,
    ).toBeNull();
  });
});

describe("geo", () => {
  it("computes plausible distances and travel times", () => {
    expect(haversineKm(AMSTERDAM, ROTTERDAM)).toBeGreaterThan(55);
    expect(haversineKm(AMSTERDAM, ROTTERDAM)).toBeLessThan(60);
    const pt = estimateTravelMinutes(AMSTERDAM, ROTTERDAM, "public_transport");
    expect(pt).toBeGreaterThan(60);
    expect(pt).toBeLessThan(90);
    expect(estimateTravelMinutes(AMSTERDAM, UTRECHT, "public_transport")).toBeLessThan(60);
    expect(estimateTravelMinutes(AMSTERDAM, UTRECHT, "bike")).toBeGreaterThan(120);
    expect(estimateTravelMinutes(AMSTERDAM, AMSTERDAM)).toBe(5);
  });
});
