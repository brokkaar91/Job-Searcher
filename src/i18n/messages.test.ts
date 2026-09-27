import { describe, expect, it } from "vitest";
import nl from "../../messages/nl.json";
import en from "../../messages/en.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("i18n messages", () => {
  it("nl and en define exactly the same keys", () => {
    const nlKeys = keys(nl).sort();
    const enKeys = keys(en).sort();
    expect(enKeys.filter((k) => !nlKeys.includes(k))).toEqual([]);
    expect(nlKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });
});
