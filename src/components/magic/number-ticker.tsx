"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/**
 * Counts up to `value` when scrolled into view. The final value is rendered on the server, so
 * the number is correct without JS and for screen readers (the animated copy is aria-hidden).
 */
export function NumberTicker({
  value,
  locale = "nl-NL",
  suffix = "",
  className,
}: {
  value: number;
  locale?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState<number | null>(null);
  const fmt = new Intl.NumberFormat(locale);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">
        {fmt.format(value)}
        {suffix}
      </span>
      <span aria-hidden className="tabular-nums">
        {fmt.format(display ?? value)}
        {suffix}
      </span>
    </span>
  );
}
