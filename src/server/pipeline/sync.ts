import { createHash } from "node:crypto";
import { createConnector, type CanonicalJob } from "@/core/connectors";
import { stableStringify } from "@/core/matching/hash";
import { createEmbeddingProvider, type EmbeddingProvider } from "@/core/providers/embedding";
import { createParserProvider, type ParserProvider } from "@/core/providers/parser";
import type { AdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";
import { decryptJson } from "../crypto";
import { loadEscoIndex } from "../esco";
import { writeAudit } from "../audit";
import { recomputeMatchesForJobs } from "../matching/service";
import { ingestJob } from "./ingest";

/** Connectors that return the full current set of jobs on every run (absence ⇒ vacancy closed). */
const SNAPSHOT_TYPES = new Set(["greenhouse", "lever", "recruitee", "personio", "generic_feed"]);
const MAX_ERRORS_LOGGED = 50;

export interface SyncOptions {
  trigger?: "schedule" | "manual";
  triggeredBy?: string | null;
  fetchImpl?: typeof fetch;
  parser?: ParserProvider;
  embedder?: EmbeddingProvider;
  now?: Date;
  /** Skip the (potentially slow) match recomputation, e.g. in tests. */
  skipMatching?: boolean;
}

export interface SyncCounts {
  fetched: number;
  new: number;
  updated: number;
  unchanged: number;
  duplicate: number;
  failed: number;
  expired: number;
}

/** Load a connector with decrypted credentials and (for generic feeds) its active field mapping. */
export async function loadConnector(admin: AdminClient, connectorId: string) {
  const { data: connector, error } = await admin
    .from("connectors")
    .select("*")
    .eq("id", connectorId)
    .single();
  if (error || !connector) throw new Error(`connector ${connectorId} not found`);
  const { data: secret } = await admin
    .from("connector_secrets")
    .select("ciphertext")
    .eq("connector_id", connectorId)
    .maybeSingle();
  const credentials = secret ? decryptJson<Record<string, string>>(secret.ciphertext) : {};
  let config = (connector.config ?? {}) as Record<string, unknown>;
  if (connector.type === "generic_feed") {
    const { data: mapping } = await admin
      .from("field_mappings")
      .select("mapping")
      .eq("connector_id", connectorId)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    config = { ...config, mapping: mapping?.mapping ?? config.mapping };
  }
  return { connector, credentials, config };
}

/** Full pipeline run for one connector: raw storage → mapping → enrichment → dedup → embedding → matching. */
export async function runConnectorSync(
  admin: AdminClient,
  connectorId: string,
  opts: SyncOptions = {},
) {
  const now = opts.now ?? new Date();
  const { connector, credentials, config } = await loadConnector(admin, connectorId);
  const { data: run } = await admin
    .from("connector_runs")
    .insert({
      connector_id: connectorId,
      status: "running",
      trigger: opts.trigger ?? "schedule",
      triggered_by: opts.triggeredBy ?? null,
      started_at: now.toISOString(),
    })
    .select("id")
    .single();
  const runId = run!.id;
  const counts: SyncCounts = {
    fetched: 0,
    new: 0,
    updated: 0,
    unchanged: 0,
    duplicate: 0,
    failed: 0,
    expired: 0,
  };
  const errors: { externalId?: string; message: string }[] = [];
  const log: string[] = [];
  const touched: string[] = [];
  const seen = new Set<string>();
  const say = (m: string) => log.push(`${new Date().toISOString()} ${m}`);

  try {
    const c = createConnector(connector.type, {
      config,
      credentials,
      fetch: opts.fetchImpl,
      now,
      log: say,
    });
    const { data: lastOk } = await admin
      .from("connector_runs")
      .select("started_at")
      .eq("connector_id", connectorId)
      .in("status", ["succeeded", "partial"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    // Snapshot sources always fetch everything (needed to detect closed vacancies).
    const since =
      SNAPSHOT_TYPES.has(connector.type) || !lastOk?.started_at
        ? null
        : new Date(lastOk.started_at);
    say(`sync started (since=${since?.toISOString() ?? "all"})`);

    const ctx = {
      admin,
      connector: { id: connectorId, sourcePriority: connector.source_priority },
      parser: opts.parser ?? createParserProvider(),
      embedder: opts.embedder ?? createEmbeddingProvider(),
      esco: await loadEscoIndex(admin),
      now,
    };

    for await (const raw of c.fetch(since)) {
      counts.fetched++;
      let job: CanonicalJob;
      try {
        job = c.map(raw);
      } catch (e) {
        counts.failed++;
        if (errors.length < MAX_ERRORS_LOGGED)
          errors.push({
            externalId: safeId(() => c.externalId(raw)),
            message: `map: ${(e as Error).message}`,
          });
        continue;
      }
      seen.add(job.externalId);
      const payloadHash = createHash("sha256").update(stableStringify(raw)).digest("hex");
      await admin
        .from("job_raw")
        .upsert(
          {
            connector_id: connectorId,
            run_id: runId,
            external_id: job.externalId,
            payload: asJson(raw),
            payload_hash: payloadHash,
          },
          { onConflict: "connector_id,external_id,payload_hash", ignoreDuplicates: true },
        );
      try {
        const r = await ingestJob(ctx, job);
        counts[r.outcome]++;
        if (r.outcome === "new" || r.outcome === "updated") touched.push(r.jobId);
      } catch (e) {
        counts.failed++;
        if (errors.length < MAX_ERRORS_LOGGED)
          errors.push({ externalId: job.externalId, message: (e as Error).message });
      }
    }

    // Expiry by absence (snapshot sources only).
    if (SNAPSHOT_TYPES.has(connector.type) && counts.fetched > 0) {
      const { data: live } = await admin
        .from("jobs")
        .select("id, external_id, missed_runs")
        .eq("source_id", connectorId)
        .in("status", ["published", "pending_review"]);
      for (const j of live ?? []) {
        if (seen.has(j.external_id ?? "")) continue;
        const missed = j.missed_runs + 1;
        const expire = missed >= connector.expire_after_missed_runs;
        await admin
          .from("jobs")
          .update({ missed_runs: missed, ...(expire ? { status: "expired" as const } : {}) })
          .eq("id", j.id);
        if (expire) {
          counts.expired++;
          touched.push(j.id);
        }
      }
    }

    const status =
      counts.failed === 0 ? "succeeded" : counts.failed < counts.fetched ? "partial" : "failed";
    say(`sync finished: ${JSON.stringify(counts)}`);
    if (!opts.skipMatching && touched.length) {
      const users = await recomputeMatchesForJobs(admin, touched);
      say(`matches recomputed for ${users} users on ${touched.length} jobs`);
    }
    await finish(admin, runId, connectorId, status, counts, errors, log, {
      ok: status !== "failed",
      message: `${status}: ${counts.new} new, ${counts.updated} updated`,
    });
    return { runId, status, counts, errors };
  } catch (e) {
    const message = (e as Error).message;
    errors.push({ message });
    say(`sync failed: ${message}`);
    await finish(admin, runId, connectorId, "failed", counts, errors, log, { ok: false, message });
    return { runId, status: "failed" as const, counts, errors };
  }
}

function safeId(fn: () => string): string | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

async function finish(
  admin: AdminClient,
  runId: string,
  connectorId: string,
  status: "succeeded" | "partial" | "failed",
  counts: SyncCounts,
  errors: { externalId?: string; message: string }[],
  log: string[],
  health: { ok: boolean; message: string },
) {
  const finishedAt = new Date().toISOString();
  await admin
    .from("connector_runs")
    .update({
      status,
      finished_at: finishedAt,
      counts: asJson(counts),
      errors: asJson(errors),
      log,
    })
    .eq("id", runId);
  await admin
    .from("connectors")
    .update({ last_sync_at: finishedAt, last_health: asJson({ ...health, at: finishedAt }) })
    .eq("id", connectorId);
  await writeAudit(admin, {
    actorRole: "system",
    action: "connector.sync",
    entityType: "connector",
    entityId: connectorId,
    metadata: { runId, status, counts },
  });
}
