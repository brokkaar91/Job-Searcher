"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FlaskConical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { COMPONENTS, KNOCKOUT_RULES } from "@/core/matching/types";
import type { ModelConfig } from "@/core/matching/config";
import { createModelVersion, testModel, type TestRow } from "@/app/[locale]/admin/matching/actions";
import { cn } from "@/lib/utils";

export function ModelEditor({
  base,
  demoProfiles,
}: {
  base: ModelConfig;
  demoProfiles: { id: string; label: string }[];
}) {
  const t = useTranslations("admin.matching");
  const tm = useTranslations("matching");
  const [cfg, setCfg] = useState<ModelConfig>(base);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [profile, setProfile] = useState(demoProfiles[0]?.id ?? "");
  const [rows, setRows] = useState<TestRow[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const sum = COMPONENTS.reduce((s, k) => s + cfg.weights[k], 0);
  const setKo = <K extends keyof ModelConfig["knockouts"]>(
    k: K,
    patch: Partial<ModelConfig["knockouts"][K]>,
  ) =>
    setCfg((c) => ({ ...c, knockouts: { ...c.knockouts, [k]: { ...c.knockouts[k], ...patch } } }));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("weights")}</CardTitle>
            <Badge variant={sum === 100 ? "success" : "destructive"}>{t("sum", { sum })}</Badge>
          </CardHeader>
          {COMPONENTS.map((k) => (
            <div key={k} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3">
              <Label id={`w-${k}`}>{tm(`components.${k}`)}</Label>
              <Slider
                aria-labelledby={`w-${k}`}
                aria-label={tm(`components.${k}`)}
                min={0}
                max={60}
                step={1}
                value={[cfg.weights[k]]}
                onValueChange={([v]) =>
                  setCfg({ ...cfg, weights: { ...cfg.weights, [k]: v ?? 0 } })
                }
              />
              <span className="text-right tabular-nums">{cfg.weights[k]}%</span>
            </div>
          ))}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("knockouts")}</CardTitle>
          </CardHeader>
          {KNOCKOUT_RULES.map((rule) => (
            <div
              key={rule}
              className="flex flex-wrap items-center gap-3 border-t pt-3 first:border-0 first:pt-0"
            >
              <label className="flex min-w-48 items-center gap-3">
                <Switch
                  checked={cfg.knockouts[rule].enabled}
                  onCheckedChange={(enabled) => setKo(rule, { enabled })}
                  aria-label={tm(`rules.${rule}`)}
                />
                <span className="text-sm font-medium">{tm(`rules.${rule}`)}</span>
              </label>
              {rule === "language" && (
                <label className="flex items-center gap-2 text-sm">
                  {t("tolerance")}
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    className="h-8 w-16"
                    value={cfg.knockouts.language.toleranceLevels}
                    onChange={(e) => setKo("language", { toleranceLevels: Number(e.target.value) })}
                  />
                </label>
              )}
              {rule === "location" && (
                <label className="flex items-center gap-2 text-sm">
                  {t("grace")}
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    className="h-8 w-16"
                    value={cfg.knockouts.location.graceMinutes}
                    onChange={(e) => setKo("location", { graceMinutes: Number(e.target.value) })}
                  />
                </label>
              )}
              {rule === "salary" && (
                <label className="flex items-center gap-2 text-sm">
                  {t("salaryTolerance")}
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    className="h-8 w-16"
                    value={cfg.knockouts.salary.tolerancePct}
                    onChange={(e) => setKo("salary", { tolerancePct: Number(e.target.value) })}
                  />
                </label>
              )}
            </div>
          ))}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("thresholds")}</CardTitle>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["strong", "good", "possible"] as const).map((k) => (
              <div key={k} className="grid gap-1.5">
                <Label htmlFor={`th-${k}`}>{tm(`labels.${k}`)}</Label>
                <Input
                  id={`th-${k}`}
                  type="number"
                  min={0}
                  max={100}
                  value={cfg.thresholds[k]}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      thresholds: { ...cfg.thresholds, [k]: Number(e.target.value) },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="grid gap-1.5">
            <Label htmlFor="model-name">{t("name")}</Label>
            <Input
              id="model-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="model-notes">{t("notes")}</Label>
            <Textarea
              id="model-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
            />
          </div>
          {errors.length > 0 && (
            <ul role="alert" className="text-destructive text-sm">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <Button
            className="self-start"
            disabled={pending || sum !== 100 || name.trim().length < 2}
            onClick={() =>
              start(async () => {
                const r = await createModelVersion({ name, notes, config: cfg });
                if (!r.ok) return setErrors(r.errors);
                setErrors([]);
                toast.success(t("created", { version: r.version }));
              })
            }
          >
            <Save aria-hidden /> {t("saveVersion")}
          </Button>
        </Card>
      </div>

      <Card className="h-fit xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle>{t("test.title")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("test.help")}</p>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label={t("test.profile")}
            className="bg-card h-10 flex-1 rounded-lg border px-3 text-sm"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
          >
            {demoProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={pending || !profile || sum !== 100}
            onClick={() =>
              start(async () => {
                const r = await testModel(cfg, profile);
                if (!r.ok) return setErrors(r.errors);
                setRows(r.rows);
              })
            }
          >
            <FlaskConical aria-hidden /> {t("test.run")}
          </Button>
        </div>
        {rows && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="py-2">{t("test.job")}</th>
                <th className="py-2 text-right">{t("test.current")}</th>
                <th className="py-2 text-right">{t("test.draft")}</th>
                <th className="py-2 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const delta = Math.round((r.draft.score - r.current.score) * 10) / 10;
                return (
                  <tr key={r.jobId} className="border-t">
                    <td className="py-1.5 pr-2">
                      <span className="font-medium">{r.title}</span>
                      <span className="text-muted-foreground block text-xs">{r.company}</span>
                    </td>
                    <td
                      className={cn(
                        "py-1.5 text-right tabular-nums",
                        r.current.knockedOut && "text-muted-foreground line-through",
                      )}
                    >
                      {Math.round(r.current.score)}
                    </td>
                    <td
                      className={cn(
                        "py-1.5 text-right tabular-nums",
                        r.draft.knockedOut && "text-muted-foreground line-through",
                      )}
                    >
                      {Math.round(r.draft.score)}
                    </td>
                    <td
                      className={cn(
                        "py-1.5 text-right tabular-nums",
                        delta > 0
                          ? "text-success"
                          : delta < 0
                            ? "text-destructive"
                            : "text-muted-foreground",
                      )}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="text-muted-foreground text-xs">{t("test.note")}</p>
      </Card>
    </div>
  );
}
