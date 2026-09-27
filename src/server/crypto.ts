import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for connector credentials. Format: v1.<iv b64>.<tag b64>.<ciphertext b64>.
 * The key (CONNECTOR_ENCRYPTION_KEY, 32 bytes base64) never leaves the server; ciphertext lives in
 * `connector_secrets`, which has RLS enabled and no policies (service role only).
 */
function key(raw = process.env.CONNECTOR_ENCRYPTION_KEY): Buffer {
  if (!raw) throw new Error("CONNECTOR_ENCRYPTION_KEY is not set");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("CONNECTOR_ENCRYPTION_KEY must be 32 bytes (base64)");
  return k;
}

export function encryptJson(value: unknown, rawKey?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(rawKey), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ct.toString("base64"),
  ].join(".");
}

export function decryptJson<T = Record<string, string>>(payload: string, rawKey?: string): T {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("invalid ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(rawKey), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(
    Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8"),
  ) as T;
}

/** For display: show only that a secret is set, never its value. */
export function maskSecrets(keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, "••••••••"]));
}
