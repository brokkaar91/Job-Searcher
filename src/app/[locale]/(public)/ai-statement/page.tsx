import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { LegalPage } from "@/components/layout/legal-page";

const SECTIONS = [
  "system",
  "riskClass",
  "data",
  "logic",
  "oversight",
  "logging",
  "limitations",
  "contact",
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/ai-statement">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "aiPage" }))("title") };
}

export default async function AiStatementPage({ params }: PageProps<"/[locale]/ai-statement">) {
  await resolveLocale(params);
  const t = await getTranslations("aiPage");
  return (
    <LegalPage
      title={t("title")}
      todo={t("todo")}
      sections={SECTIONS.map((s) => ({ title: t(`${s}.title`), text: t(`${s}.text`) }))}
    />
  );
}
