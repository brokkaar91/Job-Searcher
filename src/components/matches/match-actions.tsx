"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, ExternalLink, ThumbsDown, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  applyToJob,
  dismissJob,
  saveJob,
  undoDismiss,
  unsaveJob,
} from "@/app/[locale]/(app)/matches/actions";

const REASONS = [
  "salary",
  "location",
  "role",
  "language",
  "seniority",
  "company",
  "contract",
  "already_applied",
  "other",
] as const;
type Reason = (typeof REASONS)[number];
type Feedback = "saved" | "dismissed" | "applied" | null;

function DismissDialog({
  jobId,
  open,
  onOpenChange,
}: {
  jobId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("feed.dismiss");
  const [reason, setReason] = useState<Reason | "">("");
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={reason}
          onValueChange={(v) => setReason(v as Reason)}
          className="grid gap-2 sm:grid-cols-2"
        >
          {REASONS.map((r) => (
            <Label
              key={r}
              className="has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 font-normal"
            >
              <RadioGroupItem value={r} /> {t(`reasons.${r}`)}
            </Label>
          ))}
        </RadioGroup>
        <div className="grid gap-1.5">
          <Label htmlFor={`comment-${jobId}`}>{t("comment")}</Label>
          <Textarea
            id={`comment-${jobId}`}
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!reason || pending}
            onClick={() =>
              start(async () => {
                await dismissJob({ id: jobId, reason: reason as Reason, comment });
                onOpenChange(false);
                toast(t("done"), {
                  action: { label: t("undo"), onClick: () => void undoDismiss(jobId) },
                });
              })
            }
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Save / dismiss buttons (feed cards and detail page). */
export function MatchQuickActions({ jobId, feedback }: { jobId: string; feedback: Feedback }) {
  const t = useTranslations("feed.actions");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const saved = feedback === "saved" || feedback === "applied";
  return (
    <>
      {feedback === "dismissed" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => start(() => undoDismiss(jobId))}
        >
          <Undo2 aria-hidden /> {t("undoDismiss")}
        </Button>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || feedback === "applied"}
            aria-pressed={saved}
            onClick={() =>
              start(async () => {
                if (saved) await unsaveJob(jobId);
                else {
                  await saveJob(jobId);
                  toast(t("savedToast"));
                }
              })
            }
          >
            {saved ? (
              <BookmarkCheck aria-hidden className="text-primary" />
            ) : (
              <Bookmark aria-hidden />
            )}
            {saved ? t("saved") : t("save")}
          </Button>
          {!saved && (
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              <ThumbsDown aria-hidden /> {t("dismiss")}
            </Button>
          )}
        </>
      )}
      <DismissDialog jobId={jobId} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Apply: log it (tracker → "applied") and open the employer's page in a new tab. */
export function ApplyButton({
  jobId,
  url,
  applied,
}: {
  jobId: string;
  url: string | null;
  applied: boolean;
}) {
  const t = useTranslations("feed.actions");
  const [pending, start] = useTransition();
  if (!url) return null;
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() => {
        window.open(url, "_blank", "noopener,noreferrer");
        if (!applied)
          start(async () => {
            await applyToJob(jobId);
            toast(t("appliedToast"));
          });
      }}
    >
      {applied ? t("applyAgain") : t("apply")} <ExternalLink aria-hidden />
    </Button>
  );
}
