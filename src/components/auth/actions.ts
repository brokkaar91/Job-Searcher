"use server";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { POLICY_VERSION, getUser } from "@/server/auth";
import { localePath, siteUrl } from "@/server/site-url";
import { redirect } from "@/i18n/navigation";

export type AuthState = {
  status: "idle" | "sent" | "error";
  error?: "invalid" | "consent" | "noAccount" | "failed";
};

const schema = z.object({
  email: z.email(),
  mode: z.enum(["login", "register"]),
  terms: z.literal("on").optional(),
  ai: z.literal("on").optional(),
  next: z.string().optional(),
});

export async function sendMagicLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", error: "invalid" };
  const { email, mode, terms, ai, next } = parsed.data;
  if (mode === "register" && (!terms || !ai)) return { status: "error", error: "consent" };

  const locale = await getLocale();
  const target =
    next?.startsWith("/") && !next.startsWith("//") ? next : localePath(locale, "/matches");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: mode === "register",
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(target)}`,
      // Applied only when the account is created: the signup trigger stores these consents.
      data:
        mode === "register"
          ? {
              locale,
              policy_version: POLICY_VERSION,
              consents: { terms_privacy: true, ai_processing: true },
            }
          : undefined,
    },
  });
  if (error) {
    const noAccount = /signups not allowed|user not found/i.test(error.message);
    return { status: "error", error: noAccount ? "noAccount" : "failed" };
  }
  return { status: "sent" };
}

const consentSchema = z.object({ terms: z.literal("on"), ai: z.literal("on") });

export async function giveConsent(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getUser();
  if (!user) return { status: "error", error: "failed" };
  if (!consentSchema.safeParse(Object.fromEntries(formData)).success)
    return { status: "error", error: "consent" };
  const supabase = await createClient();
  const { error } = await supabase.from("consents").insert([
    { user_id: user.id, type: "terms_privacy", granted: true, policy_version: POLICY_VERSION },
    { user_id: user.id, type: "ai_processing", granted: true, policy_version: POLICY_VERSION },
  ]);
  if (error) return { status: "error", error: "failed" };
  redirect({ href: "/onboarding", locale: await getLocale() });
  return { status: "idle" };
}
