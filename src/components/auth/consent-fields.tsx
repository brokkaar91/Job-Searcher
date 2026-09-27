"use client";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/i18n/navigation";

/** Explicit, separate, unticked consents (AVG art. 7 / AI Act transparency). */
export function ConsentFields() {
  const t = useTranslations("auth.consent");
  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{t("legend")}</legend>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox name="terms" required className="mt-0.5" />
        <span>
          {t.rich("terms", {
            privacy: (c) => (
              <Link href="/privacy" className="text-primary underline underline-offset-2">
                {c}
              </Link>
            ),
          })}
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox name="ai" required className="mt-0.5" />
        <span>
          {t.rich("ai", {
            ai: (c) => (
              <Link href="/ai-statement" className="text-primary underline underline-offset-2">
                {c}
              </Link>
            ),
          })}
        </span>
      </label>
      <p className="text-muted-foreground text-xs">{t("employerLater")}</p>
    </fieldset>
  );
}
