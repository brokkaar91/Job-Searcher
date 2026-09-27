import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDashed, Info, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireCandidate } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { shortLabel } from "@/core/matching/explain";
import { loadMatchDetail } from "@/server/matches";
import { renderMessage } from "@/lib/messages";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JobBadges, LabelBadge } from "@/components/matches/badges";
import { ComponentBreakdown } from "@/components/matches/component-breakdown";
import { ApplyButton, MatchQuickActions } from "@/components/matches/match-actions";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/matches/[jobId]">): Promise<Metadata> {
  await resolveLocale(params);
  return { title: (await getTranslations("detail"))("metaTitle") };
}

const STATUS_ICON = { pass: CheckCircle2, fail: XCircle, unknown: CircleDashed } as const;

export default async function MatchDetailPage({ params }: PageProps<"/[locale]/matches/[jobId]">) {
  const locale = await resolveLocale(params);
  const { jobId } = await params;
  const user = await requireCandidate(locale);
  if (!/^[0-9a-f-]{36}$/.test(jobId)) notFound();
  const data = await loadMatchDetail(user.id, jobId);
  const supabase = await createClient();
  if (!data) notFound();
  const { job, match, application, feedback } = data;
  const t = await getTranslations("detail");
  const tm = await getTranslations("matching");
  const tl = await getTranslations("languages");
  const tf = await getTranslations("feed");
  const format = await getFormatter();
  const eur = (n: number) =>
    format.number(n, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const company = job.companies;
  const mustGaps = match?.explanation.gaps.filter((g) => g.importance === "must") ?? [];
  const niceGaps = match?.explanation.gaps.filter((g) => g.importance === "nice") ?? [];
  // Localised ESCO labels for the gap analysis.
  const gapUris = match?.explanation.gaps.map((g) => g.uri) ?? [];
  const { data: gapLabels } = gapUris.length
    ? await supabase
        .from("esco_skills")
        .select("uri, preferred_label_en, preferred_label_nl")
        .in("uri", gapUris)
    : { data: [] };
  const skillLabel = (uri: string, fallback: string | null) => {
    const row = gapLabels?.find((r) => r.uri === uri);
    return shortLabel(
      (locale === "nl" ? row?.preferred_label_nl : null) ??
        row?.preferred_label_en ??
        fallback ??
        uri,
    );
  };
  const langName = (code: string) =>
    tl.has(code as never) ? tl(code as never) : code.toUpperCase();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/matches">
          <ArrowLeft aria-hidden /> {t("back")}
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">
                  {company?.name ?? job.hiring_organization_name}
                </p>
                <h1 className="text-2xl font-semibold sm:text-3xl">{job.title}</h1>
              </div>
              {match && <LabelBadge label={match.label} score={match.score} />}
            </div>
            <JobBadges
              recognisedSponsor={company?.is_recognised_sponsor ?? false}
              visaSponsorship={job.visa_sponsorship}
              remotePolicy={job.remote_policy}
              language={job.language}
              city={job.city}
            />
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">{t("salary")}</dt>
                <dd className="font-medium">
                  {job.salary_min_month && job.salary_max_month
                    ? `${eur(job.salary_min_month)} – ${eur(job.salary_max_month)}`
                    : tf("salaryUnknown")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("hours")}</dt>
                <dd className="font-medium">
                  {job.hours_min
                    ? `${job.hours_min}${job.hours_max && job.hours_max !== job.hours_min ? `–${job.hours_max}` : ""} ${t("hoursUnit")}`
                    : "–"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("languages")}</dt>
                <dd className="font-medium">
                  {(
                    job.language_requirements as {
                      language: string;
                      level: string;
                      required: boolean;
                    }[]
                  )
                    .map(
                      (r) =>
                        `${langName(r.language)} ${r.level}${r.required ? "" : ` (${t("optional")})`}`,
                    )
                    .join(", ") || "–"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("posted")}</dt>
                <dd className="font-medium">
                  {job.date_posted
                    ? format.dateTime(new Date(job.date_posted), { dateStyle: "medium" })
                    : "–"}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <ApplyButton
                jobId={job.id}
                url={job.apply_url}
                applied={application?.status !== undefined && application.status !== "saved"}
              />
              <MatchQuickActions jobId={job.id} feedback={feedback} />
            </div>
          </Card>

          {match && match.explanation.reasons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("why")}</CardTitle>
              </CardHeader>
              <ul className="space-y-2">
                {match.explanation.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle2 aria-hidden className="text-success mt-0.5 size-4 shrink-0" />
                    {renderMessage(tm, r)}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {match &&
            (mustGaps.length > 0 ||
              niceGaps.length > 0 ||
              match.explanation.languageGaps.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("gaps.title")}</CardTitle>
                  <p className="text-muted-foreground text-sm">{t("gaps.intro")}</p>
                </CardHeader>
                {mustGaps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t("gaps.must")}</h3>
                    <ul className="flex flex-wrap gap-2">
                      {mustGaps.map((g) => (
                        <li key={g.uri}>
                          <Badge variant={g.status === "related" ? "warning" : "destructive"}>
                            {skillLabel(g.uri, g.label)}{" "}
                            {g.status === "related" && `· ${t("gaps.related")}`}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {niceGaps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t("gaps.nice")}</h3>
                    <ul className="flex flex-wrap gap-2">
                      {niceGaps.map((g) => (
                        <li key={g.uri}>
                          <Badge variant="outline">{skillLabel(g.uri, g.label)}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {match.explanation.languageGaps.map((g) => (
                  <p key={g.language} className="text-sm">
                    {t("gaps.language", {
                      language: langName(g.language),
                      required: g.required,
                      actual: g.actual ?? "–",
                    })}
                  </p>
                ))}
              </Card>
            )}

          <Card>
            <CardHeader>
              <CardTitle>{t("description")}</CardTitle>
            </CardHeader>
            <div className="text-sm leading-relaxed whitespace-pre-line">{job.description}</div>
            {company?.description && (
              <div className="text-muted-foreground border-t pt-4 text-sm">
                <p className="text-foreground font-medium">
                  {t("about", { company: company.name })}
                </p>
                <p>{company.description}</p>
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          {match ? (
            <>
              <Card>
                <div className="flex items-baseline justify-between">
                  <CardTitle>{t("score")}</CardTitle>
                  <span className="text-primary text-3xl font-semibold tabular-nums">
                    {Math.round(match.score)}
                  </span>
                </div>
                <ComponentBreakdown components={match.components} />
                {match.limitedData && (
                  <p className="text-muted-foreground flex gap-2 text-xs">
                    <Info aria-hidden className="size-4 shrink-0" /> {tm("note.limitedData")}
                  </p>
                )}
              </Card>
              <Card>
                <CardTitle>{t("requirements")}</CardTitle>
                <ul className="space-y-3">
                  {match.knockouts.map((k) => {
                    const Icon = STATUS_ICON[k.status];
                    return (
                      <li key={k.rule} className="flex gap-2.5 text-sm">
                        <Icon
                          aria-label={t(`status.${k.status}`)}
                          className={
                            k.status === "pass"
                              ? "text-success mt-0.5 size-4 shrink-0"
                              : k.status === "fail"
                                ? "text-destructive mt-0.5 size-4 shrink-0"
                                : "text-muted-foreground mt-0.5 size-4 shrink-0"
                          }
                        />
                        <span>
                          <span className="font-medium">{tm(`rules.${k.rule}`)}</span>
                          <span className="text-muted-foreground block">
                            {renderMessage(tm, k.message)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {match.knockedOut && (
                  <p className="bg-warning/10 flex gap-2 rounded-lg p-3 text-xs">
                    <AlertTriangle aria-hidden className="size-4 shrink-0" /> {t("knockedOutNote")}
                  </p>
                )}
              </Card>
              <p className="text-muted-foreground text-xs">
                {t("audit", {
                  date: format.dateTime(new Date(match.updatedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
              </p>
            </>
          ) : (
            <Card>
              <p className="text-muted-foreground text-sm">{t("noMatch")}</p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
