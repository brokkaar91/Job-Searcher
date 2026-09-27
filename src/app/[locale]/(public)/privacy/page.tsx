import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { LegalPage } from "@/components/layout/legal-page";

const SECTIONS = [
  "controller",
  "data",
  "purposes",
  "legalBasis",
  "processors",
  "retention",
  "rights",
  "contact",
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "privacyPage" }))("title") };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  await resolveLocale(params);
  const t = await getTranslations("privacyPage");
  return (
    <LegalPage
      title={t("title")}
      todo={t("todo")}
      sections={SECTIONS.map((s) => ({ title: t(`${s}.title`), text: t(`${s}.text`) }))}
    />
  );
}
