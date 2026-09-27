import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Building2, Filter, Handshake } from "lucide-react";
import { resolveLocale } from "@/i18n/locale";
import { Card } from "@/components/ui/card";
import { PageHero } from "@/components/magic/page-hero";
import { SpotlightCard } from "@/components/magic/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "./contact-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/employers">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "employers" }))("title") };
}

export default async function EmployersPage({ params }: PageProps<"/[locale]/employers">) {
  await resolveLocale(params);
  const t = await getTranslations("employers");
  const points = [
    { icon: Filter, key: "quality" },
    { icon: Handshake, key: "fair" },
    { icon: Building2, key: "reach" },
  ] as const;
  return (
    <>
      <PageHero title={t("title")} subtitle={t("intro")}>
        <Badge variant="accent" className="px-3 py-1">
          {t("soon")}
        </Badge>
      </PageHero>
      <div className="mx-auto max-w-5xl space-y-12 px-4 pb-8 sm:px-6">
        <ul className="grid gap-5 md:grid-cols-3">
          {points.map(({ icon: Icon, key }) => (
            <SpotlightCard as="li" key={key} className="flex flex-col gap-3">
              <span className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl">
                <Icon aria-hidden className="size-5" />
              </span>
              <h2 className="font-semibold">{t(`points.${key}.title`)}</h2>
              <p className="text-muted-foreground text-sm">{t(`points.${key}.text`)}</p>
            </SpotlightCard>
          ))}
        </ul>
        <Card className="shadow-lift mx-auto w-full max-w-2xl">
          <h2 className="text-xl font-semibold">{t("form.title")}</h2>
          <ContactForm />
        </Card>
      </div>
    </>
  );
}
