import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptJson, encryptJson } from "./crypto";

const KEY = randomBytes(32).toString("base64");

describe("credential encryption", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encryptJson({ appKey: "secret" }, KEY);
    const b = encryptJson({ appKey: "secret" }, KEY);
    expect(a).not.toBe(b);
    expect(a).not.toContain("secret");
    expect(decryptJson(a, KEY)).toEqual({ appKey: "secret" });
  });

  it("rejects tampering and wrong keys", () => {
    const c = encryptJson({ x: 1 }, KEY);
    const parts = c.split(".");
    const tampered = [...parts.slice(0, 3), Buffer.from('{"x":2}').toString("base64")].join(".");
    expect(() => decryptJson(tampered, KEY)).toThrow();
    expect(() => decryptJson(c, randomBytes(32).toString("base64"))).toThrow();
    expect(() => encryptJson({}, "short")).toThrow(/32 bytes/);
  });
});
