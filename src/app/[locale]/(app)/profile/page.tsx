import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RotateCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireCandidate } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { localizedSkillLabels } from "@/server/esco-labels";
import {
  candidatePreferencesSchema,
  parseRiasec,
  parseWorkValueRanking,
} from "@/server/matching/mappers";
import { hollandCode } from "@/core/matching/riasec";
import { RIASEC_KEYS, WORK_VALUES } from "@/core/matching/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CvVersions } from "@/components/profile/cv-versions";
import { ReviewStep } from "@/components/onboarding/review-step";
import { StatusStep } from "@/components/onboarding/status-step";
import { PreferencesStep } from "@/components/onboarding/preferences-step";
import { ValuesStep } from "@/components/onboarding/values-step";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/profile">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "profile" }))("title") };
}

export default async function ProfilePage({ params }: PageProps<"/[locale]/profile">) {
  const locale = await resolveLocale(params);
  const user = await requireCandidate(locale);
  const t = await getTranslations("profile");
  const supabase = await createClient();
  const [
    { data: profile },
    { data: cvs },
    { data: skills },
    { data: experiences },
    { data: languages },
    { data: cities },
  ] = await Promise.all([
    supabase.from("candidate_profiles").select("*").eq("user_id", user.id).single(),
    supabase
      .from("cv_files")
      .select("id, version, file_name, created_at, parse_status")
      .eq("user_id", user.id)
      .order("version", { ascending: false }),
    supabase
      .from("candidate_skills")
      .select("esco_uri, label, last_used_year")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase.from("candidate_experiences").select("*").eq("user_id", user.id).order("sort_order"),
    supabase.from("candidate_languages").select("language, level").eq("user_id", user.id),
    supabase.from("city_locations").select("name, lat, lng").order("name"),
  ]);
  const labels = await localizedSkillLabels(
    supabase,
    (skills ?? []).map((s) => s.esco_uri),
    locale,
  );
  const prefs = candidatePreferencesSchema.safeParse(profile?.preferences ?? {});
  const riasec = parseRiasec(profile?.riasec);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={{ pathname: "/onboarding", query: { restart: "1" } }}>
            <RotateCcw aria-hidden /> {t("redo")}
          </Link>
        </Button>
      </div>
      <Tabs defaultValue="skills">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            {(["skills", "cv", "status", "preferences", "interests"] as const).map((k) => (
              <TabsTrigger key={k} value={k}>
                {t(`tabs.${k}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="skills">
          <ReviewStep
            mode="profile"
            fromCv={false}
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
        </TabsContent>
        <TabsContent value="cv">
          <CvVersions
            versions={(cvs ?? []).map((c) => ({
              id: c.id,
              version: c.version,
              fileName: c.file_name,
              createdAt: c.created_at,
              status: c.parse_status,
              current: c.id === profile?.current_cv_id,
            }))}
          />
        </TabsContent>
        <TabsContent value="status">
          <StatusStep
            mode="profile"
            initial={{
              languages: languages ?? [],
            }}
          />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesStep
            mode="profile"
            initial={prefs.success ? prefs.data : candidatePreferencesSchema.parse({})}
            cities={cities ?? []}
          />
        </TabsContent>
        <TabsContent value="interests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("interests.title")}</CardTitle>
              <CardDescription>
                {riasec
                  ? t("interests.code", { code: hollandCode(riasec).join("") })
                  : t("interests.none")}
              </CardDescription>
            </CardHeader>
            {riasec && (
              <ul className="space-y-2">
                {RIASEC_KEYS.map((k) => (
                  <li
                    key={k}
                    className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm"
                  >
                    <span>{t(`interests.types.${k}`)}</span>
                    <span className="bg-muted h-2 overflow-hidden rounded-full">
                      <span
                        className="bg-primary block h-full rounded-full"
                        style={{ width: `${Math.round(riasec[k] * 100)}%` }}
                      />
                    </span>
                    <span className="text-right tabular-nums">{Math.round(riasec[k] * 100)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" className="self-start">
              <Link href="/onboarding/interests">{t("interests.retake")}</Link>
            </Button>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("values.title")}</CardTitle>
              <CardDescription>{t("values.help")}</CardDescription>
            </CardHeader>
            <ValuesStep
              mode="profile"
              initial={parseWorkValueRanking(profile?.work_values) ?? [...WORK_VALUES]}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
