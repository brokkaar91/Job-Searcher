import { describe, expect, it } from "vitest";
import { normalizeSalary, parseSalaryText, toMonthly } from "./salary";
import { detectLanguage } from "./language";

describe("salary normalisation (gross EUR/month excl. holiday allowance)", () => {
  it("converts units", () => {
    expect(Math.round(toMonthly(64800, "year"))).toBe(5000); // 64,800 / 12.96
    expect(Math.round(toMonthly(20, "hour", 40))).toBe(3467);
    expect(Math.round(toMonthly(20, "hour", 32))).toBe(2773);
    expect(toMonthly(4000, "month")).toBe(4000);
  });

  it("normalises raw salaries and guesses missing units", () => {
    expect(normalizeSalary({ min: 70000, max: 90000, unit: "year", currency: "EUR" })).toEqual({
      minMonth: 5401,
      maxMonth: 6944,
      estimated: false,
    });
    expect(normalizeSalary({ min: 4000, max: 3000 })).toEqual({
      minMonth: 3000,
      maxMonth: 4000,
      estimated: false,
    });
    expect(normalizeSalary({ min: 50000, max: 60000, currency: "USD", unit: "year" })).toEqual({
      minMonth: null,
      maxMonth: null,
      estimated: false,
    });
  });

  it("rejects implausible values", () => {
    expect(normalizeSalary({ min: 1, max: 2, unit: "month" }).minMonth).toBeNull();
  });

  it("parses Dutch and English salary text", () => {
    expect(parseSalaryText("€ 3.500 - € 4.500 bruto per maand")).toEqual({
      min: 3500,
      max: 4500,
      unit: "month",
    });
    expect(parseSalaryText("€45k–€55k per year")).toEqual({ min: 45000, max: 55000, unit: "year" });
    expect(parseSalaryText("€ 22,50 per uur")).toEqual({ min: 22.5, max: 22.5, unit: "hour" });
    expect(parseSalaryText("Marktconform salaris")).toEqual({ min: null, max: null, unit: null });
    expect(normalizeSalary({ text: "€ 45.000 – € 55.000 per jaar" })).toEqual({
      minMonth: 3472,
      maxMonth: 4244,
      estimated: false,
    });
  });
});

describe("language detection", () => {
  it("detects Dutch and English ads", () => {
    expect(
      detectLanguage(
        "Wij zoeken een enthousiaste verpleegkundige voor onze afdeling. Je werkt in een fijn team en krijgt goede arbeidsvoorwaarden.",
      ),
    ).toBe("nl");
    expect(
      detectLanguage(
        "We are looking for a data engineer who enjoys building reliable pipelines and working with a friendly international team.",
      ),
    ).toBe("en");
    expect(detectLanguage("Kort")).toBeNull();
  });
});
