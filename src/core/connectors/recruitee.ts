import { z } from "zod";
import type { ConnectorDefinition, SalaryUnit } from "./types";
import { employmentFromText, getJson, htmlToText, isoDate } from "./util";

/** Recruitee Careers Site API (public): https://docs.recruitee.com/reference/offers */
export interface RecruiteeRaw {
  id: number;
  slug: string;
  title: string;
  description?: string;
  requirements?: string;
  city?: string;
  country_code?: string;
  postal_code?: string;
  careers_url: string;
  careers_apply_url?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  employment_type_code?: string;
  remote?: boolean;
  hybrid?: boolean;
  on_site?: boolean;
  min_hours?: number | null;
  max_hours?: number | null;
  salary?: {
    min?: string | number | null;
    max?: string | number | null;
    period?: string | null;
    currency?: string | null;
  } | null;
  company_name?: string;
  status?: string;
}

const configSchema = z.object({ company: z.string().min(1) });
const PERIOD: Record<string, SalaryUnit> = {
  hour: "hour",
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

export const recruiteeConnector: ConnectorDefinition<RecruiteeRaw> = {
  type: "recruitee",
  displayName: "Recruitee Careers",
  configSchema,
  credentialsSchema: z.object({}).catchall(z.string()),

  async *fetch(since, ctx) {
    const { company } = configSchema.parse(ctx.config);
    const data = await getJson<{ offers: RecruiteeRaw[] }>(
      ctx,
      `https://${encodeURIComponent(company)}.recruitee.com/api/offers/`,
    );
    for (const o of data.offers) {
      const changed = o.updated_at ?? o.published_at ?? o.created_at;
      if (o.status && o.status !== "published") continue;
      if (!since || !changed || new Date(changed) >= since) yield o;
    }
  },

  externalId: (raw) => String(raw.id),

  map(raw) {
    const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
    const s = raw.salary;
    return {
      externalId: String(raw.id),
      title: raw.title.trim(),
      description: [htmlToText(raw.description), htmlToText(raw.requirements)]
        .filter(Boolean)
        .join("\n\n"),
      companyName: raw.company_name ?? null,
      applyUrl: raw.careers_apply_url ?? raw.careers_url,
      sourceUrl: raw.careers_url,
      city: raw.city ?? null,
      postalCode: raw.postal_code ?? null,
      country: raw.country_code?.toUpperCase() ?? null,
      remotePolicy: raw.hybrid ? "hybrid" : raw.remote ? "remote" : raw.on_site ? "onsite" : null,
      employmentTypes: employmentFromText(raw.employment_type_code?.replace(/_/g, " ")),
      hoursMin: raw.min_hours ?? null,
      hoursMax: raw.max_hours ?? null,
      salary:
        s && (s.min || s.max)
          ? {
              min: num(s.min),
              max: num(s.max),
              currency: s.currency ?? null,
              unit: PERIOD[s.period ?? ""] ?? null,
            }
          : null,
      datePosted: isoDate(raw.published_at ?? raw.created_at)?.slice(0, 10) ?? null,
    };
  },

  async healthcheck(ctx) {
    try {
      const { company } = configSchema.parse(ctx.config);
      const data = await getJson<{ offers: unknown[] }>(
        ctx,
        `https://${encodeURIComponent(company)}.recruitee.com/api/offers/`,
      );
      return { ok: true, message: `OK – ${data.offers.length} offers` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};
