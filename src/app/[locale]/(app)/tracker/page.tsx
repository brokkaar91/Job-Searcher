import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireCandidate } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard, type TrackerCard } from "@/components/tracker/kanban-board";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tracker">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "tracker" }))("title") };
}

export default async function TrackerPage({ params }: PageProps<"/[locale]/tracker">) {
  const locale = await resolveLocale(params);
  const user = await requireCandidate(locale);
  const t = await getTranslations("tracker");
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(
      "id, job_id, status, position, notes, saved_at, applied_at, interview_at, offer_at, rejected_at, jobs(title, city, apply_url, companies(name), hiring_organization_name)",
    )
    .eq("user_id", user.id)
    .order("position");
  const cards: TrackerCard[] = (data ?? []).map((a) => ({
    id: a.id,
    jobId: a.job_id,
    status: a.status,
    notes: a.notes ?? "",
    title: a.jobs?.title ?? "–",
    company: a.jobs?.companies?.name ?? a.jobs?.hiring_organization_name ?? "",
    city: a.jobs?.city ?? null,
    applyUrl: a.jobs?.apply_url ?? null,
    dates: {
      saved: a.saved_at,
      applied: a.applied_at,
      interview: a.interview_at,
      offer: a.offer_at,
      rejected: a.rejected_at,
    },
  }));
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <KanbanBoard initial={cards} />
    </div>
  );
}
