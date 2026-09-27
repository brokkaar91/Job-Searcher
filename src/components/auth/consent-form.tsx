"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { giveConsent, type AuthState } from "./actions";
import { ConsentFields } from "./consent-fields";

export function ConsentForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(giveConsent, {
    status: "idle",
  });
  return (
    <form action={action} className="space-y-4">
      <ConsentFields />
      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {t(`errors.${state.error ?? "failed"}`)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {t("consentSubmit")}
      </Button>
    </form>
  );
}
