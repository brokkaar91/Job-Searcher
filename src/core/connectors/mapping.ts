import { JSONPath } from "jsonpath-plus";
import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import { EMPLOYMENT_TYPES } from "../matching/types";
import { parseSalaryText } from "../pipeline/salary";
import type { CanonicalJob, SalaryUnit } from "./types";
import { employmentFromText, htmlToText, isoDate, remoteFromText } from "./util";

/**
 * Declarative field mapping for generic JSON/XML feeds (edited in /admin with a live preview).
 * Each canonical field takes a JSONPath relative to one feed item, an optional template
 * ("{{$.city}}, {{$.country}}"), a transform and a default.
 */
export const TRANSFORMS = [
  "none",
  "trim",
  "html_to_text",
  "lowercase",
  "number",
  "date",
  "split_comma",
  "salary_text",
  "remote_text",
  "employment_text",
  "domain",
] as const;
export type Transform = (typeof TRANSFORMS)[number];

export const fieldRuleSchema = z.object({
  path: z.string().optional(),
  template: z.string().optional(),
  transform: z.enum(TRANSFORMS).default("none"),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type FieldRule = z.infer<typeof fieldRuleSchema>;

export const MAPPABLE_FIELDS = [
  "externalId",
  "title",
  "description",
  "companyName",
  "companyDomain",
  "applyUrl",
  "city",
  "region",
  "postalCode",
  "country",
  "remotePolicy",
  "employmentTypes",
  "hoursMin",
  "hoursMax",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "salaryUnit",
  "salaryText",
  "datePosted",
  "validThrough",
  "language",
] as const;
export type MappableField = (typeof MAPPABLE_FIELDS)[number];
export const REQUIRED_FIELDS: MappableField[] = ["externalId", "title", "description"];

export const fieldMappingSchema = z.object({
  format: z.enum(["json", "xml"]),
  /** JSONPath to the array of items in the (parsed) document, e.g. "$.jobs[*]" or "$.feed.job[*]". */
  itemsPath: z.string().min(1),
  fields: z.partialRecord(z.enum(MAPPABLE_FIELDS), fieldRuleSchema),
});
export type FieldMapping = z.infer<typeof fieldMappingSchema>;

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "attr_",
  parseTagValue: false,
  trimValues: true,
});

export function parseFeed(body: string, format: "json" | "xml"): unknown {
  return format === "json" ? JSON.parse(body) : xml.parse(body);
}

export function extractItems(doc: unknown, itemsPath: string): unknown[] {
  const found = JSONPath({ path: itemsPath, json: doc as object, wrap: true }) as unknown[];
  // "$.jobs" pointing at an array → use the array itself
  if (found.length === 1 && Array.isArray(found[0])) return found[0] as unknown[];
  return found;
}

function first(item: unknown, path: string): unknown {
  const r = JSONPath({
    path: path.startsWith("$") ? path : `$.${path}`,
    json: item as object,
    wrap: true,
  }) as unknown[];
  return r.length === 0 ? undefined : r.length === 1 ? r[0] : r;
}

function scalar(v: unknown): unknown {
  if (v && typeof v === "object" && !Array.isArray(v) && "#text" in (v as Record<string, unknown>))
    return (v as Record<string, unknown>)["#text"];
  return v;
}

function applyTransform(v: unknown, t: Transform): unknown {
  if (v == null) return v;
  const s = Array.isArray(v) ? v.map((x) => String(scalar(x))).join(", ") : String(scalar(v));
  switch (t) {
    case "none":
      return Array.isArray(v) ? v.map(scalar) : scalar(v);
    case "trim":
      return s.trim();
    case "html_to_text":
      return htmlToText(s);
    case "lowercase":
      return s.toLowerCase().trim();
    case "number": {
      const n = Number(s.replace(/[^\d.,-]/g, "").replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    case "date":
      return isoDate(s);
    case "split_comma":
      return s
        .split(/[,;|]/)
        .map((x) => x.trim())
        .filter(Boolean);
    case "salary_text":
      return s;
    case "remote_text":
      return remoteFromText(s);
    case "employment_text":
      return employmentFromText(s);
    case "domain":
      return (
        s
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .split("/")[0]
          ?.toLowerCase() ?? null
      );
  }
}

export function evalRule(item: unknown, rule: FieldRule): unknown {
  let v: unknown;
  if (rule.template) {
    v = rule.template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p: string) => {
      const x = scalar(first(item, p));
      return x == null ? "" : String(x);
    });
    if (typeof v === "string" && !v.trim()) v = undefined;
  } else if (rule.path) {
    v = first(item, rule.path);
  }
  v = applyTransform(v, rule.transform);
  if ((v == null || v === "") && rule.default !== undefined) v = rule.default;
  return v;
}

export interface MapResult {
  job: CanonicalJob | null;
  values: Partial<Record<MappableField, unknown>>;
  errors: string[];
}

const str = (v: unknown) => (v == null || v === "" ? null : String(v));
const num = (v: unknown) =>
  v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null;

/** Map one feed item with a mapping. Used by the generic connector AND the admin preview. */
export function mapRecord(item: unknown, mapping: FieldMapping): MapResult {
  const values: Partial<Record<MappableField, unknown>> = {};
  const errors: string[] = [];
  for (const field of MAPPABLE_FIELDS) {
    const rule = mapping.fields[field];
    if (!rule) continue;
    try {
      values[field] = evalRule(item, rule);
    } catch (e) {
      errors.push(`${field}: ${(e as Error).message}`);
    }
  }
  for (const f of REQUIRED_FIELDS)
    if (values[f] == null || values[f] === "") errors.push(`${f}: required field is empty`);
  if (errors.length) return { job: null, values, errors };

  const employment = Array.isArray(values.employmentTypes)
    ? (values.employmentTypes as string[]).flatMap((x) =>
        (EMPLOYMENT_TYPES as readonly string[]).includes(x) ? [x] : employmentFromText(x),
      )
    : employmentFromText(str(values.employmentTypes));
  const salaryText = str(values.salaryText);
  const parsedText = salaryText ? parseSalaryText(salaryText) : null;
  const salaryMin = num(values.salaryMin) ?? parsedText?.min ?? null;
  const salaryMax = num(values.salaryMax) ?? parsedText?.max ?? null;
  const unit = str(values.salaryUnit)?.toLowerCase();
  const remote = str(values.remotePolicy);

  return {
    values,
    errors,
    job: {
      externalId: String(values.externalId),
      title: String(values.title).trim(),
      description: htmlToText(String(values.description)),
      companyName: str(values.companyName),
      companyDomain: str(values.companyDomain),
      applyUrl: str(values.applyUrl),
      sourceUrl: str(values.applyUrl),
      city: str(values.city),
      region: str(values.region),
      postalCode: str(values.postalCode),
      country: str(values.country)?.toUpperCase().slice(0, 2) ?? null,
      remotePolicy:
        remote === "onsite" || remote === "hybrid" || remote === "remote"
          ? remote
          : remoteFromText(remote),
      employmentTypes: [...new Set(employment)] as CanonicalJob["employmentTypes"],
      hoursMin: num(values.hoursMin),
      hoursMax: num(values.hoursMax),
      salary:
        salaryMin != null || salaryMax != null
          ? {
              min: salaryMin,
              max: salaryMax,
              currency: str(values.salaryCurrency) ?? "EUR",
              unit: (["hour", "day", "week", "month", "year"].includes(unit ?? "")
                ? unit
                : (parsedText?.unit ?? null)) as SalaryUnit | null,
              text: salaryText,
            }
          : null,
      datePosted: isoDate(values.datePosted)?.slice(0, 10) ?? null,
      validThrough: isoDate(values.validThrough),
      language: str(values.language)?.slice(0, 2).toLowerCase() ?? null,
    },
  };
}

/** Suggest a mapping from a sample item by matching common field names (helps admins start). */
export function suggestMapping(
  sample: Record<string, unknown>,
  format: "json" | "xml",
  itemsPath: string,
): FieldMapping {
  const keys = Object.keys(sample);
  const find = (...cands: string[]) =>
    keys.find((k) => cands.includes(k.toLowerCase().replace(/[-_\s]/g, "")));
  const rule = (k: string | undefined, transform: Transform = "none"): FieldRule | undefined =>
    k ? { path: `$.${k.includes(" ") || k.includes("-") ? `['${k}']` : k}`, transform } : undefined;
  const fields: FieldMapping["fields"] = {
    externalId: rule(find("id", "jobid", "externalid", "reference", "guid", "vacancyid")),
    title: rule(find("title", "jobtitle", "name", "functie", "position"), "trim"),
    description: rule(
      find("description", "body", "content", "omschrijving", "text"),
      "html_to_text",
    ),
    companyName: rule(
      find("company", "companyname", "employer", "organisation", "organization", "werkgever"),
    ),
    applyUrl: rule(find("url", "applyurl", "link", "joburl")),
    city: rule(find("city", "location", "plaats", "stad", "locatie")),
    salaryText: rule(find("salary", "salaris", "compensation")),
    employmentTypes: rule(
      find("employmenttype", "type", "contracttype", "dienstverband"),
      "employment_text",
    ),
    datePosted: rule(
      find("date", "dateposted", "published", "publicationdate", "created", "createdat"),
      "date",
    ),
  };
  return {
    format,
    itemsPath,
    fields: Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v),
    ) as FieldMapping["fields"],
  };
}
