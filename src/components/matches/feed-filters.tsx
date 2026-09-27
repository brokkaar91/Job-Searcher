"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Search, X } from "lucide-react";
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
        "focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-all focus-visible:ring-2 active:scale-95",
        active
          ? "border-primary bg-accent text-accent-foreground shadow-sm"
          : "bg-card hover:border-primary/40 hover:bg-muted",
      )}
    >
      {active && <Check aria-hidden className="size-3.5" />}
      {children}
    </button>
  );
}

/** URL-driven filters & sorting for the match feed (shareable, back-button friendly). */
export function FeedFilters() {
  const t = useTranslations("feed.filters");
  const tl = useTranslations("matching.labels");
  const tb = useTranslations("feed.badges.remote");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
    start(() => router.replace(`${pathname}?${next.toString()}` as never, { scroll: false }));
  };

  // Debounced free-text search.
  useEffect(() => {
    if ((params.get("q") ?? "") === q.trim()) return;
    const id = setTimeout(() => set("q", q.trim() || null), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const labels = params.get("label")?.split(",").filter(Boolean) ?? [];
  const toggleLabel = (l: string) =>
    set("label", (labels.includes(l) ? labels.filter((x) => x !== l) : [...labels, l]).join(","));
  const view = params.get("view") ?? "all";
  const remote = params.get("remote");
  const activeCount =
    labels.length + (remote ? 1 : 0) + (params.get("hidden") ? 1 : 0) + (params.get("q") ? 1 : 0);

  return (
    <div
      className="glass sticky top-16 z-30 -mx-4 space-y-3 border-b px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:px-4"
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label={t("view")}
          className="bg-muted inline-flex rounded-full p-1"
        >
          {(["all", "saved", "dismissed"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => set("view", v === "all" ? null : v)}
              className={cn(
                "text-muted-foreground hover:text-foreground rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                view === v && "bg-card text-foreground shadow-sm",
              )}
            >
              {t(`views.${v}`)}
            </button>
          ))}
        </div>
        <div className="relative min-w-48 flex-1">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="bg-card focus-visible:ring-ring/50 focus-visible:border-primary h-9 w-full rounded-full border pr-9 pl-9 text-sm outline-none focus-visible:ring-[3px]"
          />
          {pending && (
            <Loader2
              aria-hidden
              className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
            />
          )}
        </div>
        <label className="text-muted-foreground flex items-center gap-2 text-sm whitespace-nowrap">
          {t("sort")}
          <select
            value={params.get("sort") ?? "score"}
            onChange={(e) => set("sort", e.target.value === "score" ? null : e.target.value)}
            className="bg-card text-foreground h-9 rounded-full border px-3 text-sm"
          >
            <option value="score">{t("sorts.score")}</option>
            <option value="new">{t("sorts.new")}</option>
            <option value="salary">{t("sorts.salary")}</option>
          </select>
        </label>
      </div>
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
        {(["strong", "good", "possible"] as const).map((l) => (
          <Chip key={l} active={labels.includes(l)} onClick={() => toggleLabel(l)}>
            {tl(l)}
          </Chip>
        ))}
        <span aria-hidden className="bg-border mx-1 h-5 w-px shrink-0" />
        {(["remote", "hybrid", "onsite"] as const).map((r) => (
          <Chip
            key={r}
            active={remote === r}
            onClick={() => set("remote", remote === r ? null : r)}
          >
            {tb(r)}
          </Chip>
        ))}
        <span aria-hidden className="bg-border mx-1 h-5 w-px shrink-0" />
        <Chip
          active={params.get("hidden") === "1"}
          onClick={() => set("hidden", params.get("hidden") ? null : "1")}
        >
          {t("showHidden")}
        </Chip>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              const next = new URLSearchParams();
              if (params.get("view")) next.set("view", params.get("view")!);
              if (params.get("sort")) next.set("sort", params.get("sort")!);
              start(() =>
                router.replace(`${pathname}?${next.toString()}` as never, { scroll: false }),
              );
            }}
            className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1 text-sm whitespace-nowrap"
          >
            <X aria-hidden className="size-3.5" /> {t("clear", { count: activeCount })}
          </button>
        )}
      </div>
    </div>
  );
}
