import { z } from "zod";
import type { AdminClient } from "@/lib/supabase/admin";
import { createMailer } from "@/core/providers/mailer";
import { QUEUES } from "@/server/queue";
import { embedCandidate } from "@/server/candidate";
import { recomputeMatchesForJobs, recomputeMatchesForUser } from "@/server/matching/service";
import { getActiveModel } from "@/server/model";
import { runConnectorSync } from "@/server/pipeline/sync";
import { expireJobs, runRetention, scheduleDueConnectors } from "@/server/pipeline/maintenance";

type Handler = (admin: AdminClient, data: Record<string, unknown>) => Promise<unknown>;

const uuid = z.uuid();

export const handlers: Record<string, Handler> = {
  [QUEUES.candidateRefresh]: async (admin, data) => {
    const userId = uuid.parse(data.userId);
    await embedCandidate(admin, userId);
    const results = await recomputeMatchesForUser(admin, userId);
    return { matches: results.length };
  },

  [QUEUES.connectorSync]: async (admin, data) => {
    const connectorId = uuid.parse(data.connectorId);
    const r = await runConnectorSync(admin, connectorId, {
      trigger: data.trigger === "manual" ? "manual" : "schedule",
      triggeredBy: typeof data.triggeredBy === "string" ? data.triggeredBy : null,
    });
    return { status: r.status, counts: r.counts };
  },

  [QUEUES.connectorScheduler]: async (admin) => ({ enqueued: await scheduleDueConnectors(admin) }),

  [QUEUES.jobsExpire]: async (admin) => ({ expired: await expireJobs(admin) }),

  [QUEUES.jobsRecompute]: async (admin, data) => {
    const ids = z.array(uuid).parse(data.jobIds);
    return { users: await recomputeMatchesForJobs(admin, ids) };
  },

  [QUEUES.matchesRecomputeAll]: async (admin) => {
    const model = await getActiveModel(admin);
    const { data } = await admin
      .from("candidate_profiles")
      .select("user_id")
      .not("onboarding_completed_at", "is", null);
    for (const u of data ?? []) await recomputeMatchesForUser(admin, u.user_id, { model });
    return { users: data?.length ?? 0, model: model.version };
  },

  [QUEUES.retention]: async (admin) =>
    runRetention(admin, createMailer(), {
      months: Number(process.env.RETENTION_INACTIVE_MONTHS ?? 12),
      warningDays: Number(process.env.RETENTION_WARNING_DAYS ?? 30),
    }),
};
