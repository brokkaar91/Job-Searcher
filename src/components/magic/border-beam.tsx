import { cn } from "@/lib/utils";

/** Rotating gradient border around its child (decorative). Uses a registered @property angle. */
export function BorderBeam({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-beam relative rounded-[calc(var(--radius)+6px)] p-px", className)}>
      {children}
    </div>
  );
}
