"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Activity, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  deleteConnector,
  healthcheckConnector,
  syncConnectorNow,
  toggleConnector,
} from "@/app/[locale]/admin/connectors/actions";

export function ConnectorToggle({
  id,
  enabled,
  label,
}: {
  id: string;
  enabled: boolean;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Switch
      aria-label={label}
      checked={enabled}
      disabled={pending}
      onCheckedChange={(v) => start(() => toggleConnector(id, v))}
    />
  );
}

export function ConnectorActions({ id }: { id: string }) {
  const t = useTranslations("admin.connectors.actions");
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"health" | "sync" | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          setBusy("health");
          start(async () => {
            const r = await healthcheckConnector(id);
            (r.ok ? toast.success : toast.error)(r.message);
            setBusy(null);
          });
        }}
      >
        {busy === "health" ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <Activity aria-hidden />
        )}{" "}
        {t("healthcheck")}
      </Button>
      <Button
        disabled={pending}
        onClick={() => {
          setBusy("sync");
          start(async () => {
            try {
              const r = await syncConnectorNow(id);
              if (r.queued) toast(t("queued"));
              else
                toast(
                  t("finished", {
                    status: r.status,
                    new: r.counts.new,
                    updated: r.counts.updated,
                    duplicate: r.counts.duplicate,
                    failed: r.counts.failed,
                  }),
                );
            } catch (e) {
              toast.error((e as Error).message);
            }
            setBusy(null);
          });
        }}
      >
        {busy === "sync" ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <RefreshCw aria-hidden />
        )}{" "}
        {t("sync")}
      </Button>
      <Button
        variant="ghost"
        className="text-destructive"
        disabled={pending}
        onClick={() => confirm(t("confirmDelete")) && start(() => deleteConnector(id))}
      >
        <Trash2 aria-hidden /> {t("delete")}
      </Button>
    </div>
  );
}
