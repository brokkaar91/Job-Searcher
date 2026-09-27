import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireUser } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConsentToggles, DeleteAccount } from "@/components/privacy/privacy-controls";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy-center">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "privacyCenter" }))("title") };
}

const TYPES = ["terms_privacy", "ai_processing", "employer_sharing", "marketing"] as const;

/** Reachable without consent (requireUser, not requireCandidate): users can always export or delete. */
export default async function PrivacyCenterPage({ params }: PageProps<"/[locale]/privacy-center">) {
  const locale = await resolveLocale(params);
  const user = await requireUser(locale);
  const t = await getTranslations("privacyCenter");
  const supabase = await createClient();
  const { data } = await supabase
    .from("current_consents")
    .select("type, granted, created_at")
    .eq("user_id", user.id);
  const consents = TYPES.map((type) => {
    const c = data?.find((x) => x.type === type);
    return { type, granted: c?.granted ?? false, at: c?.created_at ?? null };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("export.title")}</CardTitle>
          <CardDescription>{t("export.text")}</CardDescription>
        </CardHeader>
        <Button asChild variant="outline" className="self-start">
          <a href="/api/me/export" download>
            <Download aria-hidden /> {t("export.button")}
          </a>
        </Button>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("consents.title")}</CardTitle>
          <CardDescription>{t("consents.text")}</CardDescription>
        </CardHeader>
        <ConsentToggles consents={consents} />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("retention.title")}</CardTitle>
          <CardDescription>{t("retention.text")}</CardDescription>
        </CardHeader>
        <Link href="/privacy" className="text-primary text-sm underline-offset-2 hover:underline">
          {t("retention.link")}
        </Link>
      </Card>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>{t("delete.title")}</CardTitle>
          <CardDescription>{t("delete.text")}</CardDescription>
        </CardHeader>
        <DeleteAccount />
      </Card>
    </div>
  );
}
