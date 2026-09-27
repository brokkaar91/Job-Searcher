import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

export default async function MatchesPage({ params }: PageProps<"/[locale]/matches">) {
  const locale = await resolveLocale(params);
  const user = await requireUser(locale);
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .single();
  if (!profile?.onboarding_completed_at) redirect({ href: "/onboarding", locale });
  const { count } = await supabase.from("matches").select("id", { count: "exact", head: true });
  return <h1 className="text-3xl font-semibold">Matches: {count}</h1>;
}
