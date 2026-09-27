import { getTranslations } from "next-intl/server";
import { CheckCircle2, Circle } from "lucide-react";
import { ScoreRing } from "@/components/magic/score-ring";

export type StrengthKey =
  "skills" | "experience" | "languages" | "location" | "interests" | "values";

/** Profile completeness: the more complete, the fewer matches are flagged "limited data". */
export async function ProfileStrength({ done }: { done: Record<StrengthKey, boolean> }) {
  const t = await getTranslations("profile.strength");
  const keys = Object.keys(done) as StrengthKey[];
  const pct = Math.round((keys.filter((k) => done[k]).length / keys.length) * 100);
  return (
    <section
      aria-labelledby="strength"
      className="bg-card shadow-soft relative overflow-hidden rounded-2xl border p-5 sm:p-6"
    >
      <div
        aria-hidden
        className="bg-brand-gradient absolute -top-16 -right-16 size-48 rounded-full opacity-10 blur-2xl"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <ScoreRing score={pct} size={76} stroke={7} label={t("aria", { pct })} />
        <div className="flex-1 space-y-3">
          <div>
            <h2 id="strength" className="font-semibold">
              {t("title")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {pct === 100 ? t("complete") : t("text")}
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {keys.map((k) => (
              <li
                key={k}
                className={
                  done[k]
                    ? "bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    : "text-muted-foreground inline-flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs"
                }
              >
                {done[k] ? (
                  <CheckCircle2 aria-hidden className="size-3.5" />
                ) : (
                  <Circle aria-hidden className="size-3.5" />
                )}
                {t(`items.${k}`)}
                <span className="sr-only">{done[k] ? t("done") : t("todo")}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
