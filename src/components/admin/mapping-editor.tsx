"use client";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MAPPABLE_FIELDS,
  REQUIRED_FIELDS,
  TRANSFORMS,
  type FieldMapping,
  type FieldRule,
  type MapResult,
  type MappableField,
} from "@/core/connectors/mapping";
import {
  loadFeedSample,
  previewMapping,
  saveMapping,
  suggestFieldMapping,
} from "@/app/[locale]/admin/connectors/actions";

const cell = "h-9 w-full rounded-md border border-input bg-card px-2 text-sm";

/** Field mapping editor with a live preview on a sample record from the feed. */
export function MappingEditor({
  connectorId,
  initial,
  initialSample,
  version,
}: {
  connectorId: string;
  initial: FieldMapping;
  initialSample: unknown;
  version: number;
}) {
  const t = useTranslations("admin.mapping");
  const [mapping, setMapping] = useState<FieldMapping>(initial);
  const [samples, setSamples] = useState<unknown[]>(initialSample ? [initialSample] : []);
  const [sampleIdx, setSampleIdx] = useState(0);
  const [preview, setPreview] = useState<MapResult | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const sample = samples[sampleIdx];

  // Live preview (debounced) whenever mapping or sample changes.
  useEffect(() => {
    if (sample == null) return;
    const h = setTimeout(() => {
      previewMapping(sample, mapping).then(setPreview);
    }, 250);
    return () => clearTimeout(h);
  }, [mapping, sample]);

  const setRule = (field: MappableField, patch: Partial<FieldRule> | null) =>
    setMapping((m) => {
      const fields = { ...m.fields };
      if (patch === null) delete fields[field];
      else fields[field] = { transform: "none", ...fields[field], ...patch };
      return { ...m, fields };
    });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Card>
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="format">{t("format")}</Label>
              <select
                id="format"
                className={cell}
                value={mapping.format}
                onChange={(e) =>
                  setMapping({ ...mapping, format: e.target.value as "json" | "xml" })
                }
              >
                <option value="json">JSON</option>
                <option value="xml">XML</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="itemsPath">{t("itemsPath")}</Label>
              <Input
                id="itemsPath"
                value={mapping.itemsPath}
                onChange={(e) => setMapping({ ...mapping, itemsPath: e.target.value })}
                className="font-mono"
              />
            </div>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await loadFeedSample(connectorId, mapping.format, mapping.itemsPath);
                  if (!r.ok) return void toast.error(r.message);
                  setSamples(r.sample);
                  setSampleIdx(0);
                  setItemCount(r.count);
                })
              }
            >
              <Download aria-hidden /> {t("loadSample")}
            </Button>
          </div>
          {itemCount != null && (
            <p className="text-muted-foreground text-sm">{t("items", { count: itemCount })}</p>
          )}
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("fields")}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              disabled={!sample || pending}
              onClick={() =>
                start(async () =>
                  setMapping(
                    await suggestFieldMapping(
                      sample as Record<string, unknown>,
                      mapping.format,
                      mapping.itemsPath,
                    ),
                  ),
                )
              }
            >
              <Wand2 aria-hidden /> {t("suggest")}
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="py-2 pr-2">{t("cols.field")}</th>
                  <th className="py-2 pr-2">{t("cols.path")}</th>
                  <th className="py-2 pr-2">{t("cols.transform")}</th>
                  <th className="py-2">{t("cols.default")}</th>
                </tr>
              </thead>
              <tbody>
                {MAPPABLE_FIELDS.map((f) => {
                  const rule = mapping.fields[f];
                  return (
                    <tr key={f} className="border-t">
                      <td className="py-1.5 pr-2 font-mono text-xs whitespace-nowrap">
                        {f}{" "}
                        {REQUIRED_FIELDS.includes(f) && <span className="text-destructive">*</span>}
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          aria-label={t("pathFor", { field: f })}
                          className={`${cell} font-mono`}
                          placeholder="$.title  or  {{$.a}} {{$.b}}"
                          value={rule?.template ?? rule?.path ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v && !rule?.default) return setRule(f, null);
                            setRule(
                              f,
                              v.includes("{{")
                                ? { template: v, path: undefined }
                                : { path: v, template: undefined },
                            );
                          }}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <select
                          aria-label={t("transformFor", { field: f })}
                          className={cell}
                          value={rule?.transform ?? "none"}
                          onChange={(e) =>
                            setRule(f, { transform: e.target.value as FieldRule["transform"] })
                          }
                        >
                          {TRANSFORMS.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5">
                        <input
                          aria-label={t("defaultFor", { field: f })}
                          className={cell}
                          value={rule?.default != null ? String(rule.default) : ""}
                          onChange={(e) => setRule(f, { default: e.target.value || undefined })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button
            className="self-start"
            disabled={pending || !preview?.job}
            onClick={() =>
              start(async () => {
                const r = await saveMapping(connectorId, mapping, sample);
                toast.success(t("saved", { version: r.version }));
              })
            }
          >
            <Save aria-hidden /> {t("save", { version: version + 1 })}
          </Button>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("preview")}</CardTitle>
            {samples.length > 1 && (
              <select
                aria-label={t("sampleSelect")}
                className="bg-card h-8 rounded-md border px-2 text-sm"
                value={sampleIdx}
                onChange={(e) => setSampleIdx(Number(e.target.value))}
              >
                {samples.map((_, i) => (
                  <option key={i} value={i}>
                    #{i + 1}
                  </option>
                ))}
              </select>
            )}
          </CardHeader>
          {!sample && <p className="text-muted-foreground text-sm">{t("noSample")}</p>}
          {preview && (
            <div className="space-y-3" aria-live="polite">
              {preview.errors.length ? (
                <ul className="text-destructive space-y-1 text-sm">
                  {preview.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : (
                <Badge variant="success">{t("valid")}</Badge>
              )}
              {preview.job && (
                <pre className="bg-muted max-h-[32rem] overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
                  {JSON.stringify(preview.job, null, 2)}
                </pre>
              )}
            </div>
          )}
        </Card>
        {sample != null && (
          <Card>
            <CardHeader>
              <CardTitle>{t("raw")}</CardTitle>
            </CardHeader>
            <pre className="bg-muted max-h-80 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
              {JSON.stringify(sample, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
}
