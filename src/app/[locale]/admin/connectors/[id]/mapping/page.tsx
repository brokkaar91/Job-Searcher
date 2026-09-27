import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MappingEditor } from "@/components/admin/mapping-editor";
import { fieldMappingSchema } from "@/core/connectors/mapping";

export default async function MappingPage({
  params,
}: PageProps<"/[locale]/admin/connectors/[id]/mapping">) {
  await resolveLocale(params);
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("admin.mapping");
  const db = createAdminClient();
  const { data: c } = await db
    .from("connectors")
    .select("id, name, type")
    .eq("id", id)
    .maybeSingle();
  if (!c || c.type !== "generic_feed") notFound();
  const { data: active } = await db
    .from("field_mappings")
    .select("mapping, sample_record, version")
    .eq("connector_id", id)
    .eq("is_active", true)
    .maybeSingle();
  const parsed = fieldMappingSchema.safeParse(active?.mapping);
  return (
    <>
      <div className="space-y-1">
        <Link
          href={`/admin/connectors/${id}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {c.name}
        </Link>
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <MappingEditor
        connectorId={id}
        initial={
          parsed.success ? parsed.data : { format: "json", itemsPath: "$.jobs[*]", fields: {} }
        }
        initialSample={active?.sample_record ?? null}
        version={active?.version ?? 0}
      />
    </>
  );
}
