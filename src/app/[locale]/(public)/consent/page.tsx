import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Card } from "@/components/ui/card";
import { ConsentForm } from "@/components/auth/consent-form";
import { requireUser } from "@/server/auth";

/** Shown to signed-in users without the required consents (e.g. after Google sign-in). */
export default async function ConsentPage({ params }: PageProps<"/[locale]/consent">) {
  const locale = await resolveLocale(params);
  await requireUser(locale, "/consent");
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:py-24">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">{t("consentTitle")}</h1>
        <p className="text-muted-foreground">{t("consentSubtitle")}</p>
      </div>
      <Card>
        <ConsentForm />
      </Card>
    </div>
  );
}
