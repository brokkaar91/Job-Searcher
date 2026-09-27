import { getFormatter, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const TABS = ["published", "review", "expired", "rejected", "all"] as const;

export default async function AdminJobsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/jobs">) {
  await resolveLocale(params);
  await requireAdmin();
  const t = await getTranslations("admin.jobs");
  const format = await getFormatter();
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(String(sp.tab))
    ? (sp.tab as (typeof TABS)[number])
    : "published";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const db = createAdminClient();
  let query = db
    .from("jobs")
    .select(
      "id, title, city, status, is_golden, needs_review, review_reasons, classification_confidence, first_seen, hiring_organization_name, source_id, connectors(name)",
      { count: "exact" },
    )
    .order("first_seen", { ascending: false })
    .limit(100);
  if (tab === "published") query = query.eq("status", "published");
  if (tab === "review") query = query.or("status.eq.pending_review,needs_review.eq.true");
  if (tab === "expired") query = query.eq("status", "expired");
  if (tab === "rejected") query = query.in("status", ["rejected", "archived"]);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data: jobs, count } = await query;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/admin/jobs/new">
            <Plus aria-hidden /> {t("new")}
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label={t("tabs")} className="bg-muted inline-flex rounded-full p-1">
          {TABS.map((x) => (
            <Link
              key={x}
              href={{ pathname: "/admin/jobs", query: { tab: x, ...(q ? { q } : {}) } }}
              aria-current={tab === x ? "page" : undefined}
              className={cn(
                "text-muted-foreground rounded-full px-3.5 py-1.5 text-sm",
                tab === x && "bg-card text-foreground shadow-sm",
              )}
            >
              {t(`tab.${x}`)}
            </Link>
          ))}
        </nav>
        <form className="ml-auto flex gap-2" action="">
          <input type="hidden" name="tab" value={tab} />
          <Input
            name="q"
            defaultValue={q}
            placeholder={t("search")}
            aria-label={t("search")}
            className="w-56"
          />
        </form>
      </div>
      <p className="text-muted-foreground text-sm">{t("count", { count: count ?? 0 })}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("cols.title")}</TableHead>
            <TableHead>{t("cols.source")}</TableHead>
            <TableHead>{t("cols.status")}</TableHead>
            <TableHead className="text-right">{t("cols.confidence")}</TableHead>
            <TableHead>{t("cols.firstSeen")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(jobs ?? []).map((j) => (
            <TableRow key={j.id}>
              <TableCell>
                <Link href={`/admin/jobs/${j.id}`} className="font-medium hover:underline">
                  {j.title}
                </Link>
                <span className="text-muted-foreground block text-xs">
                  {j.hiring_organization_name} · {j.city}
                </span>
              </TableCell>
              <TableCell className="text-sm">{j.connectors?.name ?? t("manual")}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant={
                      j.status === "published"
                        ? "success"
                        : j.status === "pending_review"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {t(`status.${j.status}`)}
                  </Badge>
                  {!j.is_golden && <Badge variant="outline">{t("duplicate")}</Badge>}
                  {j.review_reasons.map((r) => (
                    <Badge key={r} variant="outline" className="text-[11px]">
                      {r}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {j.classification_confidence ?? "–"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format.dateTime(new Date(j.first_seen), { dateStyle: "short" })}
              </TableCell>
            </TableRow>
          ))}
          {!jobs?.length && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
