import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { resolveLocale } from "@/i18n/locale";
import { requireCandidate } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertsForm } from "@/components/privacy/alerts-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/alerts">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "alerts" }))("title") };
}

export default async function AlertsPage({ params }: PageProps<"/[locale]/alerts">) {
  const locale = await resolveLocale(params);
  const user = await requireCandidate(locale);
  const t = await getTranslations("alerts");
  const supabase = await createClient();
  const { data } = await supabase
    .from("alert_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Alert variant="info">
        <Info aria-hidden />
        <AlertDescription>{t("comingSoon")}</AlertDescription>
      </Alert>
      <Card>
        <AlertsForm
          initial={{
            enabled: data?.enabled ?? false,
            frequency: data?.frequency ?? "weekly",
            minScore: data?.min_score ?? 70,
            onlySponsoring: data?.only_sponsoring ?? false,
          }}
        />
      </Card>
    </div>
  );
}
