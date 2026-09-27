"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { POLICY_VERSION, getUser } from "@/server/auth";
import { deleteUserCompletely } from "@/server/account";
import { writeAudit } from "@/server/audit";

const consentSchema = z.object({
  type: z.enum(["terms_privacy", "ai_processing", "employer_sharing", "marketing"]),
  granted: z.boolean(),
});

export async function setConsent(input: z.input<typeof consentSchema>) {
  const { type, granted } = consentSchema.parse(input);
  const user = await getUser();
  if (!user) throw new Error("not authenticated");
  const supabase = await createClient();
  const { error } = await supabase
    .from("consents")
    .insert({ user_id: user.id, type, granted, policy_version: POLICY_VERSION });
  if (error) throw new Error(error.message);
  // Withdrawing consent for automated processing stops matching and removes computed matches.
  if (type === "ai_processing" && !granted) {
    const admin = createAdminClient();
    await admin.from("matches").delete().eq("user_id", user.id);
    await admin
      .from("candidate_profiles")
      .update({ onboarding_completed_at: null })
      .eq("user_id", user.id);
  }
  await writeAudit(createAdminClient(), {
    actorId: user.id,
    actorRole: "user",
    action: "consent.update",
    entityType: "user",
    entityId: user.id,
    metadata: { type, granted },
  });
  revalidatePath("/[locale]/privacy-center", "page");
}

export async function deleteAccount(confirmation: string) {
  const user = await getUser();
  if (!user) throw new Error("not authenticated");
  if (!["VERWIJDER", "DELETE"].includes(confirmation.trim().toUpperCase()))
    return { ok: false as const };
  await deleteUserCompletely(createAdminClient(), user.id, "user");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: { pathname: "/", query: { deleted: "1" } }, locale: await getLocale() });
  return { ok: true as const };
}
