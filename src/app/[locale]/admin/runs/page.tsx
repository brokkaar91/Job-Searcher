import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RunsTable } from "@/components/admin/runs-table";

export default async function RunsPage({ params }: PageProps<"/[locale]/admin/runs">) {
  await resolveLocale(params);
  await requireAdmin();
  const t = await getTranslations("admin.runs");
  const { data } = await createAdminClient()
    .from("connector_runs")
    .select("id, status, trigger, started_at, finished_at, counts, connectors(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <RunsTable
        runs={(data ?? []).map((r) => ({ ...r, connectorName: r.connectors?.name ?? "–" }))}
      />
    </>
  );
}
