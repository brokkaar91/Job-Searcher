import { getFormatter, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarList, StatTile } from "@/components/admin/stats";

async function count(q: PromiseLike<{ count: number | null }>) {
  return (await q).count ?? 0;
}

export default async function AdminOverview({ params }: PageProps<"/[locale]/admin">) {
  await resolveLocale(params);
  await requireAdmin();
  const t = await getTranslations("admin.overview");
  const tr = await getTranslations("feed.dismiss.reasons");
  const format = await getFormatter();
  const db = createAdminClient();
  const head = { count: "exact" as const, head: true };

  const [
    users,
    onboarded,
    published,
    review,
    expired,
    matches,
    saved,
    applied,
    dismissed,
    deletions,
    contacts,
  ] = await Promise.all([
    count(db.from("profiles").select("id", head).eq("role", "user")),
    count(
      db
        .from("candidate_profiles")
        .select("user_id", head)
        .not("onboarding_completed_at", "is", null),
    ),
    count(db.from("jobs").select("id", head).eq("status", "published").eq("is_golden", true)),
    count(db.from("jobs").select("id", head).eq("status", "pending_review")),
    count(db.from("jobs").select("id", head).eq("status", "expired")),
    count(db.from("matches").select("id", head).eq("knocked_out", false)),
    count(db.from("match_feedback").select("id", head).eq("type", "saved")),
    count(db.from("match_feedback").select("id", head).eq("type", "applied")),
    count(db.from("match_feedback").select("id", head).eq("type", "dismissed")),
    count(db.from("deletion_requests").select("id", head).eq("status", "pending")),
    count(db.from("contact_messages").select("id", head).is("handled_at", null)),
  ]);

  const [{ data: reasons }, { data: jobsBySource }, { data: connectors }, { data: runs }] =
    await Promise.all([
      db.from("match_feedback").select("reason").eq("type", "dismissed").not("reason", "is", null),
      db.from("jobs").select("source_id").eq("status", "published").eq("is_golden", true),
      db.from("connectors").select("id, name"),
      db
        .from("connector_runs")
        .select("id, status, started_at, counts, connectors(name)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const reasonCounts = new Map<string, number>();
  for (const r of reasons ?? [])
    reasonCounts.set(r.reason!, (reasonCounts.get(r.reason!) ?? 0) + 1);
  const sourceCounts = new Map<string, number>();
  for (const j of jobsBySource ?? [])
    sourceCounts.set(j.source_id ?? "manual", (sourceCounts.get(j.source_id ?? "manual") ?? 0) + 1);
  const pct = (n: number) =>
    matches ? format.number(n / matches, { style: "percent", maximumFractionDigits: 1 }) : "–";

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <section aria-label={t("kpis")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("users")} value={users} hint={t("onboarded", { count: onboarded })} />
        <StatTile label={t("jobs")} value={published} hint={t("jobsHint", { review, expired })} />
        <StatTile label={t("matches")} value={matches} />
        <StatTile
          label={t("ratios")}
          value={`${pct(saved)} / ${pct(applied)}`}
          hint={t("ratiosHint", { dismissed })}
        />
      </section>
      {(review > 0 || deletions > 0 || contacts > 0) && (
        <div className="flex flex-wrap gap-2">
          {review > 0 && (
            <Link href={{ pathname: "/admin/jobs", query: { tab: "review" } }}>
              <Badge variant="warning">{t("reviewQueue", { count: review })}</Badge>
            </Link>
          )}
          {deletions > 0 && (
            <Link href="/admin/users">
              <Badge variant="destructive">{t("pendingDeletions", { count: deletions })}</Badge>
            </Link>
          )}
          {contacts > 0 && (
            <Link href="/admin/users">
              <Badge variant="accent">{t("contacts", { count: contacts })}</Badge>
            </Link>
          )}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dismissReasons")}</CardTitle>
          </CardHeader>
          <BarList
            label={t("dismissReasons")}
            empty={t("noData")}
            rows={[...reasonCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => ({
                key: k,
                label: tr.has(k as never) ? tr(k as never) : k,
                value: v,
              }))}
          />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("coverage")}</CardTitle>
          </CardHeader>
          <BarList
            label={t("coverage")}
            empty={t("noData")}
            rows={[...sourceCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => ({
                key: k,
                label:
                  k === "manual" ? t("manual") : (connectors?.find((c) => c.id === k)?.name ?? k),
                value: v,
              }))}
          />
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("recentRuns")}</CardTitle>
        </CardHeader>
        <ul className="divide-y text-sm">
          {(runs ?? []).map((r) => {
            const c = r.counts as Record<string, number>;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
                <Badge
                  variant={
                    r.status === "succeeded"
                      ? "success"
                      : r.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {r.status}
                </Badge>
                <Link href={`/admin/runs/${r.id}`} className="font-medium hover:underline">
                  {r.connectors?.name}
                </Link>
                <span className="text-muted-foreground">
                  {r.started_at
                    ? format.dateTime(new Date(r.started_at), {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : ""}
                </span>
                <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                  {t("runCounts", {
                    new: c.new ?? 0,
                    updated: c.updated ?? 0,
                    duplicate: c.duplicate ?? 0,
                    failed: c.failed ?? 0,
                  })}
                </span>
              </li>
            );
          })}
          {!runs?.length && <li className="text-muted-foreground py-2">{t("noRuns")}</li>}
        </ul>
      </Card>
    </>
  );
}
