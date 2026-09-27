/** Normalisation helpers used by ingestion and the de-duplication layers. Pure. */

const TITLE_NOISE =
  /\((?:m\/v\/x|m\/v|v\/m|m\/f\/d|m\/w\/d|f\/m\/x|m\/f|all genders|h\/f)\)|\b(?:m\/v\/x|m\/f\/d|m\/w\/d)\b|\b(?:vacature|vacancy|job|gezocht|wanted|urgent|nieuw|new)\b|[!*|]/gi;

export function normalizeText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTitle(title: string): string {
  const withoutHours = title.replace(
    /\b\d{1,2}\s*(?:[-–]|tot|to)\s*\d{1,2}\s*(?:uur|hours|u)\b/gi,
    " ",
  );
  return normalizeText(withoutHours.replace(TITLE_NOISE, " "))
    .replace(/\b(sr|senior)\b/g, "senior")
    .replace(/\b(jr|junior)\b/g, "junior")
    .replace(/\s+/g, " ")
    .trim();
}

const COMPANY_SUFFIX =
  /\b(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|gmbh|ltd|llc|inc|holding|group|groep|nederland|netherlands)\b\.?/gi;

export function normalizeCompanyName(name: string): string {
  return normalizeText(name.replace(COMPANY_SUFFIX, " "));
}

/** example.com from "https://www.Example.com/careers" or "jobs.example.com". */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const url = new URL(input.includes("://") ? input : `https://${input}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    // Strip common ATS / careers subdomains so jobs.example.com ≈ example.com
    return host.replace(/^(jobs|careers|werkenbij|karriere|apply)\./, "");
  } catch {
    return null;
  }
}

const TRACKING_PARAMS = /^(utm_[a-z]+|gclid|fbclid|ref|source|src|campaign|trk|mc_[a-z]+|_ga)$/i;

/** Canonical apply URL: lowercase host, no tracking params, no trailing slash, no fragment. */
export function normalizeApplyUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of [...url.searchParams.keys()])
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    const s = `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}${url.search}`;
    return s.toLowerCase();
  } catch {
    return null;
  }
}

/** Layer-3 dedup key: normalised title + company + city. */
export function dedupKey(
  title: string,
  company: string | null | undefined,
  city: string | null | undefined,
): string {
  return [
    normalizeTitle(title),
    normalizeCompanyName(company ?? ""),
    normalizeText(city ?? ""),
  ].join("|");
}
