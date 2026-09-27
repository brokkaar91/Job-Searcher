import { getFormatter, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactHandled, UserActions } from "@/components/admin/user-actions";

export default async function AdminUsersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/users">) {
  await resolveLocale(params);
  await requireAdmin();
  const t = await getTranslations("admin.users");
  const format = await getFormatter();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const db = createAdminClient();
  let users = db
    .from("profiles")
    .select(
      "id, email, role, locale, created_at, last_active_at, candidate_profiles(onboarding_completed_at)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) users = users.ilike("email", `%${q}%`);
  const [{ data: list }, { data: deletions }, { data: contacts }] = await Promise.all([
    users,
    db
      .from("deletion_requests")
      .select("id, source, status, requested_at, processed_at, email_hash")
      .order("requested_at", { ascending: false })
      .limit(50),
    db
      .from("contact_messages")
      .select("*")
      .is("handled_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const date = (s: string | null) =>
    s ? format.dateTime(new Date(s), { dateStyle: "short" }) : "–";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <form>
          <Input
            name="q"
            defaultValue={q}
            placeholder={t("search")}
            aria-label={t("search")}
            className="w-64"
          />
        </form>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("cols.email")}</TableHead>
            <TableHead>{t("cols.role")}</TableHead>
            <TableHead>{t("cols.onboarded")}</TableHead>
            <TableHead>{t("cols.created")}</TableHead>
            <TableHead>{t("cols.lastActive")}</TableHead>
            <TableHead className="text-right">{t("cols.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(list ?? []).map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.email}</TableCell>
              <TableCell>
                <Badge variant={u.role === "admin" ? "accent" : "outline"}>{u.role}</Badge>
              </TableCell>
              <TableCell>{u.candidate_profiles?.onboarding_completed_at ? "✓" : "–"}</TableCell>
              <TableCell className="text-muted-foreground">{date(u.created_at)}</TableCell>
              <TableCell className="text-muted-foreground">{date(u.last_active_at)}</TableCell>
              <TableCell>
                <UserActions id={u.id} role={u.role} email={u.email ?? ""} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("deletions")}</CardTitle>
            <p className="text-muted-foreground text-sm">{t("deletionsHelp")}</p>
          </CardHeader>
          <ul className="divide-y text-sm">
            {(deletions ?? []).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
                <Badge
                  variant={
                    d.status === "completed"
                      ? "success"
                      : d.status === "pending"
                        ? "warning"
                        : "secondary"
                  }
                >
                  {d.status}
                </Badge>
                <span className="text-muted-foreground font-mono text-xs">
                  {d.email_hash.slice(0, 12)}…
                </span>
                <Badge variant="outline">
                  {t(`source.${d.source as "user" | "retention" | "admin"}`)}
                </Badge>
                <span className="text-muted-foreground ml-auto text-xs">
                  {date(d.requested_at)} → {date(d.processed_at)}
                </span>
              </li>
            ))}
            {!deletions?.length && <li className="text-muted-foreground py-2">{t("none")}</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("contacts")}</CardTitle>
          </CardHeader>
          <ul className="divide-y text-sm">
            {(contacts ?? []).map((c) => (
              <li key={c.id} className="space-y-1 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {c.name} · {c.company ?? "–"}
                  </span>
                  <ContactHandled id={c.id} />
                </div>
                <a href={`mailto:${c.email}`} className="text-primary text-xs">
                  {c.email}
                </a>
                <p className="text-muted-foreground">{c.message}</p>
              </li>
            ))}
            {!contacts?.length && <li className="text-muted-foreground py-2">{t("none")}</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
