import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/logo";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer className="mt-24 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-sm text-sm">{t("tagline")}</p>
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
      <p className="text-muted-foreground pb-8 text-center text-xs">
        © {new Date().getFullYear()} JobMatch · {t("euHosted")}
      </p>
    </footer>
  );
}
