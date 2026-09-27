import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_CONFIG, modelConfigSchema, parseModelConfig } from "../config";
import { computeInputHash, stableStringify } from "../hash";

describe("model config", () => {
  it("the default config is valid and weights sum to 100", () => {
    expect(() => parseModelConfig(DEFAULT_MODEL_CONFIG)).not.toThrow();
  });

  it("rejects weights that do not sum to 100", () => {
    const bad = {
      ...DEFAULT_MODEL_CONFIG,
      weights: { ...DEFAULT_MODEL_CONFIG.weights, skills: 50 },
    };
    expect(modelConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects inverted thresholds", () => {
    const bad = { ...DEFAULT_MODEL_CONFIG, thresholds: { strong: 50, good: 60, possible: 45 } };
    expect(modelConfigSchema.safeParse(bad).success).toBe(false);
  });
});

describe("input hash", () => {
  it("is independent of key order", () => {
    expect(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] })).toBe('{"a":[{"c":3,"d":2}],"b":1}');
    expect(computeInputHash({ x: 1, y: 2 })).toBe(computeInputHash({ y: 2, x: 1 }));
  });

  it("changes when the input changes", () => {
    expect(computeInputHash({ x: 1 })).not.toBe(computeInputHash({ x: 2 }));
  });
});
