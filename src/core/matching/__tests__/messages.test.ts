import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nl from "../../../../messages/nl.json";
import en from "../../../../messages/en.json";

/** Every explanation key the engine can emit must be translated (NL + EN). */
function emittedKeys(): string[] {
  const dir = path.resolve(import.meta.dirname, "..");
  const keys = new Set<string>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(path.join(dir, f), "utf8");
    for (const m of src.matchAll(/key: [`"]((?:knockout|component|reason|note)\.[\w.${}]+)[`"]/g)) {
      const k = m[1]!;
      if (k.includes("${")) {
        // template literal, e.g. component.experience.${band}: expand known bands
        const prefix = k.slice(0, k.indexOf("${"));
        keys.add(`${prefix}*`);
      } else keys.add(k);
    }
  }
  return [...keys];
}

function has(obj: unknown, dotted: string): boolean {
  if (dotted.endsWith("*")) {
    const parent = dotted
      .slice(0, -2)
      .split(".")
      .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
    return typeof parent === "object" && parent !== null && Object.keys(parent).length > 0;
  }
  return (
    typeof dotted.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj) ===
    "string"
  );
}

describe("matching explanations are translated", () => {
  const keys = emittedKeys();
  it("finds emitted keys", () => expect(keys.length).toBeGreaterThan(40));
  it.each(keys)("%s exists in nl and en", (k) => {
    expect(has(nl.matching, k), `nl: ${k}`).toBe(true);
    expect(has(en.matching, k), `en: ${k}`).toBe(true);
  });
});
