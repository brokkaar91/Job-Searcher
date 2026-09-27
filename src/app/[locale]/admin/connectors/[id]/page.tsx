import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Map } from "lucide-react";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptJson } from "@/server/crypto";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectorForm } from "@/components/admin/connector-form";
import { ConnectorActions } from "@/components/admin/connector-actions";
import { RunsTable } from "@/components/admin/runs-table";
import { updateConnectorAction } from "../actions";

export default async function ConnectorDetailPage({
  params,
}: PageProps<"/[locale]/admin/connectors/[id]">) {
  await resolveLocale(params);
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("admin.connectors");
  const format = await getFormatter();
  const db = createAdminClient();
  const { data: c } = await db.from("connectors").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: secret }, { data: runs }, { data: mapping }] = await Promise.all([
    db.from("connector_secrets").select("ciphertext").eq("connector_id", id).maybeSingle(),
    db
      .from("connector_runs")
      .select("id, status, trigger, started_at, finished_at, counts")
      .eq("connector_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("field_mappings")
      .select("version, created_at")
      .eq("connector_id", id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  // Only the KEYS of stored credentials are exposed to the page, never the values.
  let credentialKeys: string[] = [];
  try {
    credentialKeys = secret ? Object.keys(decryptJson(secret.ciphertext)) : [];
  } catch {
    credentialKeys = [];
  }
  const health = c.last_health as { ok?: boolean; message?: string; at?: string } | null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link href="/admin/connectors" className="text-muted-foreground text-sm hover:underline">
            ← {t("title")}
          </Link>
          <h1 className="text-3xl font-semibold">{c.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t(`form.types.${c.type}`)}</Badge>
            <Badge variant={c.enabled ? "success" : "secondary"}>
              {c.enabled ? t("on") : t("off")}
            </Badge>
            {c.may_republish && <Badge variant="accent">{t("form.mayRepublish")}</Badge>}
            {health && (
              <Badge variant={health.ok ? "success" : "destructive"}>{health.message}</Badge>
            )}
          </div>
        </div>
        <ConnectorActions id={c.id} />
      </div>

      {c.type === "generic_feed" && (
        <Card className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{t("mapping.title")}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {mapping
                ? t("mapping.active", {
                    version: mapping.version,
                    date: format.dateTime(new Date(mapping.created_at), { dateStyle: "medium" }),
                  })
                : t("mapping.none")}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/admin/connectors/${c.id}/mapping`}>
              <Map aria-hidden /> {t("mapping.edit")}
            </Link>
          </Button>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("runs")}</CardTitle>
        </CardHeader>
        <RunsTable runs={(runs ?? []).map((r) => ({ ...r, connectorName: null }))} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings")}</CardTitle>
        </CardHeader>
        <ConnectorForm
          action={updateConnectorAction.bind(null, c.id)}
          initial={{
            name: c.name,
            type: c.type,
            config: (c.config ?? {}) as Record<string, unknown>,
            credentialKeys,
            syncIntervalMinutes: c.sync_interval_minutes,
            sourcePriority: c.source_priority,
            mayRepublish: c.may_republish,
            enabled: c.enabled,
          }}
        />
      </Card>
    </>
  );
}
