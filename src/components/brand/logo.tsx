import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7">
        <rect width="32" height="32" rx="10" className="fill-primary" />
        <path
          d="M9 17.5l4.5 4.5L23 11"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary-foreground"
        />
      </svg>
      <span>
        Job<span className="text-primary">Match</span>
      </span>
    </span>
  );
}
