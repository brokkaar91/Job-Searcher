import { describe, expect, it } from "vitest";
import { MockParserProvider } from "../providers/parser";
import { redactPii } from "../privacy/redact";
import { escoFixture as esco } from "./esco-fixture";

const parser = new MockParserProvider(() => new Date("2026-09-01"));

const CV = `Alex Morgan
Profile
Data engineer focused on reliable pipelines.

Experience
Senior Data Engineer at Canal Analytics 2021 - present
Built batch pipelines with Python, Airflow and PostgreSQL. Ran workloads on Kubernetes.
Software Engineer | Tulip Tech 2016 - 2021
Backend services in Python; Docker.

Education
MSc Computer Science, University of Somewhere

Languages
English - native
Dutch - basic (A2)
`;

describe("MockParserProvider.parseCv", () => {
  it("extracts experiences, skills with recency, languages and education", async () => {
    const r = await parser.parseCv(redactPii(CV).text, { esco });
    expect(r.experiences.map((e) => [e.title, e.organisation, e.isCurrent])).toEqual([
      ["Senior Data Engineer", "Canal Analytics", true],
      ["Software Engineer", "Tulip Tech", false],
    ]);
    expect(r.experiences[0]!.iscoCode).toBe("2521");
    const byUri = Object.fromEntries(r.skills.map((s) => [s.escoUri, s.lastUsedYear]));
    expect(byUri["esco:airflow"]).toBe(2026);
    expect(byUri["esco:kubernetes"]).toBe(2026);
    expect(byUri["esco:docker"]).toBe(2021);
    expect(r.languages).toEqual([
      { language: "en", level: "C2" },
      { language: "nl", level: "A2" },
    ]);
    expect(r.educationLevel).toBe(7);
    expect(r.seniority).toBe("senior");
  });
});

describe("MockParserProvider.classifyJob", () => {
  it("classifies an English data engineering ad", async () => {
    const r = await parser.classifyJob(
      {
        title: "Senior Data Engineer",
        description: `We are looking for a data engineer (32-40 hours, full-time, hybrid: 2 days in the office).
Requirements: Python, SQL and Airflow. Fluent English.
Nice to have: Kubernetes. Dutch is a plus.
We offer a learning budget. A master's degree is required.`,
      },
      { esco },
    );
    expect(r.iscoCode).toBe("2521");
    expect(r.seniority).toBe("senior");
    expect(r.skills).toEqual([
      { uri: "esco:python", label: "Python (computer programming)", importance: "must" },
      { uri: "esco:sql", label: "SQL", importance: "must" },
      { uri: "esco:airflow", label: "Apache Airflow", importance: "must" },
      { uri: "esco:kubernetes", label: "Kubernetes", importance: "nice" },
    ]);
    expect(r.languageRequirements).toEqual([
      { language: "en", level: "C1", required: true },
      { language: "nl", level: "B2", required: false },
    ]);
    expect(r.remotePolicy).toBe("hybrid");
    expect([r.hoursMin, r.hoursMax]).toEqual([32, 40]);
    expect(r.employmentTypes).toEqual(["full_time"]);
    expect(r.educationRequirement).toEqual({ minEqf: 7 });
    expect(r.workValues?.support).toBeGreaterThan(0.5);
  });

  it("treats 'HBO werk- en denkniveau' as NOT an explicit education requirement", async () => {
    const r = await parser.classifyJob(
      {
        title: "Projectmedewerker",
        description: "HBO werk- en denkniveau. Ervaring met projectmanagement.",
      },
      { esco },
    );
    expect(r.educationRequirement).toBeNull();
    expect(r.skills.map((s) => s.uri)).toEqual(["esco:project-mgmt"]);
  });
});
