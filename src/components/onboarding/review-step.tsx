"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  saveReview,
  saveReviewData,
  type ReviewInput,
} from "@/app/[locale]/(app)/onboarding/actions";
import { EscoAutocomplete } from "./esco-autocomplete";
import { StepFooter } from "./step-footer";

type Skill = ReviewInput["skills"][number];
type Experience = ReviewInput["experiences"][number];

const EQF = [2, 3, 4, 5, 6, 7, 8] as const;
const thisYear = new Date().getFullYear();

/** Review & correct what the CV parser found. Used in onboarding and on the profile page (mode="profile"). */
export function ReviewStep({
  initial,
  fromCv,
  mode = "onboarding",
}: {
  initial: ReviewInput;
  fromCv: boolean;
  mode?: "onboarding" | "profile";
}) {
  const t = useTranslations("onboarding.review");
  const [skills, setSkills] = useState<Skill[]>(initial.skills);
  const [experiences, setExperiences] = useState<Experience[]>(initial.experiences);
  const [educationLevel, setEducation] = useState<number | null>(initial.educationLevel);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const updateExp = (i: number, patch: Partial<Experience>) =>
    setExperiences((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const input = { skills, experiences, educationLevel };
          const r = mode === "onboarding" ? await saveReview(input) : await saveReviewData(input);
          if (r && !r.ok) setError(t("error"));
          else setSaved(true);
        });
      }}
    >
      {mode === "onboarding" && (
        <Alert variant="info">
          <AlertDescription>{fromCv ? t("fromCv") : t("manual")}</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="skills-h" className="space-y-3">
        <h2 id="skills-h" className="text-lg font-semibold">
          {t("skills")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("skillsHelp")}</p>
        <ul className="flex flex-wrap gap-2" aria-label={t("skills")}>
          {skills.map((s, i) => (
            <li key={`${s.escoUri ?? s.label}-${i}`}>
              <Badge
                variant={s.escoUri ? "accent" : "outline"}
                className="gap-1.5 py-1 pr-1 pl-3 text-sm"
              >
                {s.label}
                <select
                  aria-label={t("lastUsed", { skill: s.label })}
                  value={s.lastUsedYear ?? ""}
                  onChange={(e) =>
                    setSkills((xs) =>
                      xs.map((x, j) =>
                        j === i
                          ? { ...x, lastUsedYear: e.target.value ? Number(e.target.value) : null }
                          : x,
                      ),
                    )
                  }
                  className="text-muted-foreground focus-visible:ring-ring rounded-md bg-transparent text-xs outline-none focus-visible:ring-2"
                >
                  <option value="">{t("yearUnknown")}</option>
                  {Array.from({ length: 30 }, (_, k) => thisYear - k).map((y) => (
                    <option key={y} value={y}>
                      {y === thisYear ? t("now") : y}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={t("remove", { skill: s.label })}
                  onClick={() => setSkills((xs) => xs.filter((_, j) => j !== i))}
                  className="hover:bg-background/60 rounded-full p-1"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              </Badge>
            </li>
          ))}
          {skills.length === 0 && (
            <li className="text-muted-foreground text-sm">{t("noSkills")}</li>
          )}
        </ul>
        <EscoAutocomplete
          kind="skills"
          label={t("addSkill")}
          placeholder={t("addSkill")}
          allowFreeText
          exclude={skills.map((s) => s.escoUri ?? "")}
          onSelect={(o) =>
            setSkills((xs) => [
              ...xs,
              { escoUri: o.mapped ? o.uri : null, label: o.label, lastUsedYear: thisYear },
            ])
          }
        />
        <p className="text-muted-foreground text-xs">{t("unmappedHint")}</p>
      </section>

      <section aria-labelledby="exp-h" className="space-y-3">
        <h2 id="exp-h" className="text-lg font-semibold">
          {t("experience")}
        </h2>
        {experiences.map((e, i) => (
          <Card key={i} className="gap-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`title-${i}`}>{t("jobTitle")}</Label>
                <Input
                  id={`title-${i}`}
                  value={e.title}
                  required
                  onChange={(ev) => updateExp(i, { title: ev.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`org-${i}`}>{t("organisation")}</Label>
                <Input
                  id={`org-${i}`}
                  value={e.organisation ?? ""}
                  onChange={(ev) => updateExp(i, { organisation: ev.target.value || null })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`start-${i}`}>{t("start")}</Label>
                <Input
                  id={`start-${i}`}
                  type="month"
                  value={e.startDate ?? ""}
                  onChange={(ev) => updateExp(i, { startDate: ev.target.value || null })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`end-${i}`}>{t("end")}</Label>
                <Input
                  id={`end-${i}`}
                  type="month"
                  disabled={e.isCurrent}
                  value={e.isCurrent ? "" : (e.endDate ?? "")}
                  onChange={(ev) => updateExp(i, { endDate: ev.target.value || null })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={e.isCurrent}
                onCheckedChange={(v) => updateExp(i, { isCurrent: v === true })}
              />
              {t("current")}
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor={`desc-${i}`}>{t("tasks")}</Label>
              <Textarea
                id={`desc-${i}`}
                rows={3}
                value={e.description}
                onChange={(ev) => updateExp(i, { description: ev.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive self-start"
              onClick={() => setExperiences((xs) => xs.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden /> {t("removeExperience")}
            </Button>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setExperiences((xs) => [
              ...xs,
              {
                title: "",
                organisation: null,
                startDate: null,
                endDate: null,
                isCurrent: false,
                description: "",
                escoOccupationUri: null,
                iscoCode: null,
              },
            ])
          }
        >
          <Plus aria-hidden /> {t("addExperience")}
        </Button>
      </section>

      <section aria-labelledby="edu-h" className="space-y-2">
        <h2 id="edu-h" className="text-lg font-semibold">
          {t("education")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("educationHelp")}</p>
        <select
          aria-labelledby="edu-h"
          value={educationLevel ?? ""}
          onChange={(e) => setEducation(e.target.value ? Number(e.target.value) : null)}
          className="border-input bg-card h-10 w-full rounded-lg border px-3 text-sm sm:w-80"
        >
          <option value="">{t("educationSkip")}</option>
          {EQF.map((l) => (
            <option key={l} value={l}>
              {t(`eqf.${l}`)}
            </option>
          ))}
        </select>
      </section>

      {mode === "onboarding" ? (
        <StepFooter back="/onboarding/cv" pending={pending} error={error} />
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
