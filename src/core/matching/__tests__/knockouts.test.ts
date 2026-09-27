import { describe, expect, it } from "vitest";
import { evaluateKnockouts } from "../knockouts";
import {
  AMSTERDAM,
  GRONINGEN,
  cfg,
  ctx,
  dataEngineer,
  dutchNurseJob,
  job,
  minimal,
  nurse,
  dataJob,
} from "../__fixtures__";
import type { KnockoutRule } from "../types";

const status = (rule: KnockoutRule, ...args: Parameters<typeof evaluateKnockouts>) =>
  evaluateKnockouts(...args).find((k) => k.rule === rule)?.status;

describe("knock-out: language", () => {
  it("fails when a required language is missing", () => {
    expect(status("language", dataEngineer, dutchNurseJob, cfg, ctx())).toBe("fail");
  });

  it("fails when the level is too low and passes with tolerance", () => {
    const c = { ...dataEngineer, languages: [{ language: "en", level: "B2" as const }] };
    expect(status("language", c, dataJob, cfg, ctx())).toBe("fail");
    const tolerant = {
      ...cfg,
      knockouts: { ...cfg.knockouts, language: { enabled: true, toleranceLevels: 1 } },
    };
    expect(status("language", c, dataJob, tolerant, ctx())).toBe("pass");
  });

  it("ignores non-required (nice-to-have) languages", () => {
    const j = job({ languageRequirements: [{ language: "de", level: "B2", required: false }] });
    expect(status("language", dataEngineer, j, cfg, ctx())).toBe("pass");
  });
});

describe("knock-out: location / remote", () => {
  it("passes for remote jobs regardless of distance", () => {
    const j = job({ location: GRONINGEN, remotePolicy: "remote" });
    expect(status("location", dataEngineer, j, cfg, ctx())).toBe("pass");
  });

  it("fails when travel time exceeds the maximum", () => {
    const j = job({ location: GRONINGEN, remotePolicy: "onsite" });
    expect(status("location", dataEngineer, j, cfg, ctx())).toBe("fail");
    expect(
      status(
        "location",
        dataEngineer,
        job({ location: AMSTERDAM, remotePolicy: "onsite" }),
        cfg,
        ctx(),
      ),
    ).toBe("pass");
  });

  it("uses a provided travel time over the estimate", () => {
    const j = job({ location: GRONINGEN, remotePolicy: "onsite" });
    expect(status("location", dataEngineer, j, cfg, ctx({ travelMinutes: 20 }))).toBe("pass");
  });

  it("fails onsite and hybrid jobs for remote-only candidates", () => {
    const c = {
      ...dataEngineer,
      preferences: { ...dataEngineer.preferences, remote: "remote" as const },
    };
    expect(status("location", c, job({ remotePolicy: "onsite" }), cfg, ctx())).toBe("fail");
    expect(status("location", c, job({ remotePolicy: "hybrid" }), cfg, ctx())).toBe("fail");
  });

  it("is unknown when the job location is missing", () => {
    expect(
      status("location", dataEngineer, job({ location: null, remotePolicy: "onsite" }), cfg, ctx()),
    ).toBe("unknown");
  });

  it("allows a longer commute for hybrid jobs", () => {
    const c = {
      ...dataEngineer,
      preferences: { ...dataEngineer.preferences, maxTravelMinutes: 40 },
    };
    // 55 min: > 40 + 10 grace, but ≤ 40 × 1.25 + 10 for hybrid
    expect(
      status(
        "location",
        c,
        job({ remotePolicy: "onsite", location: AMSTERDAM }),
        cfg,
        ctx({ travelMinutes: 55 }),
      ),
    ).toBe("fail");
    expect(
      status(
        "location",
        c,
        job({ remotePolicy: "hybrid", location: AMSTERDAM }),
        cfg,
        ctx({ travelMinutes: 55 }),
      ),
    ).toBe("pass");
  });
});

describe("knock-out: salary", () => {
  it("fails below the user's minimum (with tolerance)", () => {
    expect(status("salary", dataEngineer, job({ salaryMaxMonth: 5000 }), cfg, ctx())).toBe("fail");
    // 5% tolerance: 5500 × 0.95 = 5225
    expect(status("salary", dataEngineer, job({ salaryMaxMonth: 5300 }), cfg, ctx())).toBe("pass");
  });

  it("is unknown when the job has no salary", () => {
    expect(status("salary", dataEngineer, job({}), cfg, ctx())).toBe("unknown");
  });
});

describe("knock-out: contract & hours", () => {
  it("fails when contract types do not overlap", () => {
    expect(
      status("contract", dataEngineer, job({ employmentTypes: ["freelance"] }), cfg, ctx()),
    ).toBe("fail");
  });

  it("fails when the job requires more hours than the user's maximum", () => {
    expect(
      status(
        "contract",
        nurse,
        job({ employmentTypes: ["part_time"], hoursMin: 36, hoursMax: 40 }),
        cfg,
        ctx(),
      ),
    ).toBe("fail");
  });

  it("is unknown when the job gives no contract info", () => {
    expect(
      status(
        "contract",
        nurse,
        job({ employmentTypes: [], hoursMin: null, hoursMax: null }),
        cfg,
        ctx(),
      ),
    ).toBe("unknown");
  });
});

describe("knock-out: education", () => {
  it("only applies when the job explicitly requires a level", () => {
    const c = { ...dataEngineer, educationLevel: 4 };
    expect(status("education", c, job({}), cfg, ctx())).toBe("pass");
    expect(status("education", c, job({ educationRequirement: { minEqf: 6 } }), cfg, ctx())).toBe(
      "fail",
    );
    expect(
      status("education", minimal, job({ educationRequirement: { minEqf: 6 } }), cfg, ctx()),
    ).toBe("unknown");
  });
});

describe("knock-outs with missing data", () => {
  it("never fails a minimal profile on anything", () => {
    const res = evaluateKnockouts(minimal, dataJob, cfg, ctx());
    expect(res.filter((r) => r.status === "fail")).toEqual([]);
    expect(res.find((r) => r.rule === "language")?.status).toBe("unknown");
  });

  it("can be disabled per rule", () => {
    const off = Object.fromEntries(
      Object.entries(cfg.knockouts).map(([k, v]) => [k, { ...v, enabled: false }]),
    );
    expect(
      evaluateKnockouts(
        dataEngineer,
        dutchNurseJob,
        { ...cfg, knockouts: off as typeof cfg.knockouts },
        ctx(),
      ),
    ).toEqual([]);
  });
});
