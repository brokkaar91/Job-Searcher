"use client";
import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteAccount, setConsent } from "@/app/[locale]/(app)/privacy-center/actions";

type ConsentType = "terms_privacy" | "ai_processing" | "employer_sharing" | "marketing";

export function ConsentToggles({
  consents,
}: {
  consents: { type: ConsentType; granted: boolean; at: string | null }[];
}) {
  const t = useTranslations("privacyCenter.consents");
  const format = useFormatter();
  const [pending, start] = useTransition();
  return (
    <ul className="divide-y">
      {consents.map((c) => (
        <li key={c.type} className="flex items-start justify-between gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor={`consent-${c.type}`} className="text-base">
              {t(`types.${c.type}.title`)}
            </Label>
            <p className="text-muted-foreground text-sm">{t(`types.${c.type}.text`)}</p>
            {c.at && (
              <p className="text-muted-foreground text-xs">
                {t(c.granted ? "grantedAt" : "revokedAt", {
                  date: format.dateTime(new Date(c.at), { dateStyle: "medium" }),
                })}
              </p>
            )}
          </div>
          <Switch
            id={`consent-${c.type}`}
            checked={c.granted}
            disabled={pending || c.type === "employer_sharing"}
            onCheckedChange={(granted) => {
              if (!granted && c.type !== "marketing" && !confirm(t("confirmRevoke"))) return;
              start(async () => {
                await setConsent({ type: c.type, granted });
                toast(t("updated"));
              });
            }}
          />
        </li>
      ))}
    </ul>
  );
}

export function DeleteAccount() {
  const t = useTranslations("privacyCenter.delete");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden /> {t("button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="confirm-delete">{t("typeToConfirm", { word: t("word") })}</Label>
            <Input
              id="confirm-delete"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              aria-invalid={error}
            />
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {t("mismatch")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !value}
              onClick={() =>
                start(async () => {
                  const r = await deleteAccount(value);
                  if (r && !r.ok) setError(true);
                })
              }
            >
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
