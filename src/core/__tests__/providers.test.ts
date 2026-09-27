import { describe, expect, it } from "vitest";
import {
  FakeEmbeddingProvider,
  cosine,
  EMBEDDING_DIMENSIONS,
  createEmbeddingProvider,
} from "../providers/embedding";
import { createParserProvider, MockParserProvider } from "../providers/parser";
import { MINI_IP_ITEMS, isComplete, scoreInterests } from "../assessments/mini-ip";
import { isValidRanking, moveValue } from "../assessments/work-values";
import { hollandCode } from "../matching/riasec";
import { RIASEC_KEYS, WORK_VALUES } from "../matching/types";

describe("FakeEmbeddingProvider", () => {
  const p = new FakeEmbeddingProvider();
  it("returns deterministic unit vectors of the right dimension", async () => {
    const [a, b] = await p.embed(
      ["data pipelines in python", "data pipelines in python"],
      "passage",
    );
    expect(a).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(a).toEqual(b);
    expect(cosine(a!, a!)).toBeCloseTo(1);
  });

  it("gives related texts a higher similarity, in an e5-like range", async () => {
    const [q, near, far] = await p.embed(
      [
        "senior data engineer building python pipelines",
        "data engineer python pipelines airflow",
        "verpleegkundige in het ziekenhuis",
      ],
      "query",
    );
    expect(cosine(q!, near!)).toBeGreaterThan(cosine(q!, far!));
    expect(cosine(q!, far!)).toBeGreaterThan(0.6);
  });
});

describe("provider factories", () => {
  it("defaults to offline providers", () => {
    expect(createParserProvider({})).toBeInstanceOf(MockParserProvider);
    expect(createEmbeddingProvider({}).name).toBe("fake");
    expect(() => createEmbeddingProvider({ EMBEDDING_PROVIDER: "openai" })).toThrow(
      /OPENAI_API_KEY/,
    );
  });
});

describe("interest profiler (RIASEC)", () => {
  it("has 30 items, 5 per type, unique ids, bilingual", () => {
    expect(MINI_IP_ITEMS).toHaveLength(30);
    for (const k of RIASEC_KEYS) expect(MINI_IP_ITEMS.filter((i) => i.type === k)).toHaveLength(5);
    expect(new Set(MINI_IP_ITEMS.map((i) => i.id)).size).toBe(30);
    expect(MINI_IP_ITEMS.every((i) => i.nl && i.en)).toBe(true);
  });

  it("scores 0..1 per type and derives the Holland code", () => {
    const answers = Object.fromEntries(
      MINI_IP_ITEMS.map((i) => [
        i.id,
        i.type === "I" ? 5 : i.type === "C" ? 4 : i.type === "R" ? 3 : 1,
      ]),
    ) as Record<string, 1 | 2 | 3 | 4 | 5>;
    const p = scoreInterests(answers);
    expect(p.I).toBe(1);
    expect(p.A).toBe(0);
    expect(p.C).toBe(0.75);
    expect(hollandCode(p)).toEqual(["I", "C", "R"]);
    expect(isComplete(answers)).toBe(true);
    expect(isComplete({})).toBe(false);
    expect(scoreInterests({}).R).toBe(0.5); // unanswered → neutral
  });
});

describe("work values ranking", () => {
  it("validates a full, unique ranking", () => {
    expect(isValidRanking([...WORK_VALUES])).toBe(true);
    expect(isValidRanking(WORK_VALUES.slice(0, 5))).toBe(false);
    expect(isValidRanking([...WORK_VALUES.slice(0, 5), "achievement"])).toBe(false);
  });

  it("moves values", () => {
    expect(moveValue([...WORK_VALUES], 5, 0)[0]).toBe("working_conditions");
  });
});
