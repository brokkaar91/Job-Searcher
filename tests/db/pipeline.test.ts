/**
 * Pipeline integration tests against local Supabase (requires `pnpm db:start && pnpm seed`).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";
import { runConnectorSync } from "@/server/pipeline/sync";
import { expireJobs, runRetention } from "@/server/pipeline/maintenance";
import { MockParserProvider } from "@/core/providers/parser";
import { FakeEmbeddingProvider } from "@/core/providers/embedding";
import { ConsoleMailer } from "@/core/providers/mailer";
import { extractItems, parseFeed, suggestMapping } from "@/core/connectors/mapping";
import { encryptJson, decryptJson } from "@/server/crypto";

const run = !!process.env.DATABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const feed = readFileSync(path.resolve("public/demo/jobs-feed.json"), "utf8");

describe.skipIf(!run)("connector pipeline", () => {
  const admin = run ? createAdminClient() : (null as never);
  let connectorId = "";
  let body = feed;
  const fetchImpl = (async () => new Response(body)) as unknown as typeof fetch;
  const opts = {
    parser: new MockParserProvider(),
    embedder: new FakeEmbeddingProvider(),
    skipMatching: true,
    fetchImpl,
  };

  beforeAll(async () => {
    const items = extractItems(parseFeed(feed, "json"), "$.jobs[*]");
    const mapping = { ...suggestMapping(items[0] as Record<string, unknown>, "json", "$.jobs[*]") };
    mapping.fields.companyDomain = { path: "$.company_url", transform: "domain" };
    const { data } = await admin
      .from("connectors")
      .insert({
        name: `test-feed-${Date.now()}`,
        type: "generic_feed",
        enabled: false,
        config: asJson({ url: "https://demo.example/feed.json" }),
        source_priority: 40,
        expire_after_missed_runs: 2,
      })
      .select("id")
      .single();
    connectorId = data!.id;
    await admin
      .from("field_mappings")
      .insert({ connector_id: connectorId, version: 1, mapping: asJson(mapping), is_active: true });
    await admin
      .from("connector_secrets")
      .insert({ connector_id: connectorId, ciphertext: encryptJson({ apiKey: "s3cret" }) });
  });

  afterAll(async () => {
    await admin.from("jobs").delete().eq("source_id", connectorId);
    await admin.from("connectors").delete().eq("id", connectorId);
  });

  it("stores credentials encrypted", async () => {
    const { data } = await admin
      .from("connector_secrets")
      .select("ciphertext")
      .eq("connector_id", connectorId)
      .single();
    expect(data!.ciphertext).not.toContain("s3cret");
    expect(decryptJson(data!.ciphertext)).toEqual({ apiKey: "s3cret" });
  });

  it("ingests new jobs, detects a duplicate of a seed job and keeps the higher-priority golden record", async () => {
    const r = await runConnectorSync(admin, connectorId, { ...opts, trigger: "manual" });
    expect(r.status).toBe("succeeded");
    expect(r.counts).toMatchObject({ fetched: 3, new: 2, duplicate: 1, failed: 0 });

    const { data: jobs } = await admin
      .from("jobs")
      .select(
        "external_id, is_golden, dedup_group_id, company_id, salary_min_month, language, lat, esco_skills, status",
      )
      .eq("source_id", connectorId)
      .order("external_id");
    const dup = jobs!.find((j) => j.external_id === "demo-103")!;
    expect(dup.is_golden).toBe(false);
    const { data: group } = await admin
      .from("jobs")
      .select("external_id, is_golden")
      .eq("dedup_group_id", dup.dedup_group_id!);
    expect(group!.find((g) => g.external_id === "seed:canal-senior-de")?.is_golden).toBe(true);

    const analyst = jobs!.find((j) => j.external_id === "demo-101")!;
    expect(analyst.salary_min_month).toBe(3400);
    expect(analyst.language).toBe("en");
    expect(analyst.lat).not.toBeNull(); // geocoded via city_locations
    // Company resolved by domain (layer 2) to the existing seed company
    const { data: canal } = await admin
      .from("companies")
      .select("id")
      .eq("domain", "canalanalytics.example")
      .single();
    expect(analyst.company_id).toBe(canal!.id);

    const { data: runRow } = await admin
      .from("connector_runs")
      .select("status, counts, log")
      .eq("id", r.runId)
      .single();
    expect(runRow!.status).toBe("succeeded");
    expect(runRow!.log.length).toBeGreaterThan(1);
    expect(
      await admin
        .from("job_raw")
        .select("id", { count: "exact", head: true })
        .eq("connector_id", connectorId),
    ).toMatchObject({ count: 3 });
  });

  it("is idempotent: an unchanged feed produces no new jobs", async () => {
    const r = await runConnectorSync(admin, connectorId, opts);
    expect(r.counts).toMatchObject({ fetched: 3, new: 0, updated: 0, unchanged: 2, duplicate: 1 });
  });

  it("expires jobs that disappear from the feed after N missed runs", async () => {
    const doc = JSON.parse(feed);
    body = JSON.stringify({
      ...doc,
      jobs: doc.jobs.filter((j: { id: string }) => j.id !== "demo-102"),
    });
    const first = await runConnectorSync(admin, connectorId, opts);
    expect(first.counts.expired).toBe(0);
    const second = await runConnectorSync(admin, connectorId, opts);
    expect(second.counts.expired).toBe(1);
    const { data } = await admin
      .from("jobs")
      .select("status")
      .eq("source_id", connectorId)
      .eq("external_id", "demo-102")
      .single();
    expect(data!.status).toBe("expired");
    body = feed;
  });

  it("expires jobs past valid_through", async () => {
    await admin
      .from("jobs")
      .update({ valid_through: "2020-01-01T00:00:00Z" })
      .eq("source_id", connectorId)
      .eq("external_id", "demo-101");
    expect(await expireJobs(admin)).toBeGreaterThanOrEqual(1);
    const { data } = await admin
      .from("jobs")
      .select("status")
      .eq("source_id", connectorId)
      .eq("external_id", "demo-101")
      .single();
    expect(data!.status).toBe("expired");
  });
});

describe.skipIf(!run)("retention job", () => {
  const admin = run ? createAdminClient() : (null as never);

  it("warns, then deletes inactive accounts", async () => {
    const email = `retention-${Date.now()}@jobmatch.test`;
    const { data: created } = await admin.auth.admin.createUser({ email, email_confirm: true });
    const id = created.user!.id;
    await admin.from("profiles").update({ last_active_at: "2024-01-01T00:00:00Z" }).eq("id", id);
    const mailer = new ConsoleMailer();
    const now = new Date("2026-09-27T00:00:00Z");

    const first = await runRetention(admin, mailer, { months: 12, warningDays: 30, now });
    expect(first.warned).toBeGreaterThanOrEqual(1);
    expect(mailer.sent.some((m) => m.to === email)).toBe(true);
    expect((await admin.from("profiles").select("id").eq("id", id)).data).toHaveLength(1);

    await admin
      .from("profiles")
      .update({ retention_warning_sent_at: "2026-08-01T00:00:00Z" })
      .eq("id", id);
    const second = await runRetention(admin, mailer, { months: 12, warningDays: 30, now });
    expect(second.deleted).toBeGreaterThanOrEqual(1);
    expect((await admin.from("profiles").select("id").eq("id", id)).data).toEqual([]);
  });
});
