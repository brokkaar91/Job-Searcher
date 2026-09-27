"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EscoAutocomplete } from "@/components/onboarding/esco-autocomplete";
import { CEFR_LEVELS, SENIORITY_LEVELS, type Cefr, type Seniority } from "@/core/matching/types";
import { moderateJob, updateJobClassification } from "@/app/[locale]/admin/jobs/actions";

export function ModerationButtons({ id, status }: { id: string; status: string }) {
  const t = useTranslations("admin.jobs");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const act = (s: "published" | "rejected" | "archived") =>
    start(async () => {
      await moderateJob({ id, status: s, note: note || undefined });
      toast.success(t(`moderated.${s}`));
    });
  return (
    <div className="space-y-3">
      <Input
        aria-label={t("note")}
        placeholder={t("note")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {status !== "published" && (
          <Button size="sm" disabled={pending} onClick={() => act("published")}>
            <Check aria-hidden /> {t("approve")}
          </Button>
        )}
        {status !== "rejected" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act("rejected")}>
            <X aria-hidden /> {t("reject")}
          </Button>
        )}
        {status !== "archived" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("archived")}>
            {t("archive")}
          </Button>
        )}
      </div>
    </div>
  );
}

interface Classification {
  escoOccupationUri: string | null;
  occupationLabel: string | null;
  seniority: Seniority | null;
  visaSponsorship: boolean | null;
  skills: { uri: string; label: string; importance: "must" | "nice" }[];
  languageRequirements: { language: string; level: Cefr; required: boolean }[];
}

export function ClassificationEditor({ id, initial }: { id: string; initial: Classification }) {
  const t = useTranslations("admin.jobs.classification");
  const [c, setC] = useState(initial);
  const [publish, setPublish] = useState(true);
  const [pending, start] = useTransition();
  const sel = "h-9 rounded-md border border-input bg-card px-2 text-sm";
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5 sm:col-span-3">
          <Label>{t("occupation")}</Label>
          <div className="flex flex-wrap items-center gap-2">
            {c.escoOccupationUri ? (
              <Badge variant="accent">{c.occupationLabel}</Badge>
            ) : (
              <Badge variant="destructive">{t("none")}</Badge>
            )}
          </div>
          <EscoAutocomplete
            kind="occupations"
            label={t("occupation")}
            placeholder={t("searchOccupation")}
            onSelect={(o) => setC({ ...c, escoOccupationUri: o.uri, occupationLabel: o.label })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="seniority">{t("seniority")}</Label>
          <select
            id="seniority"
            className={sel}
            value={c.seniority ?? ""}
            onChange={(e) =>
              setC({ ...c, seniority: (e.target.value || null) as Seniority | null })
            }
          >
            <option value="">–</option>
            {SENIORITY_LEVELS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sponsor">{t("sponsorship")}</Label>
          <select
            id="sponsor"
            className={sel}
            value={c.visaSponsorship == null ? "" : String(c.visaSponsorship)}
            onChange={(e) =>
              setC({
                ...c,
                visaSponsorship: e.target.value === "" ? null : e.target.value === "true",
              })
            }
          >
            <option value="">{t("unknown")}</option>
            <option value="true">{t("yes")}</option>
            <option value="false">{t("no")}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("skills")}</Label>
        <ul className="flex flex-wrap gap-2">
          {c.skills.map((s, i) => (
            <li key={s.uri}>
              <Badge
                variant={s.importance === "must" ? "accent" : "outline"}
                className="gap-1 py-1 pr-1 pl-3"
              >
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  title={t("toggleImportance")}
                  onClick={() =>
                    setC({
                      ...c,
                      skills: c.skills.map((x, j) =>
                        j === i
                          ? { ...x, importance: x.importance === "must" ? "nice" : "must" }
                          : x,
                      ),
                    })
                  }
                >
                  {s.label} · {t(s.importance)}
                </button>
                <button
                  type="button"
                  aria-label={t("remove", { skill: s.label })}
                  className="hover:bg-background/60 rounded-full p-1"
                  onClick={() => setC({ ...c, skills: c.skills.filter((_, j) => j !== i) })}
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
        <EscoAutocomplete
          kind="skills"
          label={t("addSkill")}
          placeholder={t("addSkill")}
          exclude={c.skills.map((s) => s.uri)}
          onSelect={(o) =>
            o.mapped &&
            setC({
              ...c,
              skills: [...c.skills, { uri: o.uri, label: o.label, importance: "must" }],
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>{t("languages")}</Label>
        {c.languageRequirements.map((l, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              aria-label={t("language")}
              className="h-9 w-20"
              maxLength={2}
              value={l.language}
              onChange={(e) =>
                setC({
                  ...c,
                  languageRequirements: c.languageRequirements.map((x, j) =>
                    j === i ? { ...x, language: e.target.value.toLowerCase() } : x,
                  ),
                })
              }
            />
            <select
              aria-label={t("level")}
              className={sel}
              value={l.level}
              onChange={(e) =>
                setC({
                  ...c,
                  languageRequirements: c.languageRequirements.map((x, j) =>
                    j === i ? { ...x, level: e.target.value as Cefr } : x,
                  ),
                })
              }
            >
              {CEFR_LEVELS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={l.required}
                onCheckedChange={(v) =>
                  setC({
                    ...c,
                    languageRequirements: c.languageRequirements.map((x, j) =>
                      j === i ? { ...x, required: v === true } : x,
                    ),
                  })
                }
              />{" "}
              {t("required")}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("removeLanguage")}
              onClick={() =>
                setC({
                  ...c,
                  languageRequirements: c.languageRequirements.filter((_, j) => j !== i),
                })
              }
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setC({
              ...c,
              languageRequirements: [
                ...c.languageRequirements,
                { language: "nl", level: "B2", required: true },
              ],
            })
          }
        >
          <Plus aria-hidden /> {t("addLanguage")}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={publish} onCheckedChange={(v) => setPublish(v === true)} />{" "}
        {t("publish")}
      </label>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await updateJobClassification({
              id,
              escoOccupationUri: c.escoOccupationUri,
              seniority: c.seniority,
              visaSponsorship: c.visaSponsorship,
              skills: c.skills,
              languageRequirements: c.languageRequirements,
              publish,
            });
            toast.success(t("saved"));
          })
        }
      >
        {t("save")}
      </Button>
    </div>
  );
}
