import { getTranslations } from "next-intl/server";
import { Globe2, Home, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MatchLabel } from "@/core/matching/types";

const LABEL_VARIANT: Record<MatchLabel, "success" | "accent" | "secondary" | "outline"> = {
  strong: "success",
  good: "accent",
  possible: "secondary",
  weak: "outline",
};

export async function LabelBadge({ label, score }: { label: MatchLabel; score?: number }) {
  const t = await getTranslations("matching.labels");
  return (
    <Badge variant={LABEL_VARIANT[label]} className="text-[13px]">
      {t(label)}
      {score != null && <span className="tabular-nums">· {Math.round(score)}</span>}
    </Badge>
  );
}

export async function JobBadges({
  remotePolicy,
  language,
  city,
  isNew,
}: {
  remotePolicy: string | null;
  language: string | null;
  city: string | null;
  isNew?: boolean;
}) {
  const t = await getTranslations("feed.badges");
  return (
    <div className="flex flex-wrap gap-1.5">
      {isNew && (
        <Badge variant="default">
          <Sparkles aria-hidden /> {t("new")}
        </Badge>
      )}
      {city && (
        <Badge variant="outline">
          <MapPin aria-hidden /> {city}
        </Badge>
      )}
      {remotePolicy && (
        <Badge variant="outline">
          <Home aria-hidden /> {t(`remote.${remotePolicy as "onsite" | "hybrid" | "remote"}`)}
        </Badge>
      )}
      {language && (
        <Badge variant="outline" title={t("languageTitle")}>
          <Globe2 aria-hidden /> {language.toUpperCase()}
        </Badge>
      )}
    </div>
  );
}
