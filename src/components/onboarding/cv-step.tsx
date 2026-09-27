"use client";
import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { skipCv, uploadCv, type UploadState } from "@/app/[locale]/(app)/onboarding/actions";

export function CvStep({ lastFile }: { lastFile: string | null }) {
  const t = useTranslations("onboarding.cv");
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadCv, {
    status: "idle",
  });
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <label
          htmlFor="cv"
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f && input.current) {
              const dt = new DataTransfer();
              dt.items.add(f);
              input.current.files = dt.files;
              setFile(f);
            }
          }}
          className={cn(
            "bg-card focus-within:ring-ring/40 hover:border-primary/60 flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors focus-within:ring-[3px]",
            drag && "border-primary bg-accent",
          )}
        >
          {file ? (
            <FileText aria-hidden className="text-primary size-10" />
          ) : (
            <UploadCloud aria-hidden className="text-primary size-10" />
          )}
          <span className="font-medium">{file ? file.name : t("drop")}</span>
          <span className="text-muted-foreground text-sm">{t("formats")}</span>
          <input
            ref={input}
            id="cv"
            name="cv"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {lastFile && !file && (
          <p className="text-muted-foreground text-sm">{t("current", { file: lastFile })}</p>
        )}
        {state.status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            {t(`errors.${state.error ?? "failed"}`)}
          </p>
        )}
        {pending && (
          <p role="status" className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 aria-hidden className="size-4 animate-spin" /> {t("parsing")}
          </p>
        )}
        <Button type="submit" disabled={!file || pending} className="w-full sm:w-auto">
          {t("upload")}
        </Button>
      </form>
      <Card className="flex-row items-start gap-3 p-4 text-sm">
        <ShieldCheck aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
        <p className="text-muted-foreground">{t("privacy")}</p>
      </Card>
      <form action={skipCv}>
        <Button type="submit" variant="link" className="px-0">
          {t("skip")}
        </Button>
      </form>
    </div>
  );
}
