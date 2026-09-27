import { getFormatter, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConnectorToggle } from "@/components/admin/connector-actions";

export default async function ConnectorsPage({ params }: PageProps<"/[locale]/admin/connectors">) {
  await resolveLocale(params);
  await requireAdmin();
  const t = await getTranslations("admin.connectors");
  const format = await getFormatter();
  const db = createAdminClient();
  const { data: connectors } = await db.from("connectors").select("*").order("created_at");
  const { data: counts } = await db.from("jobs").select("source_id").eq("status", "published");
  const jobCount = (id: string) => counts?.filter((c) => c.source_id === id).length ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/admin/connectors/new">
            <Plus aria-hidden /> {t("new")}
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("cols.name")}</TableHead>
            <TableHead>{t("cols.type")}</TableHead>
            <TableHead>{t("cols.enabled")}</TableHead>
            <TableHead>{t("cols.lastSync")}</TableHead>
            <TableHead>{t("cols.health")}</TableHead>
            <TableHead className="text-right">{t("cols.jobs")}</TableHead>
            <TableHead className="text-right">{t("cols.priority")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(connectors ?? []).map((c) => {
            const health = c.last_health as { ok?: boolean; message?: string } | null;
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/admin/connectors/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{t(`form.types.${c.type}`)}</TableCell>
                <TableCell>
                  <ConnectorToggle
                    id={c.id}
                    enabled={c.enabled}
                    label={t("toggle", { name: c.name })}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.last_sync_at ? format.relativeTime(new Date(c.last_sync_at)) : "–"}
                </TableCell>
                <TableCell>
                  {health ? (
                    <Badge variant={health.ok ? "success" : "destructive"} title={health.message}>
                      {health.ok ? "OK" : t("error")}
                    </Badge>
                  ) : (
                    "–"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{jobCount(c.id)}</TableCell>
                <TableCell className="text-right tabular-nums">{c.source_priority}</TableCell>
              </TableRow>
            );
          })}
          {!connectors?.length && (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
