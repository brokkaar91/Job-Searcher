import { PgBoss } from "pg-boss";

/** Background job names (pg-boss queues). Handlers live in worker/handlers. */
export const QUEUES = {
  candidateRefresh: "candidate-refresh", // embeddings + matches for one user
  connectorSync: "connector-sync", // fetch → raw → map → enrich → dedup → embed → match
  connectorScheduler: "connector-scheduler", // cron: enqueue due connector syncs
  jobsExpire: "jobs-expire", // cron: valid_through / not seen anymore
  retention: "retention", // cron: warn + delete inactive accounts
  matchesRecomputeAll: "matches-recompute-all", // after a new model version is activated
  jobsRecompute: "jobs-recompute", // matches for specific jobs (after manual add/moderation)
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

let bossPromise: Promise<PgBoss> | null = null;

/**
 * Producer-side pg-boss instance for the web app: no maintenance, no cron – only `send`.
 * The worker process owns schema migration, supervision and schedules.
 */
function producer(): Promise<PgBoss> {
  bossPromise ??= (async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    const boss = new PgBoss({
      connectionString,
      max: 2,
      supervise: false,
      schedule: false,
      migrate: false,
      createSchema: false,
    });
    boss.on("error", (e) => console.error("[queue]", e));
    await boss.start();
    return boss;
  })().catch((e) => {
    bossPromise = null;
    throw e;
  });
  return bossPromise;
}

/**
 * Enqueue a background job. Returns the job id, or null when the queue is unavailable
 * (e.g. the worker has never run) – callers must then fall back to inline processing.
 */
export async function enqueue(
  name: QueueName,
  data: object,
  options: { singletonKey?: string; startAfter?: number } = {},
) {
  try {
    const boss = await producer();
    return await boss.send(name, data, { retryLimit: 3, retryBackoff: true, ...options });
  } catch (e) {
    console.warn(`[queue] could not enqueue ${name}:`, (e as Error).message);
    return null;
  }
}
