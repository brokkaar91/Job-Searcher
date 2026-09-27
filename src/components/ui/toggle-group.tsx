"use client";
import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn("bg-muted inline-flex items-center gap-1 rounded-full p-1", className)}
      {...props}
    />
  );
}
function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "text-muted-foreground hover:text-foreground focus-visible:ring-ring data-[state=on]:bg-card data-[state=on]:text-foreground inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 data-[state=on]:shadow-sm [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
export { ToggleGroup, ToggleGroupItem };
