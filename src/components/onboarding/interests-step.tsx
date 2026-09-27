"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MINI_IP_ITEMS } from "@/core/assessments/mini-ip";
import { saveInterestAnswers, saveInterests } from "@/app/[locale]/(app)/onboarding/actions";
import { cn } from "@/lib/utils";
import { StepFooter } from "./step-footer";

const PAGE_SIZE = 6;
const SCALE = [1, 2, 3, 4, 5] as const;

/** O*NET-based interest profiler: 30 activities, like/dislike on a 5-point scale, 6 per page. */
export function InterestsStep({ initial }: { initial: Record<string, number> }) {
  const t = useTranslations("onboarding.interests");
  const locale = useLocale();
  const [answers, setAnswers] = useState<Record<string, number>>(initial);
  // Resume on the first page with unanswered items.
  const [page, setPage] = useState(() => {
    const first = MINI_IP_ITEMS.findIndex((i) => !initial[i.id]);
    return first < 0 ? 0 : Math.floor(first / PAGE_SIZE);
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pages = Math.ceil(MINI_IP_ITEMS.length / PAGE_SIZE);
  const items = MINI_IP_ITEMS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageComplete = items.every((i) => answers[i.id]);
  const answered = Object.keys(answers).length;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pageComplete) return setError(t("answerAll"));
        setError(null);
        start(async () => {
          if (page < pages - 1) {
            // Save progress per page so the user can resume later.
            const r = await saveInterestAnswers(answers);
            if (!r.ok) return setError(t("error"));
            setPage(page + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
          const r = await saveInterests(answers);
          if (r && !r.ok) setError(t("error"));
        });
      }}
    >
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {t("progress", { answered, total: MINI_IP_ITEMS.length, page: page + 1, pages })}
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="gap-3 p-4">
            <fieldset>
              <legend className="mb-3 font-medium">{locale === "nl" ? item.nl : item.en}</legend>
              <div className="grid grid-cols-5 gap-1.5">
                {SCALE.map((v) => (
                  <label
                    key={v}
                    className={cn(
                      "has-[:focus-visible]:ring-ring flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center text-[11px] leading-tight transition-colors has-[:focus-visible]:ring-2 sm:text-xs",
                      answers[item.id] === v
                        ? "border-primary bg-accent text-accent-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={item.id}
                      value={v}
                      checked={answers[item.id] === v}
                      onChange={() => setAnswers((a) => ({ ...a, [item.id]: v }))}
                    />
                    <span aria-hidden className="text-base">
                      {["😣", "🙁", "😐", "🙂", "😍"][v - 1]}
                    </span>
                    {t(`scale.${v}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        ))}
      </div>
      {page > 0 && (
        <Button type="button" variant="ghost" onClick={() => setPage(page - 1)}>
          {t("previousPage")}
        </Button>
      )}
      <StepFooter
        back={page === 0 ? "/onboarding/preferences" : undefined}
        pending={pending}
        error={error}
        nextLabel={page < pages - 1 ? t("nextPage") : undefined}
      />
    </form>
  );
}
