"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  COMPANY_SIZES,
  COMPANY_TYPES,
  EMPLOYMENT_TYPES,
  TRAVEL_MODES,
} from "@/core/matching/types";
import type { StoredPreferences } from "@/server/matching/mappers";
import { savePreferences, savePreferencesData } from "@/app/[locale]/(app)/onboarding/actions";
import { cn } from "@/lib/utils";
import { EscoAutocomplete } from "./esco-autocomplete";
import { StepFooter } from "./step-footer";

type City = { name: string; lat: number; lng: number };

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:ring-2",
        pressed ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function PreferencesStep({
  initial,
  cities,
  mode = "onboarding",
}: {
  initial: StoredPreferences;
  cities: City[];
  mode?: "onboarding" | "profile";
}) {
  const t = useTranslations("onboarding.preferences");
  const [p, setP] = useState<StoredPreferences>({
    ...initial,
    maxTravelMinutes: initial.maxTravelMinutes ?? 45,
    travelMode: initial.travelMode ?? "public_transport",
    remote: initial.remote ?? "any",
    hoursMin: initial.hoursMin ?? 32,
    hoursMax: initial.hoursMax ?? 40,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const set = (patch: Partial<StoredPreferences>) => setP((x) => ({ ...x, ...patch }));
  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = mode === "onboarding" ? await savePreferences(p) : await savePreferencesData(p);
          if (r && !r.ok) setError(t("error"));
          else setSaved(true);
        });
      }}
    >
      <section className="space-y-3" aria-labelledby="roles-h">
        <h2 id="roles-h" className="text-lg font-semibold">
          {t("roles")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("rolesHelp")}</p>
        <ul className="flex flex-wrap gap-2">
          {p.desiredOccupations.map((o) => (
            <li key={o.uri}>
              <Badge variant="accent" className="gap-1 py-1 pr-1 pl-3 text-sm">
                {o.label}
                <button
                  type="button"
                  aria-label={t("removeRole", { role: o.label ?? "" })}
                  className="hover:bg-background/60 rounded-full p-1"
                  onClick={() =>
                    set({ desiredOccupations: p.desiredOccupations.filter((x) => x.uri !== o.uri) })
                  }
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
        {p.desiredOccupations.length < 3 && (
          <EscoAutocomplete
            kind="occupations"
            label={t("addRole")}
            placeholder={t("addRole")}
            exclude={p.desiredOccupations.map((o) => o.uri)}
            onSelect={(o) =>
              o.iscoCode &&
              set({
                desiredOccupations: [
                  ...p.desiredOccupations,
                  { uri: o.uri, iscoCode: o.iscoCode, label: o.label },
                ],
              })
            }
          />
        )}
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="city" className="text-lg font-semibold">
            {t("location")}
          </Label>
          <select
            id="city"
            className="border-input bg-card h-10 rounded-lg border px-3 text-sm"
            value={p.location?.city ?? ""}
            onChange={(e) => {
              const c = cities.find((x) => x.name === e.target.value);
              set({ location: c ? { lat: c.lat, lng: c.lng, city: c.name } : null });
            }}
          >
            <option value="">{t("cityPlaceholder")}</option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-lg font-semibold">{t("travelMode")}</legend>
          <div className="flex flex-wrap gap-2">
            {TRAVEL_MODES.map((m) => (
              <Toggle key={m} pressed={p.travelMode === m} onClick={() => set({ travelMode: m })}>
                {t(`modes.${m}`)}
              </Toggle>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:col-span-2">
          <Label id="travel-l" className="text-lg font-semibold">
            {t("maxTravel", { minutes: p.maxTravelMinutes ?? 45 })}
          </Label>
          <Slider
            aria-labelledby="travel-l"
            aria-label={t("maxTravelShort")}
            min={10}
            max={120}
            step={5}
            value={[p.maxTravelMinutes ?? 45]}
            onValueChange={([v]) => set({ maxTravelMinutes: v })}
          />
        </div>
      </section>

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">{t("remote")}</legend>
        <RadioGroup
          value={p.remote ?? "any"}
          onValueChange={(v) => set({ remote: v as StoredPreferences["remote"] })}
          className="grid gap-2 sm:grid-cols-4"
        >
          {(["onsite", "hybrid", "remote", "any"] as const).map((v) => (
            <Label
              key={v}
              className="bg-card has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent flex cursor-pointer items-center gap-3 rounded-xl border p-3"
            >
              <RadioGroupItem value={v} /> {t(`remoteOptions.${v}`)}
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="salary" className="text-lg font-semibold">
            {t("salary")}
          </Label>
          <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-3.5 -translate-y-1/2 text-sm">
              €
            </span>
            <Input
              id="salary"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              className="pl-8"
              value={p.minSalaryMonth ?? ""}
              onChange={(e) =>
                set({ minSalaryMonth: e.target.value ? Number(e.target.value) : null })
              }
              aria-describedby="salary-help"
            />
          </div>
          <p id="salary-help" className="text-muted-foreground text-xs">
            {t("salaryHelp")}
          </p>
        </div>
        <div className="grid gap-3">
          <Label id="hours-l" className="text-lg font-semibold">
            {t("hours", { min: p.hoursMin ?? 0, max: p.hoursMax ?? 40 })}
          </Label>
          <Slider
            aria-labelledby="hours-l"
            aria-label={t("hoursShort")}
            min={8}
            max={40}
            step={4}
            value={[p.hoursMin ?? 32, p.hoursMax ?? 40]}
            onValueChange={([a, b]) => set({ hoursMin: a, hoursMax: b })}
          />
        </div>
      </section>

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">{t("contract")}</legend>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT_TYPES.map((v) => (
            <Toggle
              key={v}
              pressed={p.employmentTypes.includes(v)}
              onClick={() => set({ employmentTypes: toggle(p.employmentTypes, v) })}
            >
              {t(`employment.${v}`)}
            </Toggle>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">{t("company")}</legend>
        <p className="text-muted-foreground text-sm">{t("companyHelp")}</p>
        <div className="flex flex-wrap gap-2">
          {COMPANY_SIZES.map((v) => (
            <Toggle
              key={v}
              pressed={p.companySizes.includes(v)}
              onClick={() => set({ companySizes: toggle(p.companySizes, v) })}
            >
              {t(`sizes.${v}`)}
            </Toggle>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {COMPANY_TYPES.map((v) => (
            <Toggle
              key={v}
              pressed={p.companyTypes.includes(v)}
              onClick={() => set({ companyTypes: toggle(p.companyTypes, v) })}
            >
              {t(`types.${v}`)}
            </Toggle>
          ))}
        </div>
      </fieldset>

      {mode === "onboarding" ? (
        <StepFooter back="/onboarding/status" pending={pending} error={error} />
      ) : (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {t("save")}
          </Button>
          {saved && !pending && (
            <span role="status" className="text-success text-sm">
              {t("saved")}
            </span>
          )}
          {error && (
            <span role="alert" className="text-destructive text-sm">
              {error}
            </span>
          )}
        </div>
      )}
    </form>
  );
}
