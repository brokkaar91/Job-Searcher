import { z } from "zod";
import type { ConnectorDefinition } from "./types";
import { extractItems, fieldMappingSchema, mapRecord, parseFeed } from "./mapping";
import { getText } from "./util";

/**
 * Generic JSON/XML feed with a configurable field mapping (stored in `field_mappings`, the
 * active version is injected into config.mapping by the pipeline).
 */
const configSchema = z.object({
  url: z.url(),
  mapping: fieldMappingSchema,
  /** Optional header name for an API key (value from credentials.apiKey). */
  apiKeyHeader: z.string().optional(),
});

export const genericFeedConnector: ConnectorDefinition<unknown> = {
  type: "generic_feed",
  displayName: "Generic JSON/XML feed",
  configSchema,
  credentialsSchema: z.object({ apiKey: z.string().optional() }).catchall(z.string()),

  async *fetch(_since, ctx) {
    const cfg = configSchema.parse(ctx.config);
    const headers: Record<string, string> = {};
    if (cfg.apiKeyHeader && ctx.credentials.apiKey)
      headers[cfg.apiKeyHeader] = ctx.credentials.apiKey;
    const res = await ctx.fetch(cfg.url, { headers });
    if (!res.ok) throw new Error(`GET feed → HTTP ${res.status}`);
    const items = extractItems(
      parseFeed(await res.text(), cfg.mapping.format),
      cfg.mapping.itemsPath,
    );
    ctx.log(`${items.length} items in feed`);
    // Feeds have no reliable "changed since"; the pipeline's content hash detects changes.
    yield* items;
  },

  externalId(raw) {
    // Resolved via the mapping in map(); fallback for logging only.
    const r = raw as Record<string, unknown>;
    return String(r.id ?? r.guid ?? r.reference ?? JSON.stringify(raw).slice(0, 40));
  },

  map(raw, ctx) {
    const { mapping } = configSchema.parse(ctx.config);
    const r = mapRecord(raw, mapping);
    if (!r.job) throw new Error(`mapping failed: ${r.errors.join("; ")}`);
    return r.job;
  },

  async healthcheck(ctx) {
    try {
      const cfg = configSchema.parse(ctx.config);
      const items = extractItems(
        parseFeed(await getText(ctx, cfg.url), cfg.mapping.format),
        cfg.mapping.itemsPath,
      );
      const sample = items[0] ? mapRecord(items[0], cfg.mapping) : null;
      if (sample && !sample.job)
        return {
          ok: false,
          message: `Feed reachable (${items.length} items) but mapping fails: ${sample.errors.join("; ")}`,
        };
      return { ok: true, message: `OK – ${items.length} items, mapping valid` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};
