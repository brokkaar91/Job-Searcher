/**
 * ESCO import.
 *
 *   pnpm esco:import                              # load the bundled subset (supabase/seed/esco-subset.json)
 *   pnpm esco:import --subset path/to/file.json   # another subset in the same format
 *   pnpm esco:import --csv ./esco-v1.2.0-csv      # full ESCO CSV download (skills_en.csv, occupations_en.csv,
 *                                                 #   broaderRelationsSkillPillar.csv, optional *_nl.csv)
 *   pnpm esco:import --csv ./esco --reconcile     # afterwards remap local urn:jm: URIs to official ESCO URIs
 *
 * The same code path is used for a later CompetentNL import (map its CSV columns in `readCsvRows`).
 */
import "./_env";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { createAdminClient, type AdminClient } from "../src/lib/supabase/admin";
import { normalizeLabel } from "../src/core/esco";
import { asJson } from "../src/lib/json";

const subsetSchema = z.object({
  skills: z.array(
    z.object({
      uri: z.string(),
      preferredLabelEn: z.string(),
      preferredLabelNl: z.string().nullish(),
      altLabels: z.array(z.string()).default([]),
      skillType: z
        .enum(["skill/competence", "knowledge", "language", "transversal"])
        .default("skill/competence"),
      broaderUris: z.array(z.string()).default([]),
    }),
  ),
  occupations: z.array(
    z.object({
      uri: z.string(),
      code: z.string().nullish(),
      iscoCode: z.string().regex(/^\d{4}$/),
      preferredLabelEn: z.string(),
      preferredLabelNl: z.string().nullish(),
      altLabels: z.array(z.string()).default([]),
      riasec: z.record(z.string(), z.number()).nullish(),
      workValues: z.record(z.string(), z.number()).nullish(),
      essentialSkillUris: z.array(z.string()).default([]),
      optionalSkillUris: z.array(z.string()).default([]),
    }),
  ),
});
export type EscoSubset = z.infer<typeof subsetSchema>;

export const DEFAULT_SUBSET = path.resolve(process.cwd(), "supabase/seed/esco-subset.json");

export async function importEscoSubset(
  admin: AdminClient,
  file = DEFAULT_SUBSET,
): Promise<{ skills: number; occupations: number }> {
  const data = subsetSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  await upsertSkills(admin, data.skills);
  await upsertOccupations(admin, data.occupations);
  return { skills: data.skills.length, occupations: data.occupations.length };
}

async function upsertSkills(admin: AdminClient, skills: EscoSubset["skills"]) {
  for (let i = 0; i < skills.length; i += 500) {
    const { error } = await admin.from("esco_skills").upsert(
      skills.slice(i, i + 500).map((s) => ({
        uri: s.uri,
        preferred_label_en: s.preferredLabelEn,
        preferred_label_nl: s.preferredLabelNl ?? null,
        alt_labels: s.altLabels,
        skill_type: s.skillType,
        broader_uris: s.broaderUris,
      })),
    );
    if (error) throw new Error(`esco_skills: ${error.message}`);
  }
}

async function upsertOccupations(admin: AdminClient, occupations: EscoSubset["occupations"]) {
  for (let i = 0; i < occupations.length; i += 500) {
    const { error } = await admin.from("esco_occupations").upsert(
      occupations.slice(i, i + 500).map((o) => ({
        uri: o.uri,
        code: o.code ?? null,
        isco_code: o.iscoCode,
        preferred_label_en: o.preferredLabelEn,
        preferred_label_nl: o.preferredLabelNl ?? null,
        alt_labels: o.altLabels,
        riasec: o.riasec ? asJson(o.riasec) : null,
        work_values: o.workValues ? asJson(o.workValues) : null,
        essential_skill_uris: o.essentialSkillUris,
        optional_skill_uris: o.optionalSkillUris,
      })),
    );
    if (error) throw new Error(`esco_occupations: ${error.message}`);
  }
}

// ─── Full ESCO CSV import ────────────────────────────────────────────────────

/** Minimal RFC 4180 CSV parser (quoted fields, embedded newlines). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])));
}

function readCsvRows(dir: string, name: string): Record<string, string>[] {
  const file = path.join(dir, name);
  return existsSync(file) ? parseCsv(readFileSync(file, "utf8")) : [];
}

const splitAlt = (s: string | undefined) =>
  s
    ? s
        .split(/\n|\|/)
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

export async function importEscoCsv(admin: AdminClient, dir: string) {
  const skillsEn = readCsvRows(dir, "skills_en.csv");
  if (skillsEn.length === 0) throw new Error(`No skills_en.csv found in ${dir}`);
  const nlLabels = new Map(
    readCsvRows(dir, "skills_nl.csv").map((r) => [r.conceptUri, r.preferredLabel]),
  );
  const broader = new Map<string, string[]>();
  for (const r of readCsvRows(dir, "broaderRelationsSkillPillar.csv")) {
    if (!r.conceptUri || !r.broaderUri) continue;
    broader.set(r.conceptUri, [...(broader.get(r.conceptUri) ?? []), r.broaderUri]);
  }
  const skillType = (t: string | undefined) =>
    (t === "knowledge" ? "knowledge" : "skill/competence") as "knowledge" | "skill/competence";
  await upsertSkills(
    admin,
    skillsEn.map((r) => ({
      uri: r.conceptUri!,
      preferredLabelEn: r.preferredLabel!,
      preferredLabelNl: nlLabels.get(r.conceptUri!) ?? null,
      altLabels: splitAlt(r.altLabels),
      skillType: skillType(r.skillType),
      broaderUris: broader.get(r.conceptUri!) ?? [],
    })),
  );
  const occNl = new Map(
    readCsvRows(dir, "occupations_nl.csv").map((r) => [r.conceptUri, r.preferredLabel]),
  );
  const occupations = readCsvRows(dir, "occupations_en.csv")
    .filter((r) => /^\d{4}$/.test(r.iscoGroup ?? ""))
    .map((r) => ({
      uri: r.conceptUri!,
      code: r.code || null,
      iscoCode: r.iscoGroup!,
      preferredLabelEn: r.preferredLabel!,
      preferredLabelNl: occNl.get(r.conceptUri!) ?? null,
      altLabels: splitAlt(r.altLabels),
      riasec: null,
      workValues: null,
      essentialSkillUris: [],
      optionalSkillUris: [],
    }));
  await upsertOccupations(admin, occupations);
  return { skills: skillsEn.length, occupations: occupations.length };
}

/** Remap local subset URIs (urn:jm:…) to official ESCO URIs with the same (normalised) English label. */
export async function reconcileSubsetUris(admin: AdminClient) {
  const { data: local } = await admin
    .from("esco_skills")
    .select("uri, preferred_label_en")
    .like("uri", "urn:jm:%");
  const { data: official } = await admin
    .from("esco_skills")
    .select("uri, preferred_label_en")
    .not("uri", "like", "urn:jm:%");
  const byLabel = new Map(
    (official ?? []).map((s) => [normalizeLabel(s.preferred_label_en), s.uri]),
  );
  const remap = new Map<string, string>();
  for (const s of local ?? []) {
    const target = byLabel.get(normalizeLabel(s.preferred_label_en));
    if (target) remap.set(s.uri, target);
  }
  for (const [from, to] of remap) {
    await admin.from("candidate_skills").update({ esco_uri: to }).eq("esco_uri", from);
  }
  const { data: jobs } = await admin.from("jobs").select("id, esco_skills");
  for (const j of jobs ?? []) {
    const skills = (j.esco_skills as { uri: string }[] | null) ?? [];
    if (!skills.some((s) => remap.has(s.uri))) continue;
    await admin
      .from("jobs")
      .update({
        esco_skills: asJson(skills.map((s) => ({ ...s, uri: remap.get(s.uri) ?? s.uri }))),
      })
      .eq("id", j.id);
  }
  return { remapped: remap.size, unmatched: (local?.length ?? 0) - remap.size };
}

async function main() {
  const args = process.argv.slice(2);
  const admin = createAdminClient();
  const csvDir = args.includes("--csv") ? args[args.indexOf("--csv") + 1] : undefined;
  if (csvDir) {
    console.log("Importing full ESCO CSV from", csvDir, await importEscoCsv(admin, csvDir));
    if (args.includes("--reconcile"))
      console.log("Reconciled subset URIs:", await reconcileSubsetUris(admin));
  } else {
    const file = args.includes("--subset") ? args[args.indexOf("--subset") + 1] : DEFAULT_SUBSET;
    console.log("Imported ESCO subset", await importEscoSubset(admin, file));
  }
}

if (process.argv[1]?.endsWith("import-esco.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
