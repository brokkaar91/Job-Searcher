import type { z } from "zod";
import type { EmploymentType, RemotePolicy } from "../matching/types";

/**
 * Canonical job produced by every connector's `map()`. Loosely follows schema.org JobPosting;
 * enrichment (ESCO, languages, sponsorship, …) happens later in the pipeline.
 */
export interface CanonicalJob {
  externalId: string;
  title: string;
  /** Plain text (HTML stripped). */
  description: string;
  companyName: string | null;
  companyDomain?: string | null;
  applyUrl?: string | null;
  sourceUrl?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null; // ISO 3166-1 alpha-2
  lat?: number | null;
  lng?: number | null;
  remotePolicy?: RemotePolicy | null;
  employmentTypes: EmploymentType[];
  hoursMin?: number | null;
  hoursMax?: number | null;
  salary?: RawSalary | null;
  datePosted?: string | null; // ISO date
  validThrough?: string | null; // ISO datetime
  language?: string | null; // ISO 639-1 if the source states it
}

export type SalaryUnit = "hour" | "day" | "week" | "month" | "year";

export interface RawSalary {
  min?: number | null;
  max?: number | null;
  currency?: string | null;
  unit?: SalaryUnit | null;
  text?: string | null;
  isEstimate?: boolean;
}

export interface HealthResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface ConnectorContext {
  config: Record<string, unknown>;
  credentials: Record<string, string>;
  fetch: typeof fetch;
  now: Date;
  log: (msg: string) => void;
}

/**
 * Connector SDK – fixed interface. `fetch(since)` streams raw records (only records changed
 * since `since` where the source supports it), `map(raw)` converts one raw record to a
 * CanonicalJob, `healthcheck()` verifies credentials/config without importing anything.
 */
export interface ConnectorDefinition<Raw = unknown> {
  type: string;
  displayName: string;
  configSchema: z.ZodType<Record<string, unknown>>;
  credentialsSchema: z.ZodType<Record<string, string>>;
  fetch(since: Date | null, ctx: ConnectorContext): AsyncIterable<Raw>;
  externalId(raw: Raw): string;
  map(raw: Raw, ctx: ConnectorContext): CanonicalJob;
  healthcheck(ctx: ConnectorContext): Promise<HealthResult>;
}

/** A connector bound to its context: the three SDK methods from the spec. */
export interface Connector<Raw = unknown> {
  definition: ConnectorDefinition<Raw>;
  fetch(since: Date | null): AsyncIterable<Raw>;
  map(raw: Raw): CanonicalJob;
  externalId(raw: Raw): string;
  healthcheck(): Promise<HealthResult>;
}

export class ConnectorError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}
