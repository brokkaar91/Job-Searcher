/** Admin form descriptors per connector type (config is non-secret; credentials are encrypted). */
export interface FieldDescriptor {
  key: string;
  type: "text" | "number" | "select" | "url";
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export const CONNECTOR_FORMS: Record<
  string,
  { config: FieldDescriptor[]; credentials: FieldDescriptor[] }
> = {
  adzuna: {
    config: [
      { key: "country", type: "text", placeholder: "nl" },
      { key: "what", type: "text", placeholder: "data engineer" },
      { key: "where", type: "text", placeholder: "Amsterdam" },
      { key: "maxPages", type: "number", placeholder: "10" },
    ],
    credentials: [
      { key: "appId", type: "text", required: true },
      { key: "appKey", type: "text", required: true },
    ],
  },
  greenhouse: {
    config: [
      { key: "boardToken", type: "text", required: true },
      { key: "companyName", type: "text" },
    ],
    credentials: [],
  },
  lever: {
    config: [
      { key: "site", type: "text", required: true },
      { key: "region", type: "select", options: ["eu", "global"] },
      { key: "companyName", type: "text" },
    ],
    credentials: [],
  },
  recruitee: { config: [{ key: "company", type: "text", required: true }], credentials: [] },
  personio: {
    config: [
      { key: "company", type: "text", required: true },
      { key: "domain", type: "select", options: ["de", "com"] },
      { key: "language", type: "text", placeholder: "en" },
      { key: "companyName", type: "text" },
    ],
    credentials: [],
  },
  generic_feed: {
    config: [
      { key: "url", type: "url", required: true, placeholder: "https://example.com/jobs.json" },
      { key: "apiKeyHeader", type: "text", placeholder: "X-Api-Key" },
    ],
    credentials: [{ key: "apiKey", type: "text" }],
  },
};

/** Coerce form strings to the types the connector schemas expect. */
export function coerceConfig(type: string, raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of CONNECTOR_FORMS[type]?.config ?? []) {
    const v = raw[f.key]?.trim();
    if (!v) continue;
    out[f.key] = f.type === "number" ? Number(v) : v;
  }
  return out;
}
