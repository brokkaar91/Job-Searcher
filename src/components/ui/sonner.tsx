"use client";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: { toast: "!rounded-xl !border !bg-card !text-card-foreground !shadow-soft" },
      }}
      {...props}
    />
  );
}
export { Toaster };
