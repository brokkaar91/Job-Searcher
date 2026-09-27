import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import type { ConnectorDefinition } from "./types";
import { employmentFromText, getText, htmlToText, isoDate } from "./util";

/** Personio XML job feed: https://{company}.jobs.personio.de/xml */
export interface PersonioRaw {
  id: string | number;
  name: string;
  office?: string;
  subcompany?: string;
  department?: string;
  employmentType?: string;
  schedule?: string;
  seniority?: string;
  createdAt?: string;
  jobDescriptions?: {
    jobDescription?: { name?: string; value?: string } | { name?: string; value?: string }[];
  };
}

const configSchema = z.object({
  company: z.string().min(1),
  domain: z.enum(["de", "com"]).default("de"),
  language: z.string().default("en"),
  companyName: z.string().optional(),
});

export const personioParser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: false,
  parseTagValue: false,
  trimValues: true,
});

export function parsePersonioXml(xml: string): PersonioRaw[] {
  const doc = personioParser.parse(xml) as {
    "workzag-jobs"?: { position?: PersonioRaw | PersonioRaw[] };
  };
  const positions = doc["workzag-jobs"]?.position;
  return positions ? (Array.isArray(positions) ? positions : [positions]) : [];
}

const feedUrl = (c: z.infer<typeof configSchema>) =>
  `https://${encodeURIComponent(c.company)}.jobs.personio.${c.domain}/xml?language=${encodeURIComponent(c.language)}`;

export const personioConnector: ConnectorDefinition<PersonioRaw> = {
  type: "personio",
  displayName: "Personio XML feed",
  configSchema,
  credentialsSchema: z.object({}).catchall(z.string()),

  async *fetch(since, ctx) {
    const cfg = configSchema.parse(ctx.config);
    const positions = parsePersonioXml(await getText(ctx, feedUrl(cfg)));
    ctx.log(`${positions.length} positions in feed`);
    for (const p of positions)
      if (!since || !p.createdAt || new Date(p.createdAt) >= since) yield p;
  },

  externalId: (raw) => String(raw.id),

  map(raw, ctx) {
    const cfg = configSchema.parse(ctx.config);
    const descs = raw.jobDescriptions?.jobDescription;
    const list = descs ? (Array.isArray(descs) ? descs : [descs]) : [];
    return {
      externalId: String(raw.id),
      title: String(raw.name).trim(),
      description: list.map((d) => `${d.name ?? ""}\n${htmlToText(d.value)}`.trim()).join("\n\n"),
      companyName: raw.subcompany || cfg.companyName || cfg.company,
      applyUrl: `https://${cfg.company}.jobs.personio.${cfg.domain}/job/${raw.id}`,
      sourceUrl: `https://${cfg.company}.jobs.personio.${cfg.domain}/job/${raw.id}`,
      city: raw.office ?? null,
      employmentTypes: employmentFromText(
        `${raw.schedule ?? ""} ${raw.employmentType === "intern" ? "internship" : (raw.employmentType ?? "")}`,
      ),
      datePosted: isoDate(raw.createdAt)?.slice(0, 10) ?? null,
      language: cfg.language.slice(0, 2),
    };
  },

  async healthcheck(ctx) {
    try {
      const cfg = configSchema.parse(ctx.config);
      const positions = parsePersonioXml(await getText(ctx, feedUrl(cfg)));
      return { ok: true, message: `OK – ${positions.length} positions` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};
