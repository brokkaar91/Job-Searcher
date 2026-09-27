import "server-only";
import { headers } from "next/headers";

/** Absolute site origin for auth redirects (env first, then the request host). */
export async function siteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function localePath(locale: string, path: string): string {
  return locale === "nl" ? path : `/${locale}${path}`;
}
