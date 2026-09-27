import { describe, expect, it } from "vitest";
import { redactPii } from "../privacy/redact";

const CV = `Priya Raman
Senior Data Engineer
priya.raman@example.com | +31 6 12345678 | linkedin.com/in/priya-raman
Keizersgracht 123, 1015 CJ Amsterdam
Date of birth: 12-03-1990
Nationality: Indian
Gender: female
Marital status: married

Profile
Data engineer with 8 years of experience building pipelines.

Experience
Data Engineer at Canal Analytics 2019 - present
Built ETL pipelines in Python and Airflow.
`;

describe("redactPii", () => {
  const { text, counts } = redactPii(CV);

  it("removes the name line, contact details and address", () => {
    expect(text).not.toContain("Priya");
    expect(text).not.toContain("Raman");
    expect(text).not.toContain("@example.com");
    expect(text).not.toContain("12345678");
    expect(text).not.toContain("linkedin.com");
    expect(text).not.toContain("Keizersgracht");
    expect(text).not.toContain("1015 CJ");
    expect(counts.name).toBe(1);
  });

  it("removes protected characteristics lines entirely", () => {
    for (const s of ["1990", "Indian", "female", "married", "Nationality", "Gender"])
      expect(text).not.toContain(s);
  });

  it("keeps professional content, including year ranges", () => {
    expect(text).toContain("Senior Data Engineer");
    expect(text).toContain("Data Engineer at Canal Analytics 2019 - present");
    expect(text).toContain("Python and Airflow");
  });

  it("redacts known names anywhere", () => {
    const r = redactPii("Profile\nWorked with Jan de Vries on a project. Jan led it.", {
      knownNames: ["Jan de Vries"],
    });
    expect(r.text).not.toMatch(/Jan|Vries/);
  });

  it("handles Dutch labels", () => {
    const r = redactPii(
      "Profiel\nGeboortedatum: 1 januari 1985\nNationaliteit: Nederlandse\nGeslacht: man\nWerkervaring bij Bol 2018-2022",
    );
    expect(r.text).not.toMatch(/1985|Nederlandse|man\b/);
    expect(r.text).toContain("2018-2022");
  });
});
