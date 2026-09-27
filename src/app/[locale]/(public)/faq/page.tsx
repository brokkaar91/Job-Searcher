import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MessageCircleQuestion } from "lucide-react";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/magic/page-hero";

const QUESTIONS = ["free", "sources", "data", "photo", "cv", "score", "reject", "delete"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "faq" }))("title") };
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  await resolveLocale(params);
  const t = await getTranslations("faq");
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-8 sm:px-6">
        <Accordion type="multiple" className="space-y-3">
          {QUESTIONS.map((q) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{t(`items.${q}.q`)}</AccordionTrigger>
              <AccordionContent>{t(`items.${q}.a`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="bg-accent/60 flex flex-col items-center gap-3 rounded-2xl p-8 text-center">
          <MessageCircleQuestion aria-hidden className="text-primary size-8" />
          <h2 className="text-lg font-semibold">{t("more.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("more.text")}</p>
          <Button asChild variant="outline">
            <Link href="/how-matching-works">{t("more.cta")}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
