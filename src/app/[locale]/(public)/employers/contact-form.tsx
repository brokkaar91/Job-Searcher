"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitEmployerContact, type ContactState } from "./actions";

export function ContactForm() {
  const t = useTranslations("employers.form");
  const [state, action, pending] = useActionState<ContactState, FormData>(submitEmployerContact, {
    status: "idle",
  });

  if (state.status === "ok") {
    return (
      <p role="status" className="text-success flex items-center gap-2">
        <CheckCircle2 aria-hidden /> {t("thanks")}
      </p>
    );
  }
  const err = (f: string) => state.fieldErrors?.[f]?.length;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" required autoComplete="name" aria-invalid={!!err("name")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={!!err("email")}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="company">{t("company")}</Label>
        <Input id="company" name="company" autoComplete="organization" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="message">{t("message")}</Label>
        <Textarea id="message" name="message" rows={5} required aria-invalid={!!err("message")} />
      </div>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {t("error")}
        </p>
      )}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
