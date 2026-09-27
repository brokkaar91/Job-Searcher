import { cn } from "@/lib/utils";

/** Circular score indicator (0–100). Colour follows the match label thresholds. */
export function ScoreRing({
  score,
  size = 56,
  stroke = 5,
  className,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  className?: string;
  /** Accessible label, e.g. "Matchscore 82 van 100". */
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const tone =
    pct >= 75
      ? "text-success"
      : pct >= 60
        ? "text-primary"
        : pct >= 45
          ? "text-highlight"
          : "text-muted-foreground";
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative inline-grid shrink-0 place-items-center", tone, className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="text-foreground absolute text-sm font-semibold tabular-nums">
        {Math.round(pct)}
      </span>
    </span>
  );
}
