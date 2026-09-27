import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EyeOff, PartyPopper, SearchX } from "lucide-react";
import { redirect, Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { requireCandidate } from "@/server/auth";
import { feedFiltersSchema, loadFeed } from "@/server/matches";
import { MatchCard } from "@/components/matches/match-card";
import { FeedFilters } from "@/components/matches/feed-filters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/matches">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "feed" }))("title") };
}

export default async function MatchesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/matches">) {
  const locale = await resolveLocale(params);
  const user = await requireCandidate(locale);
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .single();
  if (!profile?.onboarding_completed_at) redirect({ href: "/onboarding", locale });

  const sp = await searchParams;
  const filters = feedFiltersSchema.parse(
    Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])),
  );
  const t = await getTranslations("feed");
  const { items, hiddenCount, total, newCount } = await loadFeed(user.id, filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("summary", { count: items.length, newCount })}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/how-matching-works">{t("howScored")}</Link>
        </Button>
      </div>

      {sp.welcome && (
        <Alert variant="info">
          <PartyPopper aria-hidden />
          <AlertTitle>{t("welcome.title")}</AlertTitle>
          <AlertDescription>{t("welcome.text")}</AlertDescription>
        </Alert>
      )}

      <FeedFilters />

      {hiddenCount > 0 && !filters.hidden && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <EyeOff aria-hidden className="size-4" />
          {t("hiddenCount", { count: hiddenCount })}{" "}
          <Link
            href={{ pathname: "/matches", query: { ...sp, hidden: "1" } }}
            className="text-primary font-medium underline-offset-2 hover:underline"
          >
            {t("showAnyway")}
          </Link>
        </p>
      )}

      {items.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <SearchX aria-hidden className="text-muted-foreground size-10" />
          <h2 className="text-lg font-semibold">
            {total === 0 ? t("empty.noneTitle") : t("empty.filteredTitle")}
          </h2>
          <p className="text-muted-foreground max-w-md text-sm">
            {total === 0 ? t("empty.noneText") : t("empty.filteredText")}
          </p>
          <Button asChild variant="outline">
            <Link href={total === 0 ? "/profile" : "/matches"}>
              {total === 0 ? t("empty.editProfile") : t("empty.reset")}
            </Link>
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2" aria-label={t("listLabel")}>
          {items.map((item) => (
            <li key={item.matchId}>
              <MatchCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
