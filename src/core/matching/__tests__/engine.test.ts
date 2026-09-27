import { describe, expect, it } from "vitest";
import { labelFor, matchJob, rankJobs } from "../engine";
import { COMPONENTS } from "../types";
import {
  cfg,
  ctx,
  dataEngineer,
  dutchNurseJob,
  job,
  minimal,
  nurse,
  dataJob,
} from "../__fixtures__";

describe("matchJob – end to end", () => {
  it("gives the data engineer a strong match for a well-fitting job", () => {
    const r = matchJob(dataEngineer, dataJob, cfg, ctx({ travelMinutes: 25 }));
    expect(r.knockedOut).toBe(false);
    expect(r.label).toBe("strong");
    expect(r.totalScore).toBeGreaterThanOrEqual(85);
    expect(r.reasons).toHaveLength(3);
    expect(r.reasons[0]?.key).toBe("reason.skillsAllMust");
    expect(r.gaps).toEqual([]);
  });

  it("knocks out the Dutch nurse job for the data engineer but still scores and explains it", () => {
    const r = matchJob(dataEngineer, dutchNurseJob, cfg, ctx());
    expect(r.knockedOut).toBe(true);
    const failed = r.knockouts.filter((k) => k.status === "fail").map((k) => k.rule);
    expect(failed).toEqual(expect.arrayContaining(["language"]));
    expect(r.label).toBe("weak");
    expect(r.notes[0]).toEqual({ key: "note.knockedOut" });
    expect(r.languageGaps).toEqual([{ language: "nl", required: "C1", actual: null }]);
  });

  it("gives the nurse a strong match on the hospital job", () => {
    const r = matchJob(nurse, dutchNurseJob, cfg, ctx({ travelMinutes: 12 }));
    expect(r.knockedOut).toBe(false);
    expect(r.label).toBe("strong");
    expect(r.gaps).toEqual([
      { uri: "skill:wound-care", label: "wondverzorging", importance: "nice", status: "missing" },
    ]);
  });

  it("uses the default weights 35/20/15/10/10/10 when all data is present", () => {
    const r = matchJob(dataEngineer, dataJob, cfg, ctx({ travelMinutes: 25 }));
    expect(r.components.skills.weight).toBe(0.35);
    expect(r.components.experience.weight).toBe(0.2);
    expect(r.components.occupation.weight).toBe(0.15);
    expect(r.components.interests.weight).toBe(0.1);
    expect(r.components.values.weight).toBe(0.1);
    expect(r.components.practical.weight).toBe(0.1);
    const sum = COMPONENTS.reduce((s, k) => s + r.components[k].points, 0);
    expect(sum).toBeCloseTo(r.totalScore, 0);
  });

  it("redistributes weights over available components and flags limited data", () => {
    const j = job({
      skills: [{ uri: "skill:python", importance: "must" }],
      remotePolicy: null,
      hoursMin: null,
      hoursMax: null,
    });
    const r = matchJob(minimal, j, cfg, { now: new Date("2026-01-01") });
    expect(r.components.experience.score).toBeNull();
    expect(r.components.skills.weight).toBe(1);
    expect(r.limitedData).toBe(true);
    expect(r.notes).toContainEqual({ key: "note.limitedData" });
    // Missing data is not penalised: the only known component is a full skill match (recency unknown).
    expect(r.totalScore).toBeCloseTo(cfg.skills.unknownRecencyFactor * 100, 0);
  });

  it("returns score 0 (not NaN) when nothing at all is known", () => {
    const r = matchJob(
      minimal,
      job({ remotePolicy: null, hoursMin: null, hoursMax: null }),
      cfg,
      {},
    );
    expect(r.totalScore).toBe(0);
    expect(r.limitedData).toBe(true);
    expect(r.reasons).toEqual([{ key: "reason.fallback" }]);
  });

  it("is deterministic", () => {
    const a = matchJob(dataEngineer, dataJob, cfg, ctx());
    const b = matchJob(structuredClone(dataEngineer), structuredClone(dataJob), cfg, ctx());
    expect(a).toEqual(b);
  });

  it("keeps scores within 0..100 and components within 0..1", () => {
    for (const c of [dataEngineer, nurse, minimal]) {
      for (const j of [dataJob, dutchNurseJob]) {
        const r = matchJob(c, j, cfg, ctx());
        expect(r.totalScore).toBeGreaterThanOrEqual(0);
        expect(r.totalScore).toBeLessThanOrEqual(100);
        for (const k of COMPONENTS) {
          const s = r.components[k].score;
          if (s != null) expect(s).toBeGreaterThanOrEqual(0);
          if (s != null) expect(s).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("does not reward education: a higher degree never raises the score", () => {
    const low = matchJob({ ...dataEngineer, educationLevel: 4 }, dataJob, cfg, ctx());
    const high = matchJob({ ...dataEngineer, educationLevel: 8 }, dataJob, cfg, ctx());
    expect(high.totalScore).toBe(low.totalScore);
  });

  it("does not use years of experience (only semantic relevance)", () => {
    // Same similarity, different number of previous roles → same experience score.
    const many = { ...dataEngineer, experienceIscoCodes: ["2521", "2521", "2521", "2521"] };
    expect(matchJob(many, dataJob, cfg, ctx()).components.experience).toEqual(
      matchJob(dataEngineer, dataJob, cfg, ctx()).components.experience,
    );
  });
});

describe("labels", () => {
  it("maps thresholds to labels (boundaries inclusive)", () => {
    expect(labelFor(75, cfg)).toBe("strong");
    expect(labelFor(74.9, cfg)).toBe("good");
    expect(labelFor(60, cfg)).toBe("good");
    expect(labelFor(59.9, cfg)).toBe("possible");
    expect(labelFor(45, cfg)).toBe("possible");
    expect(labelFor(44.9, cfg)).toBe("weak");
  });
});

describe("rankJobs", () => {
  it("puts knocked-out jobs last and sorts by score", () => {
    const weaker = job({
      id: "job-weaker",
      skills: [
        { uri: "skill:python", importance: "must" },
        { uri: "skill:kubernetes", importance: "must" },
      ],
      iscoCode: "2522",
      salaryMaxMonth: 6200,
    });
    const ranked = rankJobs(dataEngineer, [dutchNurseJob, weaker, dataJob], cfg, () =>
      ctx({ travelMinutes: 25 }),
    );
    expect(ranked.map((r) => r.jobId)).toEqual(["job-data", "job-weaker", "job-nurse-utrecht"]);
  });
});
