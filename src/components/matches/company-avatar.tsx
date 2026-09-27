import { cn } from "@/lib/utils";

const HUES = [190, 165, 55, 230, 140, 280, 20, 100];

/** Deterministic initials tile for a company (no external logos are fetched). */
export function CompanyAvatar({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const n = (name ?? "?").trim();
  const initials =
    n
      .split(/[\s&.-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  let h = 0;
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length]!;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ring-black/5",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, oklch(0.93 0.05 ${hue}), oklch(0.85 0.09 ${hue}))`,
        color: `oklch(0.3 0.08 ${hue})`,
      }}
    >
      {initials}
    </span>
  );
}
