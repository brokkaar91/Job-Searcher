import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireAdmin } from "@/server/auth";
import { Card } from "@/components/ui/card";
import { ConnectorForm } from "@/components/admin/connector-form";
import { createConnectorAction } from "../actions";

export default async function NewConnectorPage({
  params,
}: PageProps<"/[locale]/admin/connectors/new">) {
  await resolveLocale(params);
  await requireAdmin();
  const t = await getTranslations("admin.connectors");
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("new")}</h1>
      <Card>
        <ConnectorForm action={createConnectorAction} />
      </Card>
    </>
  );
}
