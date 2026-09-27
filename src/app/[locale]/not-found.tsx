import { getTranslations } from "next-intl/server";
import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Aurora } from "@/components/magic/aurora";
import { SiteHeader } from "@/components/layout/site-header";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="relative isolate flex min-h-[70dvh] flex-col items-center justify-center gap-5 overflow-hidden px-4 text-center"
      >
        <Aurora />
        <span className="bg-card shadow-lift flex size-16 items-center justify-center rounded-2xl border">
          <Compass aria-hidden className="text-primary size-8" />
        </span>
        <p className="text-gradient text-7xl font-bold tracking-tighter">404</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground max-w-md">{t("text")}</p>
        <Button asChild size="lg">
          <Link href="/">
            <ArrowLeft aria-hidden /> {t("home")}
          </Link>
        </Button>
      </main>
    </>
  );
}
