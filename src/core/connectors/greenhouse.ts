import { z } from "zod";
import type { ConnectorDefinition } from "./types";
import { employmentFromText, getJson, htmlToText, isoDate, remoteFromText } from "./util";

/** Greenhouse Job Board API (public): https://developers.greenhouse.io/job-board.html */
export interface GreenhouseRaw {
  id: number;
  title: string;
  updated_at: string;
  first_published?: string;
  absolute_url: string;
  location?: { name?: string };
  content?: string;
  company_name?: string;
  metadata?: { name: string; value: unknown }[] | null;
  offices?: { name: string; location?: string | null }[];
}

const configSchema = z.object({
  boardToken: z.string().min(1),
  companyName: z.string().optional(),
});

export const greenhouseConnector: ConnectorDefinition<GreenhouseRaw> = {
  type: "greenhouse",
  displayName: "Greenhouse Job Board",
  configSchema,
  credentialsSchema: z.object({}).catchall(z.string()),

  async *fetch(since, ctx) {
    const { boardToken } = configSchema.parse(ctx.config);
    const data = await getJson<{ jobs: GreenhouseRaw[] }>(
      ctx,
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`,
    );
    ctx.log(`${data.jobs.length} jobs on board ${boardToken}`);
    // The board API has no server-side "since" filter; we filter on updated_at client-side.
    for (const job of data.jobs) if (!since || new Date(job.updated_at) >= since) yield job;
  },

  externalId: (raw) => String(raw.id),

  map(raw, ctx) {
    const { companyName } = configSchema.parse(ctx.config);
    const meta = Object.fromEntries(
      (raw.metadata ?? []).map((m) => [m.name.toLowerCase(), m.value]),
    );
    const locationName = raw.location?.name ?? raw.offices?.[0]?.name ?? null;
    const description = htmlToText(raw.content);
    return {
      externalId: String(raw.id),
      title: raw.title.trim(),
      description,
      companyName: raw.company_name ?? companyName ?? null,
      applyUrl: raw.absolute_url,
      sourceUrl: raw.absolute_url,
      city: locationName?.split(/[,/–-]/)[0]?.trim() || null,
      remotePolicy: remoteFromText(
        `${locationName ?? ""} ${String(meta["workplace type"] ?? meta["remote"] ?? "")}`,
      ),
      employmentTypes: employmentFromText(
        String(meta["employment type"] ?? meta["employment_type"] ?? ""),
      ),
      datePosted: isoDate(raw.first_published ?? raw.updated_at)?.slice(0, 10) ?? null,
    };
  },

  async healthcheck(ctx) {
    try {
      const { boardToken } = configSchema.parse(ctx.config);
      const data = await getJson<{ name: string }>(
        ctx,
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}`,
      );
      return { ok: true, message: `OK – board "${data.name}"` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};
