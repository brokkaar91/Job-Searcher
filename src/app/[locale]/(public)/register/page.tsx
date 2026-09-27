import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Card } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/register">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "auth" }))("register.title") };
}

export default async function Page({ params, searchParams }: PageProps<"/[locale]/register">) {
  await resolveLocale(params);
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:py-24">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">{t("register.title")}</h1>
        <p className="text-muted-foreground">{t("register.subtitle")}</p>
      </div>
      <Card>
        <AuthForm mode="register" next={typeof next === "string" ? next : undefined} />
      </Card>
    </div>
  );
}
