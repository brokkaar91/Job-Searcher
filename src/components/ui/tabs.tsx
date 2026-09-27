"use client";
import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("bg-muted inline-flex h-10 items-center gap-1 rounded-full p-1", className)}
      {...props}
    />
  );
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "text-muted-foreground focus-visible:ring-ring data-[state=active]:bg-card data-[state=active]:text-foreground inline-flex h-8 items-center justify-center rounded-full px-3.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 outline-none", className)} {...props} />;
}
export { Tabs, TabsList, TabsTrigger, TabsContent };
