import { z } from "zod";
import type { ConnectorDefinition } from "./types";
import { employmentFromText, getJson, htmlToText, isoDate, redact } from "./util";

/** Adzuna Jobs API (https://developer.adzuna.com) – NL endpoint. Salaries are annual. */
export interface AdzunaRaw {
  id: string;
  title: string;
  description: string;
  created: string;
  redirect_url: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  latitude?: number;
  longitude?: number;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string | number;
  contract_time?: string;
  contract_type?: string;
}

const configSchema = z.object({
  country: z.string().length(2).default("nl"),
  what: z.string().default(""),
  where: z.string().default(""),
  resultsPerPage: z.number().int().min(1).max(50).default(50),
  maxPages: z.number().int().min(1).max(100).default(10),
});

export const adzunaConnector: ConnectorDefinition<AdzunaRaw> = {
  type: "adzuna",
  displayName: "Adzuna API",
  configSchema,
  credentialsSchema: z.object({ appId: z.string().min(1), appKey: z.string().min(1) }),

  async *fetch(since, ctx) {
    const cfg = configSchema.parse(ctx.config);
    const maxDaysOld = since
      ? Math.max(1, Math.ceil((ctx.now.getTime() - since.getTime()) / 86_400_000))
      : 30;
    for (let page = 1; page <= cfg.maxPages; page++) {
      const params = new URLSearchParams({
        app_id: ctx.credentials.appId!,
        app_key: ctx.credentials.appKey!,
        results_per_page: String(cfg.resultsPerPage),
        max_days_old: String(maxDaysOld),
        sort_by: "date",
      });
      if (cfg.what) params.set("what", cfg.what);
      if (cfg.where) params.set("where", cfg.where);
      const url = `https://api.adzuna.com/v1/api/jobs/${cfg.country}/search/${page}?${params}`;
      ctx.log(`GET ${redact(url)}`);
      const data = await getJson<{ results: AdzunaRaw[]; count: number }>(ctx, url);
      yield* data.results;
      if (data.results.length < cfg.resultsPerPage || page * cfg.resultsPerPage >= data.count)
        break;
    }
  },

  externalId: (raw) => String(raw.id),

  map(raw) {
    const area = raw.location?.area ?? [];
    return {
      externalId: String(raw.id),
      title: htmlToText(raw.title),
      description: htmlToText(raw.description),
      companyName: raw.company?.display_name ?? null,
      applyUrl: raw.redirect_url,
      sourceUrl: raw.redirect_url,
      city:
        area.length >= 3
          ? area[area.length - 1]
          : (raw.location?.display_name?.split(",")[0] ?? null),
      region: area[1] ?? null,
      country: "NL",
      lat: raw.latitude ?? null,
      lng: raw.longitude ?? null,
      employmentTypes: employmentFromText(
        [raw.contract_time, raw.contract_type].filter(Boolean).join(" "),
      ),
      salary:
        raw.salary_min || raw.salary_max
          ? {
              min: raw.salary_min ?? null,
              max: raw.salary_max ?? null,
              unit: "year",
              currency: "EUR",
              isEstimate: String(raw.salary_is_predicted) === "1",
            }
          : null,
      datePosted: isoDate(raw.created)?.slice(0, 10) ?? null,
    };
  },

  async healthcheck(ctx) {
    try {
      const cfg = configSchema.parse(ctx.config);
      const params = new URLSearchParams({
        app_id: ctx.credentials.appId ?? "",
        app_key: ctx.credentials.appKey ?? "",
        results_per_page: "1",
      });
      const data = await getJson<{ count: number }>(
        ctx,
        `https://api.adzuna.com/v1/api/jobs/${cfg.country}/search/1?${params}`,
      );
      return {
        ok: true,
        message: `OK – ${data.count} jobs available`,
        details: { count: data.count },
      };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};
