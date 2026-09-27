"use client";
import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none items-center py-2 select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="bg-muted relative h-1.5 w-full grow overflow-hidden rounded-full">
        <SliderPrimitive.Range className="bg-primary absolute h-full" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={props["aria-label"]}
          className="border-primary bg-card focus-visible:ring-ring/40 block size-5 rounded-full border-2 shadow transition-transform outline-none hover:scale-110 focus-visible:ring-4"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
export { Slider };
