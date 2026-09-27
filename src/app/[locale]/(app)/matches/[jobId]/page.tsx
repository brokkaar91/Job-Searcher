import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock,
  Info,
  Languages,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireCandidate } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { shortLabel } from "@/core/matching/explain";
import { loadMatchDetail } from "@/server/matches";
import { renderMessage } from "@/lib/messages";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreRing } from "@/components/magic/score-ring";
import { CompanyAvatar } from "@/components/matches/company-avatar";
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link href="/matches" className="hover:text-foreground transition-colors">
              {t("back")}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{job.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card className="relative overflow-hidden">
            <div aria-hidden className="bg-brand-gradient absolute inset-x-0 top-0 h-1" />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                <CompanyAvatar
                  name={company?.name ?? job.hiring_organization_name}
                  className="size-14 rounded-2xl text-base"
                />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">
                    {company?.name ?? job.hiring_organization_name}
                  </p>
                  <h1 className="text-2xl font-semibold sm:text-3xl">{job.title}</h1>
                </div>
              </div>
              {match && <LabelBadge label={match.label} score={match.score} />}
            </div>
            <JobBadges remotePolicy={job.remote_policy} language={job.language} city={job.city} />
            <dl className="bg-muted/50 grid grid-cols-2 gap-4 rounded-xl p-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Wallet aria-hidden className="size-3.5" /> {t("salary")}
                </dt>
                <dd className="font-medium">
                  {job.salary_min_month && job.salary_max_month
                    ? `${eur(job.salary_min_month)} – ${eur(job.salary_max_month)}`
                    : tf("salaryUnknown")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Clock aria-hidden className="size-3.5" /> {t("hours")}
                </dt>
                <dd className="font-medium">
                  {job.hours_min
                    ? `${job.hours_min}${job.hours_max && job.hours_max !== job.hours_min ? `–${job.hours_max}` : ""} ${t("hoursUnit")}`
                    : "–"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Languages aria-hidden className="size-3.5" /> {t("languages")}
                </dt>
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
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays aria-hidden className="size-3.5" /> {t("posted")}
                </dt>
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

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {match ? (
            <>
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle>{t("score")}</CardTitle>
                    <LabelBadge label={match.label} />
                  </div>
                  <ScoreRing
                    score={match.score}
                    size={84}
                    stroke={7}
                    className="[&>span]:text-xl"
                    label={tf("scoreAria", { score: Math.round(match.score) })}
                  />
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
                        <Tooltip>
                          <TooltipTrigger
                            aria-label={t(`status.${k.status}`)}
                            className="focus-visible:ring-ring mt-0.5 h-fit shrink-0 rounded-full focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <Icon
                              aria-hidden
                              className={
                                k.status === "pass"
                                  ? "text-success size-4"
                                  : k.status === "fail"
                                    ? "text-destructive size-4"
                                    : "text-muted-foreground size-4"
                              }
                            />
                          </TooltipTrigger>
                          <TooltipContent>{t(`status.${k.status}`)}</TooltipContent>
                        </Tooltip>
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
