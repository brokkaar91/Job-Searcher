import { createHash } from "node:crypto";
import { extractCvText } from "@/core/providers/parser/extract";
import { createParserProvider, type ParsedCv, type ParserProvider } from "@/core/providers/parser";
import { createEmbeddingProvider, type EmbeddingProvider } from "@/core/providers/embedding";
import { redactPii } from "@/core/privacy/redact";
import type { AdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";
import { loadEscoIndex } from "./esco";
import { recomputeMatchesForUser } from "./matching/service";
import { toVectorLiteral } from "./matching/mappers";
import { enqueue, QUEUES } from "./queue";
import { writeAudit } from "./audit";

export const MAX_CV_BYTES = 10 * 1024 * 1024;

const monthToDate = (s: string | null) => {
  if (!s) return null;
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(s);
  return m ? `${m[1]}-${String(m[2] ?? "1").padStart(2, "0")}-01` : null;
};

/** Store an uploaded CV, parse it (redacted!) and pre-fill the candidate profile for review. */
export async function processCvUpload(
  admin: AdminClient,
  userId: string,
  file: { name: string; type: string; bytes: Uint8Array },
  opts: { knownNames?: string[]; parser?: ParserProvider } = {},
): Promise<{ cvId: string; parsed: ParsedCv | null; error?: string }> {
  const { data: last } = await admin
    .from("cv_files")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const storagePath = `${userId}/${version}-${safeName}`;

  const up = await admin.storage
    .from("cvs")
    .upload(storagePath, file.bytes, { contentType: file.type, upsert: false });
  if (up.error) throw new Error(`upload failed: ${up.error.message}`);
  const { data: cv, error } = await admin
    .from("cv_files")
    .insert({
      user_id: userId,
      version,
      storage_path: storagePath,
      file_name: file.name.slice(0, 200),
      mime_type: file.type,
      size_bytes: file.bytes.byteLength,
      parse_status: "parsing",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await admin.from("candidate_profiles").update({ current_cv_id: cv.id }).eq("user_id", userId);

  try {
    const text = await extractCvText(file.bytes, file.type);
    const redacted = redactPii(text, { knownNames: opts.knownNames });
    const parser = opts.parser ?? createParserProvider();
    const parsed = await parser.parseCv(redacted.text, { esco: await loadEscoIndex(admin) });
    await applyParsedCv(admin, userId, parsed, redacted.text);
    await admin
      .from("cv_files")
      .update({ parse_status: "parsed", parsed_at: new Date().toISOString(), parse_error: null })
      .eq("id", cv.id);
    await writeAudit(admin, {
      actorId: userId,
      actorRole: "user",
      action: "cv.parse",
      entityType: "cv_file",
      entityId: cv.id,
      inputHash: createHash("sha256").update(redacted.text).digest("hex"),
      metadata: {
        parser: parser.version,
        redactions: redacted.counts,
        skills: parsed.skills.length,
      },
    });
    return { cvId: cv.id, parsed };
  } catch (e) {
    const message = (e as Error).message.slice(0, 500);
    await admin
      .from("cv_files")
      .update({ parse_status: "failed", parse_error: message })
      .eq("id", cv.id);
    return { cvId: cv.id, parsed: null, error: message };
  }
}

/**
 * Pre-fill the profile from a parsed CV. CV-derived skills are unconfirmed until the user reviews
 * them; skills the user added manually are kept.
 */
export async function applyParsedCv(
  admin: AdminClient,
  userId: string,
  parsed: ParsedCv,
  redactedText: string,
) {
  await admin
    .from("candidate_skills")
    .delete()
    .eq("user_id", userId)
    .eq("source", "cv")
    .eq("confirmed", false);
  const { data: existing } = await admin
    .from("candidate_skills")
    .select("esco_uri, label")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((s) => s.esco_uri ?? s.label.toLowerCase()));
  const skills = parsed.skills
    .filter((s) => !have.has(s.escoUri ?? s.label.toLowerCase()))
    .map((s) => ({
      user_id: userId,
      esco_uri: s.escoUri,
      label: s.label.slice(0, 200),
      last_used_year: s.lastUsedYear,
      evidence: s.evidence.slice(0, 300),
      source: "cv",
      confirmed: false,
    }));
  if (skills.length) await admin.from("candidate_skills").insert(skills);

  await admin.from("candidate_experiences").delete().eq("user_id", userId);
  if (parsed.experiences.length) {
    await admin.from("candidate_experiences").insert(
      parsed.experiences.slice(0, 15).map((e, i) => ({
        user_id: userId,
        title: e.title.slice(0, 200),
        organisation: e.organisation?.slice(0, 200) ?? null,
        esco_occupation_uri: e.escoOccupationUri,
        isco_code: e.iscoCode,
        start_date: monthToDate(e.startDate),
        end_date: e.isCurrent ? null : monthToDate(e.endDate),
        is_current: e.isCurrent,
        description: e.description.slice(0, 2000),
        sort_order: i,
      })),
    );
  }
  const { count } = await admin
    .from("candidate_languages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (!count && parsed.languages.length) {
    await admin
      .from("candidate_languages")
      .insert(
        parsed.languages.map((l) => ({ user_id: userId, language: l.language, level: l.level })),
      );
  }
  await admin
    .from("candidate_profiles")
    .update({
      summary: parsed.summary || null,
      seniority: parsed.seniority,
      education_level: parsed.educationLevel,
      parsed_cv: asJson({ ...parsed, redactedTextLength: redactedText.length }),
    })
    .eq("user_id", userId);
}

/** (Re)compute embeddings from the redacted profile text. Used by the worker. */
export async function embedCandidate(
  admin: AdminClient,
  userId: string,
  embedder: EmbeddingProvider = createEmbeddingProvider(),
) {
  const [{ data: profile }, { data: experiences }, { data: skills }] = await Promise.all([
    admin.from("candidate_profiles").select("headline, summary").eq("user_id", userId).single(),
    admin
      .from("candidate_experiences")
      .select("id, title, description")
      .eq("user_id", userId)
      .order("sort_order"),
    admin.from("candidate_skills").select("label").eq("user_id", userId),
  ]);
  const expTexts = (experiences ?? []).map(
    (e) => redactPii(`${e.title}. ${e.description ?? ""}`).text,
  );
  const profileText = redactPii(
    [
      profile?.headline,
      profile?.summary,
      ...expTexts,
      (skills ?? []).map((s) => s.label).join(", "),
    ]
      .filter(Boolean)
      .join("\n"),
  ).text;
  const vectors = await embedder.embed([profileText, ...expTexts], "query");
  await admin
    .from("candidate_profiles")
    .update({
      embedding: toVectorLiteral(vectors[0]!),
      embedding_updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  await Promise.all(
    (experiences ?? []).map((e, i) =>
      admin
        .from("candidate_experiences")
        .update({ embedding: toVectorLiteral(vectors[i + 1]!) })
        .eq("id", e.id),
    ),
  );
}

/**
 * Called after onboarding / profile edits. Matches are recomputed inline right away (so the feed
 * is never empty); embeddings + a full recompute run in the worker. Without a worker, embeddings
 * are computed inline unless the provider is the (heavy) local model.
 */
export async function requestCandidateRefresh(admin: AdminClient, userId: string) {
  const queued = await enqueue(
    QUEUES.candidateRefresh,
    { userId },
    { singletonKey: `candidate:${userId}` },
  );
  if (!queued && (process.env.EMBEDDING_PROVIDER ?? "fake") !== "local") {
    await embedCandidate(admin, userId).catch((e) => console.warn("inline embedding failed", e));
  }
  await recomputeMatchesForUser(admin, userId);
}
