"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main
      id="main"
      className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <span className="bg-destructive/10 text-destructive flex size-16 items-center justify-center rounded-2xl">
        <TriangleAlert aria-hidden className="size-8" />
      </span>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground max-w-md">{t("text")}</p>
      {error.digest && (
        <p className="text-muted-foreground font-mono text-xs">
          {t("reference")}: {error.digest}
        </p>
      )}
      <Button onClick={reset}>
        <RefreshCw aria-hidden /> {t("retry")}
      </Button>
    </main>
  );
}
