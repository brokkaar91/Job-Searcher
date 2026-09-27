import { z } from "zod";
import type { ConnectorDefinition, SalaryUnit } from "./types";
import { employmentFromText, getJson, htmlToText, isoDate } from "./util";

/** Lever Postings API (public): https://github.com/lever/postings-api */
export interface LeverRaw {
  id: string;
  text: string;
  createdAt: number;
  hostedUrl: string;
  applyUrl?: string;
  country?: string;
  workplaceType?: "onsite" | "remote" | "hybrid" | "unspecified";
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
    department?: string;
    allLocations?: string[];
  };
  descriptionPlain?: string;
  description?: string;
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
}

const configSchema = z.object({
  site: z.string().min(1),
  region: z.enum(["global", "eu"]).default("eu"),
  companyName: z.string().optional(),
});

const INTERVAL: Record<string, SalaryUnit> = {
  "per-year-salary": "year",
  "per-month-salary": "month",
  "per-week-salary": "week",
  "per-day-wage": "day",
  "per-hour-wage": "hour",
};

const base = (region: "global" | "eu") =>
  region === "eu" ? "https://api.eu.lever.co" : "https://api.lever.co";

export const leverConnector: ConnectorDefinition<LeverRaw> = {
  type: "lever",
  displayName: "Lever Postings",
  configSchema,
  credentialsSchema: z.object({}).catchall(z.string()),

  async *fetch(since, ctx) {
    const cfg = configSchema.parse(ctx.config);
    const limit = 100;
    for (let skip = 0; ; skip += limit) {
      const page = await getJson<LeverRaw[]>(
        ctx,
        `${base(cfg.region)}/v0/postings/${encodeURIComponent(cfg.site)}?mode=json&skip=${skip}&limit=${limit}`,
      );
      for (const p of page) if (!since || p.createdAt >= since.getTime()) yield p;
      if (page.length < limit) break;
    }
  },

  externalId: (raw) => raw.id,

  map(raw, ctx) {
    const cfg = configSchema.parse(ctx.config);
    const lists = (raw.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join("\n\n");
    const description = [
      raw.descriptionPlain ?? htmlToText(raw.description),
      lists,
      raw.additionalPlain,
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();
    const s = raw.salaryRange;
    return {
      externalId: raw.id,
      title: raw.text.trim(),
      description,
      companyName: cfg.companyName ?? cfg.site,
      applyUrl: raw.applyUrl ?? raw.hostedUrl,
      sourceUrl: raw.hostedUrl,
      city: raw.categories?.location?.split(",")[0]?.trim() ?? null,
      country: raw.country ?? null,
      remotePolicy:
        raw.workplaceType && raw.workplaceType !== "unspecified" ? raw.workplaceType : null,
      employmentTypes: employmentFromText(raw.categories?.commitment),
      salary:
        s && (s.min || s.max)
          ? {
              min: s.min ?? null,
              max: s.max ?? null,
              currency: s.currency ?? null,
              unit: INTERVAL[s.interval ?? ""] ?? null,
            }
          : null,
      datePosted: isoDate(raw.createdAt)?.slice(0, 10) ?? null,
    };
  },

  async healthcheck(ctx) {
    try {
      const cfg = configSchema.parse(ctx.config);
      const page = await getJson<LeverRaw[]>(
        ctx,
        `${base(cfg.region)}/v0/postings/${encodeURIComponent(cfg.site)}?mode=json&limit=1`,
      );
      return {
        ok: true,
        message: `OK – site "${cfg.site}" reachable (${page.length ? "has" : "no"} postings)`,
      };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};
