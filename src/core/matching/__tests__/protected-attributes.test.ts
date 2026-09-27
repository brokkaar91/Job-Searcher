/**
 * COMPLIANCE TEST (EU AI Act / AVG): the engine must never use name, age, gender, photo or
 * nationality. Two guarantees are tested:
 *  1. the input schema has no such fields (allow-list), and
 *  2. adding arbitrary values for them never changes any output (property-based).
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { matchJob } from "../engine";
import { PROTECTED_ATTRIBUTES, matchCandidateSchema, sanitizeCandidate } from "../sanitize";
import { cfg, ctx, dataEngineer, dutchNurseJob, nurse, sponsorDataJob } from "../__fixtures__";
import type { MatchCandidate } from "../types";

function allKeys(schema: unknown, acc = new Set<string>()): Set<string> {
  const def = (
    schema as {
      def?: {
        type?: string;
        shape?: Record<string, unknown>;
        element?: unknown;
        innerType?: unknown;
      };
    }
  ).def;
  if (!def) return acc;
  if (def.shape) for (const [k, v] of Object.entries(def.shape)) (acc.add(k), allKeys(v, acc));
  if (def.element) allKeys(def.element, acc);
  if (def.innerType) allKeys(def.innerType, acc);
  return acc;
}

const protectedArb = fc.record({
  name: fc.string(),
  firstName: fc.string(),
  age: fc.integer({ min: 15, max: 80 }),
  birthDate: fc
    .date({ min: new Date("1940-01-01"), max: new Date("2010-01-01"), noInvalidDate: true })
    .map((d) => d.toISOString()),
  gender: fc.constantFrom("female", "male", "non-binary", "x"),
  photo: fc.webUrl(),
  nationality: fc.constantFrom("NL", "IN", "SY", "US", "PL", "NG", "BR"),
  ethnicity: fc.string(),
  address: fc.string(),
});

describe("protected attributes are never used", () => {
  it("the matching input schema contains no protected field anywhere (deep)", () => {
    const keys = allKeys(matchCandidateSchema);
    expect(keys.size).toBeGreaterThan(20); // sanity: introspection works
    for (const p of PROTECTED_ATTRIBUTES)
      expect(keys.has(p), `schema must not contain "${p}"`).toBe(false);
  });

  it("sanitizeCandidate strips protected fields at every level", () => {
    const dirty = {
      ...dataEngineer,
      name: "Priya",
      gender: "female",
      nationality: "IN",
      photo: "https://x/y.jpg",
      preferences: { ...dataEngineer.preferences, nationality: "IN", age: 31 },
      workStatus: { ...dataEngineer.workStatus, nationality: "IN" },
      skills: dataEngineer.skills.map((s) => ({ ...s, gender: "f" })),
    };
    const clean = sanitizeCandidate(dirty);
    const json = JSON.stringify(clean);
    for (const p of ["Priya", "female", "nationality", "https://x/y.jpg", "gender", '"age"'])
      expect(json).not.toContain(p);
    expect(clean).toEqual(sanitizeCandidate(dataEngineer));
  });

  it("adding any protected attribute values never changes any match output", () => {
    const base = [dataEngineer, nurse].flatMap((c) =>
      [sponsorDataJob, dutchNurseJob].map((j) => ({ c, j, expected: matchJob(c, j, cfg, ctx()) })),
    );
    fc.assert(
      fc.property(protectedArb, protectedArb, (topLevel, nested) => {
        for (const { c, j, expected } of base) {
          const withProtected = {
            ...c,
            ...topLevel,
            preferences: { ...c.preferences, ...nested },
          } as unknown as MatchCandidate;
          expect(matchJob(withProtected, j, cfg, ctx())).toEqual(expected);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("two candidates identical except protected attributes get identical results", () => {
    const a = {
      ...nurse,
      name: "Fatima",
      gender: "female",
      nationality: "MA",
      age: 52,
    } as unknown as MatchCandidate;
    const b = {
      ...nurse,
      name: "Jan",
      gender: "male",
      nationality: "NL",
      age: 24,
    } as unknown as MatchCandidate;
    expect(matchJob(a, dutchNurseJob, cfg, ctx())).toEqual(matchJob(b, dutchNurseJob, cfg, ctx()));
  });
});
