/**
 * JobMatch background worker (pg-boss). Run with `pnpm worker`.
 * Owns: pg-boss schema migrations, cron schedules and all job handlers.
 */
import "../scripts/_env";
import { PgBoss } from "pg-boss";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUEUES } from "@/server/queue";
import { handlers } from "./handlers";

const SCHEDULES: [string, string][] = [
  [QUEUES.connectorScheduler, "*/5 * * * *"], // check which connectors are due
  [QUEUES.jobsExpire, "17 * * * *"], // hourly
  [QUEUES.retention, "15 3 * * *"], // daily 03:15 (Europe/Amsterdam)
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for the worker");
  const boss = new PgBoss({ connectionString, max: 5 });
  boss.on("error", (e) => console.error("[worker] pg-boss error", e));
  await boss.start();

  const admin = createAdminClient();
  for (const name of Object.values(QUEUES)) await boss.createQueue(name).catch(() => {});
  for (const [name, cron] of SCHEDULES)
    await boss.schedule(name, cron, {}, { tz: "Europe/Amsterdam" });

  for (const [name, handler] of Object.entries(handlers)) {
    await boss.work<Record<string, unknown>>(name, { batchSize: 1 }, async ([job]) => {
      if (!job) return;
      const t0 = Date.now();
      try {
        const result = await handler(admin, job.data ?? {});
        console.info(`[worker] ${name} ${job.id} ok in ${Date.now() - t0}ms`, result ?? "");
        return result;
      } catch (e) {
        console.error(`[worker] ${name} ${job.id} failed`, e);
        throw e; // pg-boss retries with backoff
      }
    });
  }
  console.info(`[worker] started – queues: ${Object.keys(handlers).join(", ")}`);

  const stop = async () => {
    console.info("[worker] stopping…");
    await boss.stop({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
