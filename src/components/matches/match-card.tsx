import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowUpRight, EyeOff, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { renderMessage } from "@/lib/messages";
import type { FeedItem } from "@/server/matches";
import { cn } from "@/lib/utils";
import { ScoreRing } from "@/components/magic/score-ring";
import { JobBadges, LabelBadge } from "./badges";
import { CompanyAvatar } from "./company-avatar";
import { MatchQuickActions } from "./match-actions";

export async function MatchCard({ item }: { item: FeedItem }) {
  const t = await getTranslations("feed");
  const tm = await getTranslations("matching");
  const format = await getFormatter();
  const eur = (n: number) =>
    format.number(n, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const salary =
    item.job.salaryMin && item.job.salaryMax
      ? `${eur(item.job.salaryMin)} – ${eur(item.job.salaryMax)}`
      : item.job.salaryMax || item.job.salaryMin
        ? eur((item.job.salaryMax ?? item.job.salaryMin)!)
        : t("salaryUnknown");

  return (
    <article
      className={cn(
        "group bg-card text-card-foreground shadow-soft hover:shadow-lift hover:border-primary/30 relative flex h-full flex-col gap-4 rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 sm:p-6",
        item.knockedOut && "border-dashed opacity-85",
      )}
    >
      <div className="flex items-start gap-4">
        <CompanyAvatar name={item.job.companyName} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-muted-foreground truncate text-sm">{item.job.companyName}</p>
          <h2 className="text-lg leading-snug font-semibold">
            <Link
              href={`/matches/${item.jobId}`}
              className="group-hover:text-primary transition-colors after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
            >
              {item.job.title}
            </Link>
          </h2>
        </div>
        <ScoreRing score={item.score} label={t("scoreAria", { score: Math.round(item.score) })} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <LabelBadge label={item.label} />
        <JobBadges
          remotePolicy={item.job.remotePolicy}
          language={item.job.language}
          city={item.job.city}
          isNew={item.isNew}
        />
      </div>
      {item.knockedOut && (
        <p className="bg-muted text-muted-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
          <EyeOff aria-hidden className="size-4 shrink-0" /> {t("hiddenReason")}
        </p>
      )}
      <ul className="space-y-1.5 text-sm">
        {item.explanation.reasons.slice(0, 3).map((r, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="bg-brand-gradient mt-1.5 size-1.5 shrink-0 rounded-full" />
            {renderMessage(tm, r)}
          </li>
        ))}
      </ul>
      {item.limitedData && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Info aria-hidden className="size-3.5" /> {t("limitedData")}
        </p>
      )}
      <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <span className="text-sm font-semibold tabular-nums">{salary}</span>
        <div className="flex items-center gap-1">
          <MatchQuickActions jobId={item.jobId} feedback={item.feedback} />
          <ArrowUpRight
            aria-hidden
            className="text-muted-foreground group-hover:text-primary size-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </div>
      </div>
    </article>
  );
}
