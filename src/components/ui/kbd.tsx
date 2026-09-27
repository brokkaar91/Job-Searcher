import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-md border px-1.5 font-sans text-[11px] font-medium",
        className,
      )}
      {...props}
    />
  );
}
export { Kbd };
