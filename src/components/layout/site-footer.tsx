import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer className="relative mt-24 overflow-hidden border-t">
      <div aria-hidden className="bg-brand-gradient absolute inset-x-0 top-0 h-px opacity-60" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-sm text-sm">{t("tagline")}</p>
          <p className="text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
            <ShieldCheck aria-hidden className="text-primary size-3.5" /> {t("euHosted")}
          </p>
        </div>
        <nav aria-label={t("product")} className="space-y-2 text-sm">
          <p className="font-medium">{t("product")}</p>
          <ul className="text-muted-foreground space-y-2">
            <li>
              <Link className="hover:text-foreground" href="/how-matching-works">
                {t("howItWorks")}
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/employers">
                {t("employers")}
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/faq">
                {t("faq")}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={t("legal")} className="space-y-2 text-sm">
          <p className="font-medium">{t("legal")}</p>
          <ul className="text-muted-foreground space-y-2">
            <li>
              <Link className="hover:text-foreground" href="/privacy">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/ai-statement">
                {t("aiStatement")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p
          aria-hidden
          className="text-gradient pointer-events-none text-center text-[18vw] leading-none font-bold tracking-tighter opacity-15 select-none md:text-[10rem]"
        >
          JobMatch
        </p>
      </div>
      <p className="text-muted-foreground border-t py-6 text-center text-xs">
        © {new Date().getFullYear()} JobMatch
      </p>
    </footer>
  );
}
