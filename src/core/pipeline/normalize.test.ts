import { describe, expect, it } from "vitest";
import {
  dedupKey,
  normalizeApplyUrl,
  normalizeCompanyName,
  normalizeDomain,
  normalizeTitle,
} from "./normalize";

describe("normalisation", () => {
  it("normalises job titles", () => {
    expect(normalizeTitle("Sr. Data Engineer (m/v/x) – 32-40 uur!")).toBe("senior data engineer");
    expect(normalizeTitle("Vacature: Verpleegkundige")).toBe("verpleegkundige");
  });

  it("normalises company names and domains", () => {
    expect(normalizeCompanyName("Canal Analytics B.V.")).toBe("canal analytics");
    expect(normalizeDomain("https://www.CanalAnalytics.example/careers")).toBe(
      "canalanalytics.example",
    );
    expect(normalizeDomain("jobs.canalanalytics.example")).toBe("canalanalytics.example");
    expect(normalizeDomain(null)).toBeNull();
  });

  it("canonicalises apply URLs (tracking params, fragments, trailing slashes)", () => {
    expect(normalizeApplyUrl("https://WWW.Example.com/jobs/123/?utm_source=x&b=2&a=1#apply")).toBe(
      "https://example.com/jobs/123?a=1&b=2",
    );
    expect(normalizeApplyUrl("not a url")).toBeNull();
  });

  it("builds equal dedup keys for trivially different postings", () => {
    expect(dedupKey("Senior Data Engineer (m/v/x)", "Canal Analytics B.V.", "Amsterdam")).toBe(
      dedupKey("Sr Data Engineer", "Canal Analytics", "amsterdam"),
    );
  });
});
