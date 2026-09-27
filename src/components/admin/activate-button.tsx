"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { activateModelVersion } from "@/app/[locale]/admin/matching/actions";

export function ActivateButton({ id, version }: { id: string; version: number }) {
  const t = useTranslations("admin.matching");
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        confirm(t("confirmActivate", { version })) &&
        start(async () => {
          const r = await activateModelVersion(id);
          toast.success(r.queued ? t("activatedQueued") : t("activatedInline"));
        })
      }
    >
      {t("activate")}
    </Button>
  );
}
