import type { AdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";

export interface AuditEntry {
  actorId?: string | null;
  actorRole: "user" | "admin" | "system";
  action: string;
  entityType?: string;
  entityId?: string;
  modelVersionId?: string | null;
  inputHash?: string | null;
  metadata?: Record<string, unknown>;
}

/** Append-only audit log (service role). Admin mutations and every match computation are logged. */
export async function writeAudit(
  admin: AdminClient,
  entries: AuditEntry | AuditEntry[],
): Promise<void> {
  const list = Array.isArray(entries) ? entries : [entries];
  if (list.length === 0) return;
  for (let i = 0; i < list.length; i += 500) {
    const { error } = await admin.from("audit_log").insert(
      list.slice(i, i + 500).map((e) => ({
        actor_id: e.actorId ?? null,
        actor_role: e.actorRole,
        action: e.action,
        entity_type: e.entityType ?? null,
        entity_id: e.entityId ?? null,
        model_version_id: e.modelVersionId ?? null,
        input_hash: e.inputHash ?? null,
        metadata: asJson(e.metadata ?? {}),
      })),
    );
    if (error) throw new Error(`audit log write failed: ${error.message}`);
  }
}
