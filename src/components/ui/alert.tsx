import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:top-3.5 [&>svg]:left-4 [&>svg]:size-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-card",
        info: "border-primary/20 bg-accent text-accent-foreground",
        warning: "border-warning/30 bg-warning/10",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return <h5 className={cn("mb-1 font-medium", className)} {...props} />;
}
function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm opacity-90", className)} {...props} />;
}
export { Alert, AlertTitle, AlertDescription };
