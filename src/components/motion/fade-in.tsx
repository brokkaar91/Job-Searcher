import { cn } from "@/lib/utils";

/**
 * Subtle fade + rise on load. Pure CSS (server component): content is never hidden when JS is
 * unavailable, and prefers-reduced-motion disables it globally (see globals.css).
 */
export function FadeIn({
  children,
  delay = 0,
  className,
  as: Comp = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  return (
    <Comp
      className={cn("animate-fade-up", className)}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </Comp>
  );
}
