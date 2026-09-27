import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Building2, Filter, Handshake } from "lucide-react";
import { resolveLocale } from "@/i18n/locale";
import { Card } from "@/components/ui/card";
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
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-16 sm:px-6">
      <div className="max-w-2xl space-y-4">
        <Badge variant="accent">{t("soon")}</Badge>
        <h1 className="text-4xl font-semibold sm:text-5xl">{t("title")}</h1>
        <p className="text-muted-foreground text-lg">{t("intro")}</p>
      </div>
      <ul className="grid gap-5 md:grid-cols-3">
        {points.map(({ icon: Icon, key }) => (
          <li key={key}>
            <Card className="h-full">
              <Icon aria-hidden className="text-primary size-6" />
              <h2 className="font-semibold">{t(`points.${key}.title`)}</h2>
              <p className="text-muted-foreground text-sm">{t(`points.${key}.text`)}</p>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="max-w-2xl">
        <h2 className="text-xl font-semibold">{t("form.title")}</h2>
        <ContactForm />
      </Card>
    </div>
  );
}
