"use client";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function StepFooter({
  back,
  pending,
  nextLabel,
  error,
  disabled,
}: {
  back?: string;
  pending?: boolean;
  nextLabel?: string;
  error?: string | null;
  disabled?: boolean;
}) {
  const t = useTranslations("onboarding");
  return (
    <div className="space-y-3 pt-2">
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        {back ? (
          <Button asChild variant="ghost">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={back as any}>
              <ArrowLeft aria-hidden /> {t("back")}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending || disabled}>
          {pending ? t("saving") : (nextLabel ?? t("next"))}{" "}
          {!pending && <ArrowRight aria-hidden />}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t("autosave")}</p>
    </div>
  );
}
