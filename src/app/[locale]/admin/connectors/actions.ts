"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";
import { requireAdmin } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { decryptJson, encryptJson } from "@/server/crypto";
import { enqueue, QUEUES } from "@/server/queue";
import { runConnectorSync, loadConnector } from "@/server/pipeline/sync";
import { CONNECTORS, createConnector, getDefinition } from "@/core/connectors";
import { CONNECTOR_FORMS, coerceConfig } from "@/core/connectors/forms";
import {
  extractItems,
  fieldMappingSchema,
  mapRecord,
  parseFeed,
  suggestMapping,
} from "@/core/connectors/mapping";

export type FormState = { status: "idle" | "error" | "ok"; message?: string };

const baseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(
    Object.keys(CONNECTORS) as [keyof typeof CONNECTORS, ...(keyof typeof CONNECTORS)[]],
  ),
  syncIntervalMinutes: z.coerce.number().int().min(15).max(10080),
  sourcePriority: z.coerce.number().int().min(0).max(100),
  mayRepublish: z.enum(["on"]).optional(),
  enabled: z.enum(["on"]).optional(),
});

function readForm(formData: FormData) {
  const entries = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  const base = baseSchema.parse(entries);
  const config = coerceConfig(
    base.type,
    Object.fromEntries(
      Object.entries(entries)
        .filter(([k]) => k.startsWith("config."))
        .map(([k, v]) => [k.slice(7), v]),
    ),
  );
  const credentials = Object.fromEntries(
    Object.entries(entries)
      .filter(([k, v]) => k.startsWith("cred.") && v.trim())
      .map(([k, v]) => [k.slice(5), v.trim()]),
  );
  return { base, config, credentials };
}

/** Validate config against the connector's schema (generic feeds get their mapping separately). */
function validateConfig(type: string, config: Record<string, unknown>) {
  const def = getDefinition(type);
  const probe =
    type === "generic_feed"
      ? { ...config, mapping: { format: "json", itemsPath: "$[*]", fields: {} } }
      : config;
  const r = def.configSchema.safeParse(probe);
  return r.success
    ? null
    : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

export async function createConnectorAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  let id: string;
  try {
    const { base, config, credentials } = readForm(formData);
    const err = validateConfig(base.type, config);
    if (err) return { status: "error", message: err };
    const missing = CONNECTOR_FORMS[base.type]!.credentials.filter(
      (f) => f.required && !credentials[f.key],
    ).map((f) => f.key);
    if (missing.length)
      return { status: "error", message: `missing credentials: ${missing.join(", ")}` };
    const db = createAdminClient();
    const { data, error } = await db
      .from("connectors")
      .insert({
        name: base.name,
        type: base.type,
        config: asJson(config),
        sync_interval_minutes: base.syncIntervalMinutes,
        source_priority: base.sourcePriority,
        may_republish: !!base.mayRepublish,
        enabled: !!base.enabled,
        created_by: admin.id,
      })
      .select("id")
      .single();
    if (error) return { status: "error", message: error.message };
    id = data.id;
    if (Object.keys(credentials).length)
      await db
        .from("connector_secrets")
        .insert({ connector_id: id, ciphertext: encryptJson(credentials) });
    await writeAudit(db, {
      actorId: admin.id,
      actorRole: "admin",
      action: "connector.create",
      entityType: "connector",
      entityId: id,
      metadata: { type: base.type, name: base.name, credentialKeys: Object.keys(credentials) },
    });
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  redirect({ href: base_path(id), locale: await getLocale() });
  return { status: "ok" };
}

const base_path = (id: string) => `/admin/connectors/${id}`;

export async function updateConnectorAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  try {
    const { base, config, credentials } = readForm(formData);
    const err = validateConfig(base.type, config);
    if (err) return { status: "error", message: err };
    const db = createAdminClient();
    const { error } = await db
      .from("connectors")
      .update({
        name: base.name,
        config: asJson(config),
        sync_interval_minutes: base.syncIntervalMinutes,
        source_priority: base.sourcePriority,
        may_republish: !!base.mayRepublish,
        enabled: !!base.enabled,
      })
      .eq("id", id);
    if (error) return { status: "error", message: error.message };
    if (Object.keys(credentials).length) {
      // Blank fields keep their stored value; filled fields overwrite.
      const { data: existing } = await db
        .from("connector_secrets")
        .select("ciphertext")
        .eq("connector_id", id)
        .maybeSingle();
      const merged = {
        ...(existing ? decryptJson<Record<string, string>>(existing.ciphertext) : {}),
        ...credentials,
      };
      await db.from("connector_secrets").upsert({
        connector_id: id,
        ciphertext: encryptJson(merged),
        updated_at: new Date().toISOString(),
      });
    }
    await writeAudit(db, {
      actorId: admin.id,
      actorRole: "admin",
      action: "connector.update",
      entityType: "connector",
      entityId: id,
      metadata: {
        name: base.name,
        enabled: !!base.enabled,
        sourcePriority: base.sourcePriority,
        credentialKeysChanged: Object.keys(credentials),
      },
    });
    revalidatePath("/[locale]/admin/connectors", "layout");
    return { status: "ok" };
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
}

export async function toggleConnector(id: string, enabled: boolean) {
  const admin = await requireAdmin();
  const db = createAdminClient();
  await db.from("connectors").update({ enabled }).eq("id", z.uuid().parse(id));
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: enabled ? "connector.enable" : "connector.disable",
    entityType: "connector",
    entityId: id,
  });
  revalidatePath("/[locale]/admin/connectors", "layout");
}

export async function deleteConnector(id: string) {
  const admin = await requireAdmin();
  const db = createAdminClient();
  await db.from("connectors").delete().eq("id", z.uuid().parse(id));
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "connector.delete",
    entityType: "connector",
    entityId: id,
  });
  redirect({ href: "/admin/connectors", locale: await getLocale() });
}

export async function healthcheckConnector(id: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { connector, credentials, config } = await loadConnector(db, z.uuid().parse(id));
  let result;
  try {
    result = await createConnector(connector.type, { config, credentials }).healthcheck();
  } catch (e) {
    result = { ok: false, message: (e as Error).message };
  }
  await db
    .from("connectors")
    .update({ last_health: asJson({ ...result, at: new Date().toISOString() }) })
    .eq("id", id);
  revalidatePath("/[locale]/admin/connectors", "layout");
  return result;
}

/** Queue a sync; without a running worker (local dev) the sync runs inline. */
export async function syncConnectorNow(id: string) {
  const admin = await requireAdmin();
  const db = createAdminClient();
  z.uuid().parse(id);
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "connector.sync_requested",
    entityType: "connector",
    entityId: id,
  });
  const jobId = await enqueue(
    QUEUES.connectorSync,
    { connectorId: id, trigger: "manual", triggeredBy: admin.id },
    { singletonKey: `sync:${id}` },
  );
  if (jobId && process.env.INLINE_SYNC !== "1") return { queued: true as const };
  const r = await runConnectorSync(db, id, { trigger: "manual", triggeredBy: admin.id });
  revalidatePath("/[locale]/admin", "layout");
  return { queued: false as const, status: r.status, counts: r.counts, runId: r.runId };
}

// ─── Field mapping editor ────────────────────────────────────────────────────

/** Fetch the feed and return the first items (for the mapping preview). */
export async function loadFeedSample(id: string, format: "json" | "xml", itemsPath: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { config, credentials } = await loadConnector(db, z.uuid().parse(id));
  const url = String(config.url ?? "");
  const headers: Record<string, string> = {};
  if (typeof config.apiKeyHeader === "string" && credentials.apiKey)
    headers[config.apiKeyHeader] = credentials.apiKey;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) return { ok: false as const, message: `HTTP ${res.status}` };
  try {
    const items = extractItems(parseFeed(await res.text(), format), itemsPath);
    return { ok: true as const, count: items.length, sample: items.slice(0, 3) };
  } catch (e) {
    return { ok: false as const, message: (e as Error).message };
  }
}

export async function previewMapping(sample: unknown, mapping: unknown) {
  await requireAdmin();
  const m = fieldMappingSchema.safeParse(mapping);
  if (!m.success)
    return {
      job: null,
      values: {},
      errors: m.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  return mapRecord(sample, m.data);
}

export async function suggestFieldMapping(
  sample: Record<string, unknown>,
  format: "json" | "xml",
  itemsPath: string,
) {
  await requireAdmin();
  return suggestMapping(sample, format, itemsPath);
}

export async function saveMapping(id: string, mapping: unknown, sample: unknown) {
  const admin = await requireAdmin();
  const m = fieldMappingSchema.parse(mapping);
  const db = createAdminClient();
  const { data: last } = await db
    .from("field_mappings")
    .select("version")
    .eq("connector_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;
  await db.from("field_mappings").update({ is_active: false }).eq("connector_id", id);
  const { error } = await db.from("field_mappings").insert({
    connector_id: id,
    version,
    mapping: asJson(m),
    sample_record: sample ? asJson(sample) : null,
    is_active: true,
    created_by: admin.id,
  });
  if (error) throw new Error(error.message);
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "mapping.save",
    entityType: "connector",
    entityId: id,
    metadata: { version },
  });
  revalidatePath("/[locale]/admin/connectors", "layout");
  return { version };
}
