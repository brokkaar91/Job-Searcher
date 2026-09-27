import * as React from "react";
import { cn } from "@/lib/utils";

function Separator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("border-border border-0 border-t", className)} {...props} />;
}
export { Separator };
