import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClassificationEditor, ModerationButtons } from "@/components/admin/job-admin";
import type { Cefr } from "@/core/matching/types";

export default async function AdminJobDetail({ params }: PageProps<"/[locale]/admin/jobs/[id]">) {
  await resolveLocale(params);
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("admin.jobs");
  const format = await getFormatter();
  const db = createAdminClient();
  const { data: job } = await db
    .from("jobs")
    .select(
      "*, companies(name, domain, is_recognised_sponsor), connectors(name), esco_occupations(preferred_label_en)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!job) notFound();
  const [{ data: group }, { count: matchCount }] = await Promise.all([
    job.dedup_group_id
      ? db
          .from("jobs")
          .select("id, title, is_golden, source_priority, connectors(name)")
          .eq("dedup_group_id", job.dedup_group_id)
      : Promise.resolve({ data: [] as never[] }),
    db.from("matches").select("id", { count: "exact", head: true }).eq("job_id", id),
  ]);

  return (
    <>
      <div className="space-y-2">
        <Link href="/admin/jobs" className="text-muted-foreground text-sm hover:underline">
          ← {t("title")}
        </Link>
        <h1 className="text-3xl font-semibold">{job.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              job.status === "published"
                ? "success"
                : job.status === "pending_review"
                  ? "warning"
                  : "secondary"
            }
          >
            {t(`status.${job.status}`)}
          </Badge>
          <Badge variant="outline">
            {job.connectors?.name ?? t("manual")} ·{" "}
            {t("priority", { priority: job.source_priority })}
          </Badge>
          {job.companies?.is_recognised_sponsor && <Badge variant="accent">{t("sponsor")}</Badge>}
          {job.review_reasons.map((r) => (
            <Badge key={r} variant="warning">
              {r}
            </Badge>
          ))}
          <Badge variant="outline">{t("matchCount", { count: matchCount ?? 0 })}</Badge>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("classification.title")}</CardTitle>
            </CardHeader>
            <ClassificationEditor
              id={job.id}
              initial={{
                escoOccupationUri: job.esco_occupation_uri,
                occupationLabel: job.esco_occupations?.preferred_label_en ?? null,
                seniority: job.seniority,
                visaSponsorship: job.visa_sponsorship,
                skills:
                  (job.esco_skills as {
                    uri: string;
                    label: string;
                    importance: "must" | "nice";
                  }[]) ?? [],
                languageRequirements:
                  (job.language_requirements as {
                    language: string;
                    level: Cefr;
                    required: boolean;
                  }[]) ?? [],
              }}
            />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("descriptionTitle")}</CardTitle>
            </CardHeader>
            <div className="text-sm whitespace-pre-line">{job.description}</div>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("moderation")}</CardTitle>
            </CardHeader>
            {job.moderation_note && (
              <p className="text-muted-foreground text-sm">{job.moderation_note}</p>
            )}
            <ModerationButtons id={job.id} status={job.status} />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("facts")}</CardTitle>
            </CardHeader>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">{t("company")}</dt>
              <dd>{job.companies?.name ?? job.hiring_organization_name}</dd>
              <dt className="text-muted-foreground">{t("city")}</dt>
              <dd>{job.city ?? "–"}</dd>
              <dt className="text-muted-foreground">{t("salary")}</dt>
              <dd>
                {job.salary_min_month ? `€${job.salary_min_month}–${job.salary_max_month}` : "–"}
              </dd>
              <dt className="text-muted-foreground">{t("language")}</dt>
              <dd>{job.language ?? "–"}</dd>
              <dt className="text-muted-foreground">{t("confidence")}</dt>
              <dd>{job.classification_confidence ?? "–"}</dd>
              <dt className="text-muted-foreground">{t("firstSeen")}</dt>
              <dd>{format.dateTime(new Date(job.first_seen), { dateStyle: "medium" })}</dd>
              <dt className="text-muted-foreground">{t("lastSeen")}</dt>
              <dd>{format.dateTime(new Date(job.last_seen), { dateStyle: "medium" })}</dd>
              <dt className="text-muted-foreground">{t("validThrough")}</dt>
              <dd>
                {job.valid_through
                  ? format.dateTime(new Date(job.valid_through), { dateStyle: "medium" })
                  : "–"}
              </dd>
            </dl>
            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
              >
                {t("openSource")}
              </a>
            )}
          </Card>
          {group && group.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("dedupGroup")}</CardTitle>
              </CardHeader>
              <ul className="space-y-2 text-sm">
                {group.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/jobs/${g.id}`} className="truncate hover:underline">
                      {g.connectors?.name ?? t("manual")} · {g.title}
                    </Link>
                    {g.is_golden ? (
                      <Badge variant="success">{t("golden")}</Badge>
                    ) : (
                      <Badge variant="outline">P{g.source_priority}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
