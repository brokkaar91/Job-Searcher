"use client";
import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

const sheetVariants = cva("bg-card fixed z-50 flex flex-col gap-4 p-6 shadow-lift", {
  variants: {
    side: {
      right: "inset-y-0 right-0 h-full w-[min(88vw,24rem)] border-l sheet-right",
      left: "inset-y-0 left-0 h-full w-[min(88vw,24rem)] border-r sheet-left",
      bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t sheet-bottom",
    },
  },
  defaultVariants: { side: "right" },
});

function SheetContent({
  side = "right",
  className,
  children,
  closeLabel = "Close",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> & { closeLabel?: string }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="bg-foreground/30 sheet-overlay fixed inset-0 z-50 backdrop-blur-sm" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="focus-visible:ring-ring hover:bg-accent absolute top-4 right-4 rounded-full p-1.5 opacity-80 hover:opacity-100 focus-visible:ring-2">
          <XIcon className="size-4" />
          <span className="sr-only">{closeLabel}</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 pr-8", className)} {...props} />;
}
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}
function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
