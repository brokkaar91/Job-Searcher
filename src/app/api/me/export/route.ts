import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/server/audit";

/** GDPR data portability: everything we store about the signed-in user, as JSON (RLS-scoped). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = <T extends string>(table: T, columns = "*") =>
    supabase
      .from(table as never)
      .select(columns)
      .eq("user_id" as never, user.id as never);
  const [
    profile,
    candidate,
    skills,
    experiences,
    languages,
    cvFiles,
    matches,
    feedback,
    applications,
    alerts,
    consents,
    deletion,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, locale, role, created_at, last_active_at")
      .eq("id", user.id)
      .single(),
    q(
      "candidate_profiles",
      "headline, summary, seniority, education_level, preferences, riasec, riasec_answers, work_values, onboarding_completed_at, parsed_cv, created_at, updated_at",
    ),
    q(
      "candidate_skills",
      "esco_uri, label, last_used_year, evidence, source, confirmed, created_at",
    ),
    q(
      "candidate_experiences",
      "title, organisation, esco_occupation_uri, isco_code, start_date, end_date, is_current, description",
    ),
    q("candidate_languages", "language, level"),
    q("cv_files", "version, file_name, mime_type, size_bytes, parse_status, created_at"),
    q(
      "matches",
      "job_id, total_score, label, component_scores, explanation, knockouts, knocked_out, model_version_id, input_hash, created_at, updated_at",
    ),
    q("match_feedback", "job_id, type, reason, comment, created_at"),
    q(
      "applications",
      "job_id, status, notes, saved_at, applied_at, interview_at, offer_at, rejected_at",
    ),
    q("alert_settings"),
    q("consents", "type, granted, policy_version, created_at"),
    q("deletion_requests", "status, requested_at, processed_at"),
  ]);
  await writeAudit(createAdminClient(), {
    actorId: user.id,
    actorRole: "user",
    action: "privacy.export",
    entityType: "user",
    entityId: user.id,
  });
  const body = {
    exportedAt: new Date().toISOString(),
    note: "Personal data export (AVG/GDPR art. 15 & 20). CV files can be downloaded individually in your profile.",
    profile: profile.data,
    candidateProfile: candidate.data?.[0] ?? null,
    skills: skills.data,
    experiences: experiences.data,
    languages: languages.data,
    cvFiles: cvFiles.data,
    matches: matches.data,
    matchFeedback: feedback.data,
    applications: applications.data,
    alertSettings: alerts.data?.[0] ?? null,
    consents: consents.data,
    deletionRequests: deletion.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="jobmatch-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
