import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-card shadow-soft rounded-xl border p-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}

/**
 * Single-series horizontal bars (one hue, magnitude only). Values are printed next to each bar,
 * so the list doubles as its table view; the row title is the hover tooltip.
 */
export function BarList({
  rows,
  label,
  empty,
}: {
  rows: { key: string; label: string; value: number }[];
  label: string;
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <ul aria-label={label} className="space-y-2.5">
      {rows.map((r) => (
        <li
          key={r.key}
          title={`${r.label}: ${r.value}`}
          className="hover:bg-muted/60 grid grid-cols-[minmax(6rem,11rem)_1fr_3rem] items-center gap-3 rounded-md text-sm"
        >
          <span className="truncate">{r.label}</span>
          <span className="bg-muted/60 h-3 rounded-sm">
            <span
              className={cn("bg-primary block h-full rounded-r-[4px] transition-[width]")}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </span>
          <span className="text-muted-foreground text-right tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}
