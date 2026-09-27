import { DEFAULT_MODEL_CONFIG, parseModelConfig, type ModelConfig } from "@/core/matching/config";
import type { AdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";

export interface ActiveModel {
  id: string;
  version: number;
  name: string;
  config: ModelConfig;
}

export async function getActiveModel(admin: AdminClient): Promise<ActiveModel> {
  const { data, error } = await admin
    .from("matching_model_versions")
    .select("id, version, name, config")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data)
    throw new Error(
      "No active matching model version – run `pnpm seed` or activate one in /admin/matching",
    );
  return {
    id: data.id,
    version: data.version,
    name: data.name,
    config: parseModelConfig(data.config),
  };
}

/** Creates version 1 with the default config when no model exists yet. Idempotent. */
export async function ensureDefaultModel(admin: AdminClient): Promise<void> {
  const { count } = await admin
    .from("matching_model_versions")
    .select("id", { count: "exact", head: true });
  if (count && count > 0) return;
  const { error } = await admin.from("matching_model_versions").insert({
    version: 1,
    name: "Default v1",
    notes: "Initial weights 35/20/15/10/10/10 and knock-outs as documented on /hoe-matching-werkt.",
    config: asJson(DEFAULT_MODEL_CONFIG),
    is_active: true,
    activated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
