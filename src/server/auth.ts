import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export const REQUIRED_CONSENTS = ["terms_privacy", "ai_processing"] as const;
export const POLICY_VERSION = "2026-09";

/** Current user (verified with the auth server), cached per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, role, locale")
    .eq("id", user.id)
    .single();
  return data;
});

export async function requireUser(locale: Locale, next?: string) {
  const user = await getUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: next ? { next } : {} }, locale });
    throw new Error("unreachable");
  }
  return user;
}

/** Admin guard – call in the admin layout AND in every admin action/route (layouts are not a boundary). */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") notFound();
  return profile;
}

export async function hasRequiredConsents(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("current_consents")
    .select("type, granted")
    .eq("user_id", userId);
  return REQUIRED_CONSENTS.every((t) => data?.some((c) => c.type === t && c.granted));
}
