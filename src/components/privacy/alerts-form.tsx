"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { saveAlertSettings } from "@/app/[locale]/(app)/alerts/actions";

type Settings = {
  enabled: boolean;
  frequency: "instant" | "daily" | "weekly";
  minScore: number;
  onlySponsoring: boolean;
};

export function AlertsForm({ initial }: { initial: Settings }) {
  const t = useTranslations("alerts");
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveAlertSettings(s);
          toast(t("saved"));
        });
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="enabled" className="text-base">
          {t("enabled")}
        </Label>
        <Switch
          id="enabled"
          checked={s.enabled}
          onCheckedChange={(enabled) => setS({ ...s, enabled })}
        />
      </div>
      <fieldset className="space-y-3" disabled={!s.enabled}>
        <legend className="font-medium">{t("frequency")}</legend>
        <RadioGroup
          value={s.frequency}
          onValueChange={(v) => setS({ ...s, frequency: v as Settings["frequency"] })}
          className="grid gap-2 sm:grid-cols-3"
        >
          {(["instant", "daily", "weekly"] as const).map((f) => (
            <Label
              key={f}
              className="has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent flex cursor-pointer items-center gap-3 rounded-xl border p-3 font-normal"
            >
              <RadioGroupItem value={f} /> {t(`frequencies.${f}`)}
            </Label>
          ))}
        </RadioGroup>
      </fieldset>
      <div className="space-y-3">
        <Label id="min-score">{t("minScore", { score: s.minScore })}</Label>
        <Slider
          aria-labelledby="min-score"
          aria-label={t("minScoreShort")}
          disabled={!s.enabled}
          min={45}
          max={95}
          step={5}
          value={[s.minScore]}
          onValueChange={([v]) => setS({ ...s, minScore: v ?? s.minScore })}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="sponsor" className="font-normal">
          {t("onlySponsoring")}
        </Label>
        <Switch
          id="sponsor"
          disabled={!s.enabled}
          checked={s.onlySponsoring}
          onCheckedChange={(onlySponsoring) => setS({ ...s, onlySponsoring })}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {t("save")}
      </Button>
    </form>
  );
}
