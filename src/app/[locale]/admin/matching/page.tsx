import { getFormatter, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MODEL_CONFIG, modelConfigSchema } from "@/core/matching/config";
import { COMPONENTS } from "@/core/matching/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModelEditor } from "@/components/admin/model-editor";
import { ActivateButton } from "@/components/admin/activate-button";

export default async function MatchingConfigPage({
  params,
}: PageProps<"/[locale]/admin/matching">) {
  await resolveLocale(params);
  await requireAdmin();
  const t = await getTranslations("admin.matching");
  const format = await getFormatter();
  const db = createAdminClient();
  const [{ data: versions }, { data: demos }] = await Promise.all([
    db.from("matching_model_versions").select("*").order("version", { ascending: false }),
    db.from("profiles").select("id, email").like("email", "demo.%@jobmatch.local").order("email"),
  ]);
  const { data: creators } = await db
    .from("profiles")
    .select("id, email")
    .in(
      "id",
      (versions ?? [])
        .flatMap((v) => [v.created_by, v.activated_by])
        .filter((x): x is string => !!x),
    );
  const who = (id: string | null) => creators?.find((c) => c.id === id)?.email ?? "system";
  const active = versions?.find((v) => v.is_active);
  const base = modelConfigSchema.safeParse(active?.config);

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("versions")}</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("cols.version")}</TableHead>
              <TableHead>{t("cols.weights")}</TableHead>
              <TableHead>{t("cols.created")}</TableHead>
              <TableHead>{t("cols.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(versions ?? []).map((v) => {
              const c = modelConfigSchema.safeParse(v.config);
              return (
                <TableRow key={v.id}>
                  <TableCell>
                    <span className="font-medium">
                      v{v.version} · {v.name}
                    </span>
                    {v.notes && (
                      <span className="text-muted-foreground block max-w-xs truncate text-xs">
                        {v.notes}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.success ? COMPONENTS.map((k) => c.data.weights[k]).join(" / ") : "–"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format.dateTime(new Date(v.created_at), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {who(v.created_by)}
                    {v.activated_at && (
                      <span className="block">
                        {t("activatedBy", {
                          who: who(v.activated_by),
                          date: format.dateTime(new Date(v.activated_at), { dateStyle: "medium" }),
                        })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {v.is_active ? (
                      <Badge variant="success">{t("active")}</Badge>
                    ) : (
                      <ActivateButton id={v.id} version={v.version} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <h2 className="text-xl font-semibold">{t("newVersion")}</h2>
      <ModelEditor
        base={base.success ? base.data : DEFAULT_MODEL_CONFIG}
        demoProfiles={(demos ?? []).map((d) => ({
          id: d.id,
          label: d.email!.replace("@jobmatch.local", ""),
        }))}
      />
    </>
  );
}
