import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
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
    <AuthShell title={t("register.title")} subtitle={t("register.subtitle")}>
      <AuthForm mode="register" next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
