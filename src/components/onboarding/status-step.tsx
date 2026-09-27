"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CEFR_LEVELS, type Cefr } from "@/core/matching/types";
import { saveStatus, saveStatusData } from "@/app/[locale]/(app)/onboarding/actions";
import { StepFooter } from "./step-footer";

export const LANGUAGE_CODES = [
  "nl",
  "en",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "pl",
  "ro",
  "tr",
  "ar",
  "uk",
  "ru",
  "hi",
  "zh",
] as const;

interface Initial {
  languages: { language: string; level: Cefr }[];
}

const selectCls = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm";

export function StatusStep({
  initial,
  mode = "onboarding",
}: {
  initial: Initial;
  mode?: "onboarding" | "profile";
}) {
  const t = useTranslations("onboarding.status");
  const tl = useTranslations("languages");
  const [langs, setLangs] = useState(
    initial.languages.length ? initial.languages : [{ language: "nl", level: "B2" as Cefr }],
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const input = { languages: langs };
          const r = mode === "onboarding" ? await saveStatus(input) : await saveStatusData(input);
          if (r && !r.ok) setError(t("errors.save"));
          else setSaved(true);
        });
      }}
    >
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">{t("languages")}</legend>
        <p className="text-muted-foreground text-sm">{t("languagesHelp")}</p>
        {langs.map((l, i) => (
          <Card
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,12rem)_auto] items-end gap-3 p-3"
          >
            <div className="grid gap-1.5">
              <Label htmlFor={`lang-${i}`} className="text-xs">
                {t("language")}
              </Label>
              <select
                id={`lang-${i}`}
                className={selectCls}
                value={l.language}
                onChange={(e) =>
                  setLangs((xs) =>
                    xs.map((x, j) => (j === i ? { ...x, language: e.target.value } : x)),
                  )
                }
              >
                {LANGUAGE_CODES.map((c) => (
                  <option key={c} value={c}>
                    {tl(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`level-${i}`} className="text-xs">
                {t("level")}
              </Label>
              <select
                id={`level-${i}`}
                className={selectCls}
                value={l.level}
                onChange={(e) =>
                  setLangs((xs) =>
                    xs.map((x, j) => (j === i ? { ...x, level: e.target.value as Cefr } : x)),
                  )
                }
              >
                {CEFR_LEVELS.map((c) => (
                  <option key={c} value={c}>
                    {c} – {t(`cefr.${c}`)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("removeLanguage")}
              onClick={() => setLangs((xs) => xs.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden />
            </Button>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setLangs((xs) => [...xs, { language: "en", level: "B2" }])}
        >
          <Plus aria-hidden /> {t("addLanguage")}
        </Button>
      </fieldset>

      {mode === "onboarding" ? (
        <StepFooter back="/onboarding/review" pending={pending} error={error} />
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
