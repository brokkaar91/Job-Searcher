import type { EmploymentType, RemotePolicy } from "../matching/types";
import { ConnectorError, type ConnectorContext } from "./types";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  euro: "€",
  rsquo: "’",
  lsquo: "‘",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code =
        e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML → readable plain text (block elements become newlines, list items bullets). */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  const decodedOnce = /&lt;\s*\/?\s*[a-z]/i.test(html) ? decodeEntities(html) : html; // Greenhouse double-encodes
  return decodeEntities(
    decodedOnce
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|ul|ol|section|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function remoteFromText(s: string | null | undefined): RemotePolicy | null {
  if (!s) return null;
  if (/hybrid|hybride/i.test(s)) return "hybrid";
  if (/remote|thuiswerk|work from home|wfh|anywhere/i.test(s)) return "remote";
  if (/on[- ]?site|office|kantoor|op locatie/i.test(s)) return "onsite";
  return null;
}

export function employmentFromText(s: string | null | undefined): EmploymentType[] {
  if (!s) return [];
  const out = new Set<EmploymentType>();
  if (/full[\s_-]?time|fulltime|voltijd/i.test(s)) out.add("full_time");
  if (/part[\s_-]?time|parttime|deeltijd/i.test(s)) out.add("part_time");
  if (/freelance|zzp|contractor|interim/i.test(s)) out.add("freelance");
  if (/intern(ship)?|stage|trainee/i.test(s)) out.add("internship");
  if (/temporary|temp\b|tijdelijk|fixed[- ]term/i.test(s)) out.add("temporary");
  if (/\bcontract\b/i.test(s) && !out.has("freelance")) out.add("contract");
  return [...out];
}

export function isoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function getJson<T>(
  ctx: ConnectorContext,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await ctx.fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": "JobMatchBot/1.0 (+https://jobmatch.example)",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new ConnectorError(`GET ${redact(url)} → HTTP ${res.status}`, res.status);
  return (await res.json()) as T;
}

export async function getText(ctx: ConnectorContext, url: string): Promise<string> {
  const res = await ctx.fetch(url, {
    headers: { "user-agent": "JobMatchBot/1.0 (+https://jobmatch.example)" },
  });
  if (!res.ok) throw new ConnectorError(`GET ${redact(url)} → HTTP ${res.status}`, res.status);
  return res.text();
}

/** Never log credentials that live in query strings. */
export function redact(url: string): string {
  return url.replace(/([?&](?:app_key|app_id|api_key|key|token|secret)=)[^&]+/gi, "$1***");
}
