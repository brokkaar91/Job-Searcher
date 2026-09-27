"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CONNECTOR_FORMS } from "@/core/connectors/forms";
import type { FormState } from "@/app/[locale]/admin/connectors/actions";

const selectCls = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm";

export interface ConnectorFormValues {
  name: string;
  type: string;
  config: Record<string, unknown>;
  credentialKeys: string[];
  syncIntervalMinutes: number;
  sourcePriority: number;
  mayRepublish: boolean;
  enabled: boolean;
}

/** Create/edit connector. Credentials are write-only: stored encrypted, never sent back to the browser. */
export function ConnectorForm({
  action,
  initial,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  initial?: ConnectorFormValues;
}) {
  const t = useTranslations("admin.connectors.form");
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as FormState);
  const [type, setType] = useState(initial?.type ?? "greenhouse");
  const form = CONNECTOR_FORMS[type]!;
  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" required defaultValue={initial?.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="type">{t("type")}</Label>
          <select
            id="type"
            name="type"
            className={selectCls}
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={!!initial}
          >
            {Object.keys(CONNECTOR_FORMS).map((k) => (
              <option key={k} value={k}>
                {t(`types.${k}` as never)}
              </option>
            ))}
          </select>
          {initial && <input type="hidden" name="type" value={type} />}
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-semibold">{t("config")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {form.config.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`config.${f.key}`}>
                {t(`fields.${f.key}` as never)}{" "}
                {f.required && (
                  <span aria-hidden className="text-destructive">
                    *
                  </span>
                )}
              </Label>
              {f.type === "select" ? (
                <select
                  id={`config.${f.key}`}
                  name={`config.${f.key}`}
                  className={selectCls}
                  defaultValue={String(initial?.config[f.key] ?? f.options?.[0] ?? "")}
                >
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`config.${f.key}`}
                  name={`config.${f.key}`}
                  type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                  required={f.required}
                  placeholder={f.placeholder}
                  defaultValue={initial?.config[f.key] != null ? String(initial.config[f.key]) : ""}
                />
              )}
            </div>
          ))}
        </div>
      </fieldset>

      {form.credentials.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="flex items-center gap-2 font-semibold">
            <KeyRound aria-hidden className="size-4" /> {t("credentials")}
          </legend>
          <p className="text-muted-foreground text-sm">{t("credentialsHelp")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {form.credentials.map((f) => (
              <div key={f.key} className="grid gap-1.5">
                <Label htmlFor={`cred.${f.key}`}>{t(`fields.${f.key}` as never)}</Label>
                <Input
                  id={`cred.${f.key}`}
                  name={`cred.${f.key}`}
                  type="password"
                  autoComplete="off"
                  required={f.required && !initial?.credentialKeys.includes(f.key)}
                  placeholder={initial?.credentialKeys.includes(f.key) ? t("secretSet") : ""}
                />
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">{t("scheduling")}</legend>
        <div className="grid gap-1.5">
          <Label htmlFor="syncIntervalMinutes">{t("interval")}</Label>
          <Input
            id="syncIntervalMinutes"
            name="syncIntervalMinutes"
            type="number"
            min={15}
            defaultValue={initial?.syncIntervalMinutes ?? 360}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sourcePriority">{t("priority")}</Label>
          <Input
            id="sourcePriority"
            name="sourcePriority"
            type="number"
            min={0}
            max={100}
            defaultValue={initial?.sourcePriority ?? 50}
            aria-describedby="prio-help"
          />
          <p id="prio-help" className="text-muted-foreground text-xs">
            {t("priorityHelp")}
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch name="mayRepublish" value="on" defaultChecked={initial?.mayRepublish ?? false} />{" "}
          {t("mayRepublish")}
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Switch name="enabled" value="on" defaultChecked={initial?.enabled ?? false} />{" "}
          {t("enabled")}
        </label>
      </fieldset>

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      {state.status === "ok" && (
        <p role="status" className="text-success text-sm">
          {t("saved")}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {initial ? t("save") : t("create")}
      </Button>
    </form>
  );
}
