import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { resolveLocale } from "@/i18n/locale";

const QUESTIONS = ["free", "sources", "data", "photo", "cv", "score", "reject", "delete"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "faq" }))("title") };
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  await resolveLocale(params);
  const t = await getTranslations("faq");
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold">{t("title")}</h1>
      <div className="bg-card shadow-soft divide-y rounded-xl border">
        {QUESTIONS.map((q) => (
          <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md font-medium">
              {t(`items.${q}.q`)}
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="text-muted-foreground mt-3 text-sm">{t(`items.${q}.a`)}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
