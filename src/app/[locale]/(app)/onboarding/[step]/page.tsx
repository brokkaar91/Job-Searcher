import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireCandidate } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { localizedSkillLabels } from "@/server/esco-labels";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { candidatePreferencesSchema, parseWorkValueRanking } from "@/server/matching/mappers";
import { CvStep } from "@/components/onboarding/cv-step";
import { ReviewStep } from "@/components/onboarding/review-step";
import { StatusStep } from "@/components/onboarding/status-step";
import { PreferencesStep } from "@/components/onboarding/preferences-step";
import { InterestsStep } from "@/components/onboarding/interests-step";
import { ValuesStep } from "@/components/onboarding/values-step";
import { WORK_VALUES } from "@/core/matching/types";
import { ONBOARDING_STEPS, VISIBLE_STEP, VISIBLE_STEP_COUNT, isStep } from "../steps";

export default async function OnboardingStepPage({
  params,
}: PageProps<"/[locale]/onboarding/[step]">) {
  const locale = await resolveLocale(params);
  const { step } = await params;
  if (!isStep(step)) notFound();
  const user = await requireCandidate(locale);
  const t = await getTranslations("onboarding");
  const supabase = await createClient();

  const idx = ONBOARDING_STEPS.indexOf(step);
  const visible = VISIBLE_STEP[step];
  const minutesLeft = [9, 7, 6, 4, 3, 1][idx] ?? 1;

  let body: React.ReactNode = null;
  if (step === "cv") {
    const { data: cvs } = await supabase
      .from("cv_files")
      .select("file_name, created_at")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1);
    body = <CvStep lastFile={cvs?.[0]?.file_name ?? null} />;
  } else if (step === "review") {
    const [{ data: skills }, { data: experiences }, { data: profile }, { data: cv }] =
      await Promise.all([
        supabase
          .from("candidate_skills")
          .select("esco_uri, label, last_used_year, confirmed")
          .eq("user_id", user.id)
          .order("created_at"),
        supabase
          .from("candidate_experiences")
          .select("*")
          .eq("user_id", user.id)
          .order("sort_order"),
        supabase
          .from("candidate_profiles")
          .select("education_level")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("cv_files")
          .select("parse_status")
          .eq("user_id", user.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
    const labels = await localizedSkillLabels(
      supabase,
      (skills ?? []).map((s) => s.esco_uri),
      locale,
    );
    body = (
      <ReviewStep
        fromCv={cv?.parse_status === "parsed"}
        initial={{
          skills: (skills ?? []).map((s) => ({
            escoUri: s.esco_uri,
            label: (s.esco_uri && labels.get(s.esco_uri)) || s.label,
            lastUsedYear: s.last_used_year,
          })),
          experiences: (experiences ?? []).map((e) => ({
            title: e.title,
            organisation: e.organisation,
            startDate: e.start_date?.slice(0, 7) ?? null,
            endDate: e.end_date?.slice(0, 7) ?? null,
            isCurrent: e.is_current,
            description: e.description ?? "",
            escoOccupationUri: e.esco_occupation_uri,
            iscoCode: e.isco_code,
          })),
          educationLevel: profile?.education_level ?? null,
        }}
      />
    );
  } else if (step === "status") {
    const { data: languages } = await supabase
      .from("candidate_languages")
      .select("language, level")
      .eq("user_id", user.id);
    body = (
      <StatusStep
        initial={{
          languages: languages ?? [],
        }}
      />
    );
  } else if (step === "preferences") {
    const [{ data: profile }, { data: cities }] = await Promise.all([
      supabase.from("candidate_profiles").select("preferences").eq("user_id", user.id).single(),
      supabase.from("city_locations").select("name, lat, lng").order("name"),
    ]);
    const prefs = candidatePreferencesSchema.safeParse(profile?.preferences ?? {});
    body = (
      <PreferencesStep
        initial={prefs.success ? prefs.data : candidatePreferencesSchema.parse({})}
        cities={cities ?? []}
      />
    );
  } else if (step === "interests") {
    const { data } = await supabase
      .from("candidate_profiles")
      .select("riasec_answers")
      .eq("user_id", user.id)
      .single();
    body = (
      <InterestsStep initial={(data?.riasec_answers as Record<string, number> | null) ?? {}} />
    );
  } else {
    const { data } = await supabase
      .from("candidate_profiles")
      .select("work_values")
      .eq("user_id", user.id)
      .single();
    body = <ValuesStep initial={parseWorkValueRanking(data?.work_values) ?? [...WORK_VALUES]} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <div className="text-muted-foreground flex items-baseline justify-between text-sm">
          <span>{t("stepOf", { current: visible, total: VISIBLE_STEP_COUNT })}</span>
          <span>{t("minutesLeft", { minutes: minutesLeft })}</span>
        </div>
        <Progress value={(idx / ONBOARDING_STEPS.length) * 100} aria-label={t("progress")} />
        <ol className="hidden grid-cols-5 gap-2 pt-1 sm:grid" aria-label={t("progress")}>
          {(["cv", "status", "preferences", "interests", "values"] as const).map((k, i) => {
            const n = i + 1;
            const state = n < visible ? "done" : n === visible ? "current" : "todo";
            return (
              <li
                key={k}
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  state === "todo" ? "text-muted-foreground" : "text-foreground font-medium",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                    state === "done" && "bg-primary border-primary text-primary-foreground",
                    state === "current" && "border-primary text-primary ring-primary/20 ring-4",
                  )}
                >
                  {state === "done" ? <Check aria-hidden className="size-3.5" /> : n}
                </span>
                <span className="truncate">{t(`stepNames.${k}`)}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t(`${step}.title`)}</h1>
        <p className="text-muted-foreground">{t(`${step}.subtitle`)}</p>
      </div>
      {body}
    </div>
  );
}
