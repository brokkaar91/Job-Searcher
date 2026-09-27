"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Card with a soft radial highlight that follows the pointer. Purely decorative. */
export function SpotlightCard({
  children,
  className,
  as: Comp = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Comp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group bg-card text-card-foreground shadow-soft hover:shadow-lift relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        "before:bg-[radial-gradient(420px_circle_at_var(--mx,50%)_var(--my,0%),color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%)]",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
