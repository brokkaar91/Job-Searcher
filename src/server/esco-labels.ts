import "server-only";
import type { createClient } from "@/lib/supabase/server";

/** Localised ESCO preferred labels for display (stored labels are English). */
export async function localizedSkillLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  uris: (string | null)[],
  locale: string,
): Promise<Map<string, string>> {
  const list = [...new Set(uris.filter((u): u is string => !!u))];
  if (!list.length || locale === "en") return new Map();
  const { data } = await supabase
    .from("esco_skills")
    .select("uri, preferred_label_nl")
    .in("uri", list);
  return new Map(
    (data ?? []).filter((r) => r.preferred_label_nl).map((r) => [r.uri, r.preferred_label_nl!]),
  );
}
