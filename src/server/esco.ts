import { EscoIndex } from "@/core/esco";
import type { AdminClient } from "@/lib/supabase/admin";

let cache: { index: EscoIndex; at: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

/** Loads the ESCO skills/occupations into an in-memory index (cached 10 min per process). */
export async function loadEscoIndex(
  admin: AdminClient,
  { fresh = false } = {},
): Promise<EscoIndex> {
  if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.index;
  const skills = await fetchAll(
    admin,
    "esco_skills",
    "uri, preferred_label_en, preferred_label_nl, alt_labels, broader_uris",
  );
  const occupations = await fetchAll(
    admin,
    "esco_occupations",
    "uri, isco_code, preferred_label_en, preferred_label_nl, alt_labels",
  );
  const index = new EscoIndex(
    skills.map((s) => ({
      uri: s.uri as string,
      preferredLabelEn: s.preferred_label_en as string,
      preferredLabelNl: s.preferred_label_nl as string | null,
      altLabels: s.alt_labels as string[],
      broaderUris: s.broader_uris as string[],
    })),
    occupations.map((o) => ({
      uri: o.uri as string,
      iscoCode: o.isco_code as string,
      preferredLabelEn: o.preferred_label_en as string,
      preferredLabelNl: o.preferred_label_nl as string | null,
      altLabels: o.alt_labels as string[],
    })),
  );
  cache = { index, at: Date.now() };
  return index;
}

async function fetchAll(
  admin: AdminClient,
  table: "esco_skills" | "esco_occupations",
  columns: string,
) {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) return out;
  }
}
