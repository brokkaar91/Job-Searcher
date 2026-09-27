import { adzunaConnector } from "./adzuna";
import { genericFeedConnector } from "./generic-feed";
import { greenhouseConnector } from "./greenhouse";
import { leverConnector } from "./lever";
import { personioConnector } from "./personio";
import { recruiteeConnector } from "./recruitee";
import type { Connector, ConnectorContext, ConnectorDefinition } from "./types";

export * from "./types";

export const CONNECTORS = {
  adzuna: adzunaConnector,
  greenhouse: greenhouseConnector,
  lever: leverConnector,
  recruitee: recruiteeConnector,
  personio: personioConnector,
  generic_feed: genericFeedConnector,
} as const;

export type ConnectorType = keyof typeof CONNECTORS;

export function getDefinition(type: string): ConnectorDefinition<unknown> {
  const def = (CONNECTORS as Record<string, ConnectorDefinition<unknown>>)[type];
  if (!def) throw new Error(`Unknown connector type "${type}"`);
  return def;
}

/** Bind a connector definition to its config/credentials: the SDK's fetch/map/healthcheck. */
export function createConnector(
  type: string,
  opts: {
    config: Record<string, unknown>;
    credentials?: Record<string, string>;
    fetch?: typeof fetch;
    now?: Date;
    log?: (m: string) => void;
  },
): Connector<unknown> {
  const definition = getDefinition(type);
  const ctx: ConnectorContext = {
    config: definition.configSchema.parse(opts.config),
    credentials: definition.credentialsSchema.parse(opts.credentials ?? {}),
    fetch: opts.fetch ?? globalThis.fetch,
    now: opts.now ?? new Date(),
    log: opts.log ?? (() => {}),
  };
  return {
    definition,
    fetch: (since) => definition.fetch(since, ctx),
    map: (raw) => definition.map(raw, ctx),
    externalId: (raw) => definition.externalId(raw),
    healthcheck: () => definition.healthcheck(ctx),
  };
}
