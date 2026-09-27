import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/admin/stats";

export default async function RunDetailPage({ params }: PageProps<"/[locale]/admin/runs/[id]">) {
  await resolveLocale(params);
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("admin.runs");
  const format = await getFormatter();
  const { data: run } = await createAdminClient()
    .from("connector_runs")
    .select("*, connectors(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!run) notFound();
  const counts = run.counts as Record<string, number>;
  const errors = run.errors as { externalId?: string; message: string }[];
  return (
    <>
      <div className="space-y-1">
        <Link
          href={`/admin/connectors/${run.connectors?.id}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {run.connectors?.name}
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-semibold">
          {t("run")}{" "}
          <Badge
            variant={
              run.status === "succeeded"
                ? "success"
                : run.status === "failed"
                  ? "destructive"
                  : "secondary"
            }
          >
            {run.status}
          </Badge>
        </h1>
        <p className="text-muted-foreground text-sm">
          {run.started_at &&
            format.dateTime(new Date(run.started_at), {
              dateStyle: "medium",
              timeStyle: "medium",
            })}{" "}
          · {t(`trigger.${run.trigger as "manual" | "schedule"}`)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(
          ["fetched", "new", "updated", "unchanged", "duplicate", "failed", "expired"] as const
        ).map((k) => (
          <StatTile key={k} label={t(`counts.${k}`)} value={counts[k] ?? 0} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("errors", { count: errors.length })}</CardTitle>
        </CardHeader>
        {errors.length ? (
          <ul className="space-y-1 font-mono text-xs">
            {errors.map((e, i) => (
              <li key={i}>
                <span className="text-muted-foreground">{e.externalId ?? "–"}</span> {e.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{t("noErrors")}</p>
        )}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("log")}</CardTitle>
        </CardHeader>
        <pre className="bg-muted max-h-96 overflow-auto rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {run.log.join("\n") || "–"}
        </pre>
      </Card>
    </>
  );
}
