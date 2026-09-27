"use client";
import { useActionState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteCvVersion, uploadNewCv, type CvState } from "@/app/[locale]/(app)/profile/actions";

export interface CvVersion {
  id: string;
  version: number;
  fileName: string;
  createdAt: string;
  status: string;
  current: boolean;
}

export function CvVersions({ versions }: { versions: CvVersion[] }) {
  const t = useTranslations("profile.cv");
  const te = useTranslations("onboarding.cv.errors");
  const format = useFormatter();
  const [state, action, uploading] = useActionState<CvState, FormData>(uploadNewCv, {
    status: "idle",
  });
  const [pending, start] = useTransition();
  return (
    <div className="space-y-5">
      <ul className="bg-card divide-y rounded-xl border">
        {versions.length === 0 && (
          <li className="text-muted-foreground p-4 text-sm">{t("none")}</li>
        )}
        {versions.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-3 p-4">
            <FileText aria-hidden className="text-primary size-5" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {t("version", { version: v.version })} · {v.fileName}
              </p>
              <p className="text-muted-foreground text-xs">
                {format.dateTime(new Date(v.createdAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            {v.current && <Badge variant="accent">{t("current")}</Badge>}
            {v.status === "failed" && <Badge variant="destructive">{t("parseFailed")}</Badge>}
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={t("download", { version: v.version })}
            >
              <a href={`/api/cv/${v.id}`}>
                <Download aria-hidden />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("delete", { version: v.version })}
              disabled={pending}
              onClick={() => confirm(t("confirmDelete")) && start(() => deleteCvVersion(v.id))}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <label htmlFor="new-cv" className="sr-only">
          {t("uploadLabel")}
        </label>
        <Input id="new-cv" name="cv" type="file" accept=".pdf,.docx" className="max-w-xs" />
        <Button type="submit" variant="outline" disabled={uploading}>
          {uploading ? <Loader2 aria-hidden className="animate-spin" /> : <Upload aria-hidden />}{" "}
          {t("upload")}
        </Button>
        {state.status === "ok" && (
          <span role="status" className="text-success text-sm">
            {t("uploaded")}
          </span>
        )}
        {state.status === "error" && (
          <span role="alert" className="text-destructive text-sm">
            {te(state.error ?? "failed")}
          </span>
        )}
      </form>
      <p className="text-muted-foreground text-xs">{t("help")}</p>
    </div>
  );
}
