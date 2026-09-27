/**
 * Seeds a local/dev database with demo data:
 *   ESCO subset, NL cities, ~16 companies (fictional), 50 jobs, 5 demo candidates, 1 admin,
 *   the default matching model – and computes matches for the demo candidates.
 *
 *   pnpm seed               # idempotent; safe to re-run
 *
 * Demo logins (magic link via local Mailpit at http://127.0.0.1:54324):
 *   admin@jobmatch.local, demo.data@jobmatch.local, demo.nurse@jobmatch.local, demo.ux@jobmatch.local,
 *   demo.finance@jobmatch.local, demo.logistics@jobmatch.local
 */
import "./_env";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createAdminClient, type AdminClient } from "../src/lib/supabase/admin";
import { asJson } from "../src/lib/json";
import { importEscoSubset, type EscoSubset } from "./import-esco";
import { ensureDefaultModel } from "../src/server/model";
import { recomputeMatchesForUser } from "../src/server/matching/service";
import { toVectorLiteral } from "../src/server/matching/mappers";
import { createEmbeddingProvider } from "../src/core/providers/embedding";
import { MockParserProvider } from "../src/core/providers/parser";
import { EscoIndex } from "../src/core/esco";
import { suggestMapping } from "../src/core/connectors/mapping";
import { dedupKey, normalizeApplyUrl, normalizeText } from "../src/core/pipeline/normalize";
import { redactPii } from "../src/core/privacy/redact";
import { WORK_VALUES, type WorkValueProfile } from "../src/core/matching/types";

const SEED_DIR = path.resolve(process.cwd(), "supabase/seed");
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(path.join(SEED_DIR, file), "utf8")) as T;
const SKILL = "urn:jm:skill:";
const OCC = "urn:jm:occupation:";
export const POLICY_VERSION = "2026-09";

interface SeedCity {
  name: string;
  province: string;
  lat: number;
  lng: number;
}
interface SeedCompany {
  key: string;
  name: string;
  domain: string;
  size: string;
  type: string;
  city: string;
  description: string;
}
interface SeedJob {
  key: string;
  title: string;
  company: string;
  city: string;
  language: string;
  remotePolicy: string;
  employmentTypes: string[];
  hoursMin: number | null;
  hoursMax: number | null;
  salaryMinMonth: number | null;
  salaryMaxMonth: number | null;
  languageRequirements: { language: string; level: string; required: boolean }[];
  occupation: string;
  seniority: string;
  skills: { skill: string; importance: "must" | "nice" }[];
  educationRequirementEqf: number | null;
  postedDaysAgo: number;
  validForDays: number;
  description: string;
}
interface SeedCandidate {
  key: string;
  email: string;
  locale: "nl" | "en";
  persona: string;
  headline: string;
  seniority: string;
  educationLevel: number;
  preferences: {
    desiredOccupations: string[];
    city: string;
    maxTravelMinutes: number;
    travelMode: string;
    remote: string;
    minSalaryMonth: number;
    hoursMin: number;
    hoursMax: number;
    employmentTypes: string[];
    companySizes: string[];
    companyTypes: string[];
  };
  skills: [string, number][];
  experiences: {
    title: string;
    occupation: string | null;
    start: string;
    end: string | null;
    description: string;
  }[];
  languages: [string, string][];
  riasec: string;
  workValues: string[];
}

const log = (...a: unknown[]) => console.log("•", ...a);
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function riasecProfile(code: string) {
  const p: Record<string, number> = { R: 0.15, I: 0.15, A: 0.15, S: 0.15, E: 0.15, C: 0.15 };
  [...code].forEach((k, i) => (p[k] = [0.9, 0.7, 0.5][i] ?? 0.15));
  return p;
}

async function must<T>(
  p: PromiseLike<{ data: T; error: { message: string } | null }>,
  what: string,
): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function ensureUser(
  admin: AdminClient,
  email: string,
  locale: string,
  role: "user" | "admin",
) {
  const existing = await must(
    admin.from("profiles").select("id").eq("email", email).maybeSingle(),
    "profile lookup",
  );
  let id = existing?.id;
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        locale,
        consents: { terms_privacy: true, ai_processing: true },
        policy_version: POLICY_VERSION,
      },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    id = data.user.id;
  }
  await must(admin.from("profiles").update({ role, locale }).eq("id", id), "profile update");
  return id;
}

async function main() {
  const admin = createAdminClient();
  const embedder = createEmbeddingProvider();
  log(`embedding provider: ${embedder.name} (${embedder.model})`);

  // 1. Reference data
  log("ESCO subset", await importEscoSubset(admin));
  const esco = read<EscoSubset>("esco-subset.json");
  const escoIndex = new EscoIndex(
    esco.skills.map((s) => ({
      uri: s.uri,
      preferredLabelEn: s.preferredLabelEn,
      preferredLabelNl: s.preferredLabelNl,
      altLabels: s.altLabels,
      broaderUris: s.broaderUris,
    })),
    esco.occupations.map((o) => ({
      uri: o.uri,
      iscoCode: o.iscoCode,
      preferredLabelEn: o.preferredLabelEn,
      preferredLabelNl: o.preferredLabelNl,
      altLabels: o.altLabels,
    })),
  );
  const occByUri = new Map(esco.occupations.map((o) => [o.uri, o]));
  const cities = read<SeedCity[]>("cities.json");
  await must(
    admin.from("city_locations").upsert(
      cities.map((c) => ({
        name: c.name,
        name_normalized: normalizeText(c.name),
        province: c.province,
        lat: c.lat,
        lng: c.lng,
      })),
      { onConflict: "name_normalized" },
    ),
    "cities",
  );
  const city = (name: string) => {
    const c = cities.find((x) => x.name === name);
    if (!c) throw new Error(`unknown city ${name}`);
    return c;
  };
  log(`${cities.length} cities`);

  // 2. Companies
  const companies = read<SeedCompany[]>("companies.json");
  const companyRows = await must(
    admin
      .from("companies")
      .upsert(
        companies.map((c) => ({
          name: c.name,
          domain: c.domain,
          size: c.size as never,
          type: c.type as never,
          website: `https://${c.domain}`,
          description: c.description,
        })),
        { onConflict: "domain" },
      )
      .select("id, domain"),
    "companies",
  );
  const companyId = new Map(
    companies.map((c) => [c.key, (companyRows ?? []).find((r) => r.domain === c.domain)!.id]),
  );
  log(`${companies.length} companies`);

  // 3. Matching model
  await ensureDefaultModel(admin);

  // 4. Jobs
  const jobs = read<SeedJob[]>("jobs.json");
  const parser = new MockParserProvider();
  const vectors = await embedder.embed(
    jobs.map((j) => `${j.title}\n${j.description}`),
    "passage",
  );
  const existing = await must(
    admin
      .from("jobs")
      .select("id, external_id")
      .is("source_id", null)
      .like("external_id", "seed:%"),
    "existing jobs",
  );
  const existingId = new Map((existing ?? []).map((e) => [e.external_id, e.id]));
  const jobRows = await Promise.all(
    jobs.map(async (j, i) => {
      const company = companies.find((c) => c.key === j.company)!;
      const occ = occByUri.get(OCC + j.occupation);
      if (!occ) throw new Error(`unknown occupation ${j.occupation}`);
      const loc = city(j.city);
      // Work values: occupation profile blended with signals from the ad text.
      const fromText = (
        await parser.classifyJob(
          { title: j.title, description: j.description },
          { esco: escoIndex },
        )
      ).workValues;
      const workValues = Object.fromEntries(
        WORK_VALUES.map((v) => [
          v,
          Math.round((0.5 * (occ.workValues?.[v] ?? 0.5) + 0.5 * (fromText?.[v] ?? 0.5)) * 100) /
            100,
        ]),
      ) as WorkValueProfile;
      const applyUrl = `https://${company.domain}/careers/${j.key}?utm_source=jobmatch`;
      const externalId = `seed:${j.key}`;
      return {
        ...(existingId.has(externalId) ? { id: existingId.get(externalId)! } : {}),
        source_id: null,
        external_id: externalId,
        source_priority: 100,
        title: j.title,
        description: j.description,
        company_id: companyId.get(j.company)!,
        hiring_organization_name: company.name,
        employment_types: j.employmentTypes as never,
        date_posted: daysFromNow(-j.postedDaysAgo).toISOString().slice(0, 10),
        valid_through: daysFromNow(j.validForDays - j.postedDaysAgo).toISOString(),
        first_seen: daysFromNow(-j.postedDaysAgo).toISOString(),
        last_seen: new Date().toISOString(),
        apply_url: applyUrl,
        apply_url_normalized: normalizeApplyUrl(applyUrl),
        city: j.city,
        region: loc.province,
        country: "NL",
        lat: loc.lat,
        lng: loc.lng,
        remote_policy: j.remotePolicy as never,
        hours_min: j.hoursMin,
        hours_max: j.hoursMax,
        salary_min_month: j.salaryMinMonth,
        salary_max_month: j.salaryMaxMonth,
        salary_raw: j.salaryMinMonth
          ? asJson({ min: j.salaryMinMonth, max: j.salaryMaxMonth, unit: "month", currency: "EUR" })
          : null,
        language: j.language,
        language_requirements: asJson(j.languageRequirements),
        esco_occupation_uri: occ.uri,
        isco_code: occ.iscoCode,
        seniority: j.seniority as never,
        esco_skills: asJson(
          j.skills.map((s) => {
            const skill = esco.skills.find((x) => x.uri === SKILL + s.skill);
            if (!skill) throw new Error(`unknown skill ${s.skill} in ${j.key}`);
            return { uri: skill.uri, label: skill.preferredLabelEn, importance: s.importance };
          }),
        ),
        education_requirement: j.educationRequirementEqf
          ? asJson({ min_eqf: j.educationRequirementEqf, explicit: true })
          : null,
        work_values: asJson(workValues),
        classification_confidence: 0.95,
        needs_review: false,
        status: "published" as const,
        is_golden: true,
        dedup_key: dedupKey(j.title, company.name, j.city),
        content_hash: sha(`${j.title}\n${j.description}`),
        embedding: toVectorLiteral(vectors[i]!),
      };
    }),
  );
  const withId = jobRows.filter((r) => "id" in r);
  const withoutId = jobRows.filter((r) => !("id" in r));
  if (withId.length) await must(admin.from("jobs").upsert(withId), "update jobs");
  if (withoutId.length) await must(admin.from("jobs").insert(withoutId), "insert jobs");
  log(`${jobs.length} jobs (${jobs.filter((j) => j.language === "en").length} English)`);

  // 5. Demo connector (disabled): generic JSON feed served by the app itself (public/demo).
  const demoName = "Demo feed (lokaal)";
  const { data: demoConnector } = await admin
    .from("connectors")
    .select("id")
    .eq("name", demoName)
    .maybeSingle();
  if (!demoConnector) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data: created } = await admin
      .from("connectors")
      .insert({
        name: demoName,
        type: "generic_feed",
        enabled: false,
        config: asJson({ url: `${site}/demo/jobs-feed.json` }),
        source_priority: 40,
        sync_interval_minutes: 1440,
      })
      .select("id")
      .single();
    const feed = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "public/demo/jobs-feed.json"), "utf8"),
    ) as { jobs: Record<string, unknown>[] };
    const mapping = suggestMapping(feed.jobs[0]!, "json", "$.jobs[*]");
    mapping.fields.companyDomain = { path: "$.company_url", transform: "domain" };
    await admin.from("field_mappings").insert({
      connector_id: created!.id,
      version: 1,
      mapping: asJson(mapping),
      sample_record: asJson(feed.jobs[0]),
      is_active: true,
    });
    log(`connector "${demoName}" (disabled; run it from /admin/connectors)`);
  }

  // 6. Users
  await ensureUser(admin, "admin@jobmatch.local", "nl", "admin");
  log("admin: admin@jobmatch.local");

  const candidates = read<SeedCandidate[]>("candidates.json");
  for (const c of candidates) {
    const userId = await ensureUser(admin, c.email, c.locale, "user");
    const loc = city(c.preferences.city);
    const desired = c.preferences.desiredOccupations.map((k) => occByUri.get(OCC + k)!);
    const profileText = redactPii(
      [
        c.headline,
        ...c.experiences.map((e) => `${e.title}: ${e.description}`),
        c.skills.map(([s]) => s).join(", "),
      ].join("\n"),
    ).text;
    const [profileVector, ...expVectors] = await embedder.embed(
      [profileText, ...c.experiences.map((e) => `${e.title}. ${e.description}`)],
      "query",
    );
    await must(
      admin
        .from("candidate_profiles")
        .update({
          headline: c.headline,
          summary: c.persona,
          seniority: c.seniority as never,
          education_level: c.educationLevel,
          preferences: asJson({
            desiredOccupations: desired.map((o) => ({
              uri: o.uri,
              iscoCode: o.iscoCode,
              label: o.preferredLabelEn,
            })),
            location: { lat: loc.lat, lng: loc.lng, city: loc.name },
            maxTravelMinutes: c.preferences.maxTravelMinutes,
            travelMode: c.preferences.travelMode,
            remote: c.preferences.remote,
            minSalaryMonth: c.preferences.minSalaryMonth,
            hoursMin: c.preferences.hoursMin,
            hoursMax: c.preferences.hoursMax,
            employmentTypes: c.preferences.employmentTypes,
            companySizes: c.preferences.companySizes,
            companyTypes: c.preferences.companyTypes,
          }),
          riasec: asJson(riasecProfile(c.riasec)),
          work_values: asJson(c.workValues),
          onboarding_step: 5,
          onboarding_completed_at: new Date().toISOString(),
          embedding: toVectorLiteral(profileVector!),
          embedding_updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId),
      "candidate profile",
    );
    await must(admin.from("candidate_skills").delete().eq("user_id", userId), "clear skills");
    await must(
      admin.from("candidate_skills").insert(
        c.skills.map(([s, year]) => {
          const skill = esco.skills.find((x) => x.uri === SKILL + s);
          if (!skill) throw new Error(`unknown skill ${s} for ${c.key}`);
          return {
            user_id: userId,
            esco_uri: skill.uri,
            label: skill.preferredLabelEn,
            last_used_year: year,
            source: "user",
            confirmed: true,
          };
        }),
      ),
      "skills",
    );
    await must(
      admin.from("candidate_experiences").delete().eq("user_id", userId),
      "clear experiences",
    );
    await must(
      admin.from("candidate_experiences").insert(
        c.experiences.map((e, i) => {
          const occ = e.occupation ? occByUri.get(OCC + e.occupation) : null;
          return {
            user_id: userId,
            title: e.title,
            esco_occupation_uri: occ?.uri ?? null,
            isco_code: occ?.iscoCode ?? null,
            start_date: `${e.start}-01`,
            end_date: e.end ? `${e.end}-01` : null,
            is_current: !e.end,
            description: e.description,
            sort_order: i,
            embedding: toVectorLiteral(expVectors[i]!),
          };
        }),
      ),
      "experiences",
    );
    await must(admin.from("candidate_languages").delete().eq("user_id", userId), "clear languages");
    await must(
      admin.from("candidate_languages").insert(
        c.languages.map(([language, level]) => ({
          user_id: userId,
          language,
          level: level as never,
        })),
      ),
      "languages",
    );
    const results = await recomputeMatchesForUser(admin, userId);
    const shown = results.filter((r) => !r.knockedOut && r.label !== "weak");
    log(
      `${c.email}: ${shown.length} matches (top: ${shown
        .slice(0, 3)
        .map((r) => `${r.totalScore} ${r.label}`)
        .join(", ")})`,
    );
  }
  log("done ✔");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
