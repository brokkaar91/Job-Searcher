import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "auth" }))("login.title") };
}

export default async function Page({ params, searchParams }: PageProps<"/[locale]/login">) {
  await resolveLocale(params);
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  return (
    <AuthShell title={t("login.title")} subtitle={t("login.subtitle")}>
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
