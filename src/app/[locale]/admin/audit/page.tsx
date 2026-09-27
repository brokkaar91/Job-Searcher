import { getFormatter, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE = 50;

export default async function AuditPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/audit">) {
  await resolveLocale(params);
  await requireAdmin();
  const t = await getTranslations("admin.audit");
  const format = await getFormatter();
  const sp = await searchParams;
  const action = typeof sp.action === "string" ? sp.action.slice(0, 60) : "";
  const entity = typeof sp.entity === "string" ? sp.entity.slice(0, 100) : "";
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  let q = createAdminClient()
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (action) q = q.ilike("action", `${action}%`);
  if (entity) q = q.ilike("entity_id", `%${entity}%`);
  const { data, count } = await q;
  const pages = Math.ceil((count ?? 0) / PAGE);
  const link = (p: number) => ({
    pathname: "/admin/audit",
    query: { ...(action ? { action } : {}), ...(entity ? { entity } : {}), page: String(p) },
  });

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <form className="flex flex-wrap gap-2">
        <Input
          name="action"
          defaultValue={action}
          placeholder={t("action")}
          aria-label={t("action")}
          className="w-56"
          list="actions"
        />
        <datalist id="actions">
          {[
            "match.compute",
            "cv.parse",
            "connector.",
            "model.",
            "job.",
            "user.",
            "account.delete",
            "consent.update",
            "privacy.export",
          ].map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <Input
          name="entity"
          defaultValue={entity}
          placeholder={t("entity")}
          aria-label={t("entity")}
          className="w-56"
        />
        <Button type="submit" variant="outline">
          {t("filter")}
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("cols.time")}</TableHead>
            <TableHead>{t("cols.actor")}</TableHead>
            <TableHead>{t("cols.action")}</TableHead>
            <TableHead>{t("cols.entity")}</TableHead>
            <TableHead>{t("cols.details")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).map((e) => (
            <TableRow key={e.id}>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {format.dateTime(new Date(e.created_at), {
                  dateStyle: "short",
                  timeStyle: "medium",
                })}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{e.actor_role}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{e.action}</TableCell>
              <TableCell className="font-mono text-xs">
                {e.entity_type ? `${e.entity_type}:${(e.entity_id ?? "").slice(0, 24)}` : "–"}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-md font-mono text-[11px]">
                {e.model_version_id && (
                  <span className="block">model={e.model_version_id.slice(0, 8)}</span>
                )}
                {e.input_hash && <span className="block">hash={e.input_hash.slice(0, 16)}…</span>}
                <span className="line-clamp-2 break-all">{JSON.stringify(e.metadata)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("total", { count: count ?? 0 })}</span>
        <div className="flex gap-2">
          {page > 0 && (
            <Button asChild size="sm" variant="outline">
              <Link href={link(page - 1)}>{t("prev")}</Link>
            </Button>
          )}
          {page + 1 < pages && (
            <Button asChild size="sm" variant="outline">
              <Link href={link(page + 1)}>{t("next")}</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
