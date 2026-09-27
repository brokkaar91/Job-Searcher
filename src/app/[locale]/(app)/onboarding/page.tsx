import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { ONBOARDING_STEPS } from "./steps";

/** Resume onboarding where the user left off (progress is saved after every step). */
export default async function OnboardingIndex({
  params,
  searchParams,
}: PageProps<"/[locale]/onboarding">) {
  const locale = await resolveLocale(params);
  const user = await requireUser(locale);
  const { restart } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_profiles")
    .select("onboarding_step")
    .eq("user_id", user.id)
    .single();
  const index = restart ? 0 : Math.min(data?.onboarding_step ?? 0, ONBOARDING_STEPS.length - 1);
  redirect({ href: `/onboarding/${ONBOARDING_STEPS[index]}`, locale });
}
