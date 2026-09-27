import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await resolveLocale(params);
  const t = await getTranslations("home");
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-semibold">{t("title")}</h1>
    </main>
  );
}
