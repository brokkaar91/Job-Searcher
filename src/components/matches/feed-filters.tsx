"use client";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-2",
        active ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** URL-driven filters & sorting for the match feed (shareable, back-button friendly). */
export function FeedFilters() {
  const t = useTranslations("feed.filters");
  const tl = useTranslations("matching.labels");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
    start(() => router.replace(`${pathname}?${next.toString()}` as never, { scroll: false }));
  };
  const labels = params.get("label")?.split(",").filter(Boolean) ?? [];
  const toggleLabel = (l: string) =>
    set("label", (labels.includes(l) ? labels.filter((x) => x !== l) : [...labels, l]).join(","));
  const view = params.get("view") ?? "all";

  return (
    <div className={cn("space-y-3", pending && "opacity-70")} aria-busy={pending}>
      <div role="tablist" aria-label={t("view")} className="bg-muted inline-flex rounded-full p-1">
        {(["all", "saved", "dismissed"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => set("view", v === "all" ? null : v)}
            className={cn(
              "text-muted-foreground rounded-full px-3.5 py-1.5 text-sm font-medium",
              view === v && "bg-card text-foreground shadow-sm",
            )}
          >
            {t(`views.${v}`)}
          </button>
        ))}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {(["strong", "good", "possible"] as const).map((l) => (
          <Chip key={l} active={labels.includes(l)} onClick={() => toggleLabel(l)}>
            {tl(l)}
          </Chip>
        ))}
        <Chip
          active={params.get("sponsor") === "1"}
          onClick={() => set("sponsor", params.get("sponsor") ? null : "1")}
        >
          {t("sponsor")}
        </Chip>
        <Chip
          active={params.get("remote") === "remote"}
          onClick={() => set("remote", params.get("remote") === "remote" ? null : "remote")}
        >
          {t("remote")}
        </Chip>
        <Chip
          active={params.get("lang") === "en"}
          onClick={() => set("lang", params.get("lang") === "en" ? null : "en")}
        >
          {t("english")}
        </Chip>
        <Chip
          active={params.get("hidden") === "1"}
          onClick={() => set("hidden", params.get("hidden") ? null : "1")}
        >
          {t("showHidden")}
        </Chip>
        <label className="text-muted-foreground ml-auto flex items-center gap-2 text-sm whitespace-nowrap">
          {t("sort")}
          <select
            value={params.get("sort") ?? "score"}
            onChange={(e) => set("sort", e.target.value === "score" ? null : e.target.value)}
            className="bg-card text-foreground h-8 rounded-full border px-3 text-sm"
          >
            <option value="score">{t("sorts.score")}</option>
            <option value="new">{t("sorts.new")}</option>
            <option value="salary">{t("sorts.salary")}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
