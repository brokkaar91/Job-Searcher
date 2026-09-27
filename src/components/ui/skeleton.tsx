import { cn } from "@/lib/utils";

/** Loading placeholder with a soft shimmer (static under prefers-reduced-motion). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("bg-muted shimmer-bg animate-shimmer rounded-lg", className)}
      {...props}
    />
  );
}
export { Skeleton };
