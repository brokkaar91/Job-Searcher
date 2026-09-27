"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createManualJob, type ManualState } from "@/app/[locale]/admin/jobs/actions";

export function ManualJobForm() {
  const t = useTranslations("admin.jobs.form");
  const [state, action, pending] = useActionState<ManualState, FormData>(createManualJob, {
    status: "idle",
  });
  const field = (name: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{t(name as never)}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("title", { required: true })}
        {field("companyName", { required: true })}
        {field("companyDomain", { placeholder: "example.com" })}
        {field("city")}
        {field("applyUrl", { type: "url" })}
        {field("salaryText", { placeholder: "€ 3.500 - € 4.500 per maand" })}
        {field("remote", { placeholder: "hybrid / remote / onsite" })}
        {field("employment", { placeholder: "full-time" })}
        {field("validThrough", { type: "date" })}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea id="description" name="description" rows={10} required minLength={20} />
      </div>
      <p className="text-muted-foreground text-sm">{t("help")}</p>
      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? t("processing") : t("submit")}
      </Button>
    </form>
  );
}
