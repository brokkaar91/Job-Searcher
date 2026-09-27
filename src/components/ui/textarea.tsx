import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-card placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 flex min-h-20 w-full rounded-lg border px-3.5 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
export { Textarea };
