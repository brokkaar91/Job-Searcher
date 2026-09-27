import { describe, expect, it } from "vitest";
import { normalizeLabel } from "../esco";
import { escoFixture as esco } from "./esco-fixture";

describe("EscoIndex", () => {
  it("normalises labels (case, accents, punctuation)", () => {
    expect(normalizeLabel("  Patiëntenzorg–Verlenen! ")).toBe("patientenzorg verlenen");
  });

  it("finds skills in free text via preferred and alt labels", () => {
    const found = esco
      .findSkillsInText("Built pipelines in Python and Airflow on Postgres, deployed with Docker.")
      .map((m) => m.ref.uri);
    expect(found).toEqual(["esco:python", "esco:airflow", "esco:postgresql", "esco:docker"]);
  });

  it("matches very short labels only as exact case-sensitive tokens", () => {
    expect(esco.findSkillsInText("Statistics in R and SQL").map((m) => m.ref.uri)).toContain(
      "esco:r",
    );
    expect(esco.findSkillsInText("I am a reliable worker").map((m) => m.ref.uri)).not.toContain(
      "esco:r",
    );
  });

  it("looks up skills and occupations by exact label", () => {
    expect(esco.lookupSkill("postgres")?.uri).toBe("esco:postgresql");
    expect(esco.findOccupationInText("Senior Backend Developer (m/v/x)")?.iscoCode).toBe("2512");
    expect(esco.findOccupationInText("Verpleegkundige interne geneeskunde")?.iscoCode).toBe("2221");
  });

  it("searches skills for autocomplete", () => {
    expect(esco.searchSkills("post")[0]?.uri).toBe("esco:postgresql");
    expect(esco.searchSkills("")).toEqual([]);
  });

  it("exposes the broader hierarchy for the engine", () => {
    expect(esco.broaderMap().get("esco:python")).toEqual(["esco:programming"]);
  });
});
