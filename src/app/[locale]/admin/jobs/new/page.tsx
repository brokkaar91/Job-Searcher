import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireAdmin } from "@/server/auth";
import { Card } from "@/components/ui/card";
import { ManualJobForm } from "@/components/admin/manual-job-form";

export default async function NewJobPage({ params }: PageProps<"/[locale]/admin/jobs/new">) {
  await resolveLocale(params);
  await requireAdmin();
  const t = await getTranslations("admin.jobs");
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("new")}</h1>
      <Card>
        <ManualJobForm />
      </Card>
    </>
  );
}
