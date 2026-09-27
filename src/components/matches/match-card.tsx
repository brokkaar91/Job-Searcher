import { getFormatter, getTranslations } from "next-intl/server";
import { ChevronRight, EyeOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { renderMessage } from "@/lib/messages";
import type { FeedItem } from "@/server/matches";
import { cn } from "@/lib/utils";
import { JobBadges, LabelBadge } from "./badges";
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
    <Card
      className={cn(
        "relative gap-4 transition-shadow hover:shadow-md",
        item.knockedOut && "border-dashed opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground truncate text-sm">{item.job.companyName}</p>
          <h2 className="text-lg leading-snug font-semibold">
            <Link
              href={`/matches/${item.jobId}`}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              {item.job.title}
            </Link>
          </h2>
        </div>
        <LabelBadge label={item.label} score={item.score} />
      </div>
      <JobBadges
        recognisedSponsor={item.job.recognisedSponsor}
        visaSponsorship={item.job.visaSponsorship}
        remotePolicy={item.job.remotePolicy}
        language={item.job.language}
        city={item.job.city}
        isNew={item.isNew}
      />
      {item.knockedOut && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <EyeOff aria-hidden className="size-4" /> {t("hiddenReason")}
        </p>
      )}
      <ul className="space-y-1.5 text-sm">
        {item.explanation.reasons.slice(0, 3).map((r, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
            {renderMessage(tm, r)}
          </li>
        ))}
      </ul>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <span className="text-sm font-medium tabular-nums">{salary}</span>
        <div className="flex items-center gap-1">
          <MatchQuickActions jobId={item.jobId} feedback={item.feedback} />
          <ChevronRight aria-hidden className="text-muted-foreground size-4" />
        </div>
      </div>
    </Card>
  );
}
