import type { AdminClient } from "@/lib/supabase/admin";
import type { Mailer } from "@/core/providers/mailer";
import { writeAudit } from "../audit";
import { deleteUserCompletely } from "../account";
import { enqueue, QUEUES } from "../queue";

/** Expire jobs past valid_through, or not seen for 45 days (non-snapshot sources). */
export async function expireJobs(admin: AdminClient, now = new Date()): Promise<number> {
  const nowIso = now.toISOString();
  const stale = new Date(now.getTime() - 45 * 86_400_000).toISOString();
  const { data: a } = await admin
    .from("jobs")
    .update({ status: "expired" })
    .eq("status", "published")
    .lt("valid_through", nowIso)
    .select("id");
  const { data: b } = await admin
    .from("jobs")
    .update({ status: "expired" })
    .eq("status", "published")
    .not("source_id", "is", null)
    .lt("last_seen", stale)
    .select("id");
  const ids = [...(a ?? []), ...(b ?? [])].map((j) => j.id);
  if (ids.length) {
    await admin.from("matches").delete().in("job_id", ids);
    await writeAudit(admin, {
      actorRole: "system",
      action: "jobs.expire",
      metadata: { count: ids.length },
    });
  }
  return ids.length;
}

/**
 * Retention: warn inactive users `warningDays` before deletion, then delete accounts inactive
 * for `months` whose warning is at least `warningDays` old. Admins are never auto-deleted.
 */
export async function runRetention(
  admin: AdminClient,
  mailer: Mailer,
  opts: { months: number; warningDays: number; now?: Date },
) {
  const now = opts.now ?? new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - opts.months);
  const warnCutoff = new Date(cutoff.getTime() + opts.warningDays * 86_400_000);
  const warnedBefore = new Date(now.getTime() - opts.warningDays * 86_400_000);

  const { data: toWarn } = await admin
    .from("profiles")
    .select("id, email, locale")
    .eq("role", "user")
    .lt("last_active_at", warnCutoff.toISOString())
    .is("retention_warning_sent_at", null);
  for (const u of toWarn ?? []) {
    if (!u.email) continue;
    const nl = u.locale === "nl";
    await mailer.send({
      to: u.email,
      subject: nl
        ? "Je JobMatch-account wordt binnenkort verwijderd"
        : "Your JobMatch account will be deleted soon",
      text: nl
        ? `Je bent al lange tijd niet ingelogd. Over ${opts.warningDays} dagen verwijderen we je account en al je gegevens. Log in om je account te behouden.`
        : `You haven't logged in for a long time. In ${opts.warningDays} days we will delete your account and all your data. Log in to keep your account.`,
    });
    await admin
      .from("profiles")
      .update({ retention_warning_sent_at: now.toISOString() })
      .eq("id", u.id);
  }

  const { data: toDelete } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "user")
    .lt("last_active_at", cutoff.toISOString())
    .lt("retention_warning_sent_at", warnedBefore.toISOString());
  for (const u of toDelete ?? []) await deleteUserCompletely(admin, u.id, "retention", null);

  return { warned: toWarn?.length ?? 0, deleted: toDelete?.length ?? 0 };
}

/** Enqueue syncs for enabled connectors whose interval has elapsed. */
export async function scheduleDueConnectors(admin: AdminClient, now = new Date()): Promise<number> {
  const { data } = await admin
    .from("connectors")
    .select("id, sync_interval_minutes, last_sync_at")
    .eq("enabled", true);
  let n = 0;
  for (const c of data ?? []) {
    const due =
      !c.last_sync_at ||
      new Date(c.last_sync_at).getTime() + c.sync_interval_minutes * 60_000 <= now.getTime();
    if (
      due &&
      (await enqueue(
        QUEUES.connectorSync,
        { connectorId: c.id, trigger: "schedule" },
        { singletonKey: `sync:${c.id}` },
      ))
    )
      n++;
  }
  return n;
}
