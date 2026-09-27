import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  FileUp,
  KanbanSquare,
  Layers,
  ListChecks,
  Lock,
  MapPin,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FadeIn } from "@/components/motion/fade-in";
import { Aurora } from "@/components/magic/aurora";
import { BentoCard, BentoGrid } from "@/components/magic/bento";
import { BorderBeam } from "@/components/magic/border-beam";
import { Marquee } from "@/components/magic/marquee";
import { NumberTicker } from "@/components/magic/number-ticker";
import { ScoreRing } from "@/components/magic/score-ring";
import { SectionHeading } from "@/components/magic/section-heading";
import { createAdminClient } from "@/lib/supabase/admin";

/** Aggregate, non-personal counts for the landing page. Never fails the page. */
async function landingStats() {
  try {
    const db = createAdminClient();
    const [jobs, companies, cities] = await Promise.all([
      db
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("is_golden", true),
      db.from("companies").select("name").order("name").limit(24),
      db.from("jobs").select("city").eq("status", "published").not("city", "is", null),
    ]);
    return {
      jobs: jobs.count ?? 0,
      companies: (companies.data ?? []).map((c) => c.name),
      cities: new Set((cities.data ?? []).map((j) => j.city)).size,
    };
  } catch {
    return { jobs: 0, companies: [] as string[], cities: 0 };
  }
}

const FAQ_TEASER = ["free", "data", "reject", "sources"] as const;

export default async function HomePage({ params, searchParams }: PageProps<"/[locale]">) {
  await resolveLocale(params);
  const { deleted } = await searchParams;
  const t = await getTranslations("home");
  const tm = await getTranslations("matching");
  const tf = await getTranslations("faq");
  const locale = await getLocale();
  const stats = await landingStats();
  const numLocale = locale === "nl" ? "nl-NL" : "en-GB";

  const steps = [
    { key: "cv", icon: FileUp },
    { key: "check", icon: ListChecks },
    { key: "preferences", icon: SlidersHorizontal },
    { key: "matches", icon: Sparkles },
  ] as const;
  const breakdown = [
    ["skills", 92],
    ["experience", 81],
    ["occupation", 100],
    ["interests", 74],
    ["values", 68],
    ["practical", 100],
  ] as const;

  return (
    <>
      {deleted && (
        <p role="status" className="bg-accent text-accent-foreground px-4 py-3 text-center text-sm">
          {t("deleted")}
        </p>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <Aurora />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 md:pt-24 lg:grid-cols-[1.05fr_1fr]">
          <FadeIn className="space-y-7">
            <Link
              href="/how-matching-works"
              className="glass hover:border-primary/40 group inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] transition-colors"
            >
              <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                {t("badgeNew")}
              </span>
              {t("badge")}
              <ArrowRight
                aria-hidden
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <h1 className="text-[2.6rem] leading-[1.04] font-semibold tracking-tight sm:text-6xl lg:text-[4.2rem]">
              {t("titleLead")} <span className="text-gradient">{t("titleHighlight")}</span>{" "}
              {t("titleTail")}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
              {t("subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="group shadow-lift">
                <Link href="/register">
                  {t("ctaPrimary")}
                  <ArrowRight
                    aria-hidden
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="glass">
                <Link href="/how-matching-works">{t("ctaSecondary")}</Link>
              </Button>
            </div>
            <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {(["quick", "free", "fair"] as const).map((k) => (
                <li key={k} className="flex items-center gap-1.5">
                  <CheckCircle2 aria-hidden className="text-success size-4" />
                  {t(`assurances.${k}`)}
                </li>
              ))}
            </ul>
          </FadeIn>

          {/* Product mockup */}
          <FadeIn delay={0.15} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden
              className="glass shadow-lift animate-float absolute -top-5 -left-3 z-10 hidden items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm sm:flex"
            >
              <span className="bg-success animate-pulse-ring size-2 rounded-full" />
              {t("float.newMatches")}
            </div>
            <div
              aria-hidden
              className="glass shadow-lift animate-float absolute -right-3 -bottom-6 z-10 hidden items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm [animation-delay:-3s] sm:flex"
            >
              <Lock className="text-primary size-4" />
              {t("float.privacy")}
            </div>
            <BorderBeam className="shadow-lift">
              <div
                className="bg-card space-y-5 rounded-[calc(var(--radius)+5px)] p-6 sm:p-7"
                role="group"
                aria-label={t("preview.aria")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-brand-gradient text-primary-foreground flex size-11 items-center justify-center rounded-xl text-sm font-bold">
                      CA
                    </span>
                    <div>
                      <p className="text-muted-foreground text-sm">Canal Analytics · Amsterdam</p>
                      <p className="text-lg font-semibold">Senior Data Engineer</p>
                    </div>
                  </div>
                  <ScoreRing score={86} label={t("preview.score", { score: 86 })} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">{t("preview.label")}</Badge>
                  <Badge variant="outline">€6.200 – €7.800</Badge>
                  <Badge variant="outline">
                    <MapPin aria-hidden /> {t("preview.hybrid")}
                  </Badge>
                  <Badge variant="outline">
                    <Clock aria-hidden /> 25 min
                  </Badge>
                </div>
                <ul className="space-y-2.5 text-sm">
                  {(["r1", "r2", "r3"] as const).map((r) => (
                    <li key={r} className="flex gap-2.5">
                      <CheckCircle2 aria-hidden className="text-success mt-0.5 size-4 shrink-0" />
                      {t(`preview.${r}`)}
                    </li>
                  ))}
                </ul>
                <div className="bg-muted/60 space-y-2.5 rounded-xl p-4">
                  {breakdown.slice(0, 3).map(([k, v]) => (
                    <div
                      key={k}
                      className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-xs"
                    >
                      <span className="text-muted-foreground">{tm(`components.${k}`)}</span>
                      <span className="bg-background h-1.5 overflow-hidden rounded-full">
                        <span
                          className="bg-brand-gradient block h-full rounded-full"
                          style={{ width: `${v}%` }}
                        />
                      </span>
                      <span className="text-right font-medium tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </BorderBeam>
          </FadeIn>
        </div>
      </section>

      {/* ── Live stats + employers ───────────────────────────────────────── */}
      <section aria-labelledby="stats" className="border-y">
        <h2 id="stats" className="sr-only">
          {t("stats.title")}
        </h2>
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4">
          {(
            [
              ["jobs", stats.jobs, ""],
              ["companies", stats.companies.length, ""],
              ["cities", stats.cities, ""],
              ["protected", 0, ""],
            ] as const
          ).map(([k, v, suffix]) => (
            <div key={k} className="flex flex-col gap-1 px-2 py-8 text-center">
              <dd className="order-first text-4xl font-semibold tracking-tight">
                <NumberTicker value={v} locale={numLocale} suffix={suffix} />
              </dd>
              <dt className="text-muted-foreground text-sm">{t(`stats.${k}`)}</dt>
            </div>
          ))}
        </dl>
        {stats.companies.length > 0 && (
          <div className="border-t py-6">
            <p className="text-muted-foreground mb-4 text-center text-xs font-medium tracking-wide uppercase">
              {t("marqueeTitle")}
            </p>
            <Marquee>
              {stats.companies.map((name) => (
                <span
                  key={name}
                  className="text-muted-foreground flex items-center gap-2 text-base font-semibold whitespace-nowrap"
                >
                  <span className="bg-brand-gradient size-2 rounded-full" aria-hidden />
                  {name}
                </span>
              ))}
            </Marquee>
          </div>
        )}
      </section>

      {/* ── Bento features ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-labelledby="pillars">
        <SectionHeading
          id="pillars"
          eyebrow={t("pillarsTitle")}
          title={t("bento.title")}
          subtitle={t("bento.subtitle")}
        />
        <BentoGrid>
          <BentoCard
            icon={Eye}
            title={t("pillars.explainable.title")}
            text={t("pillars.explainable.text")}
            className="md:col-span-2"
          >
            <div className="grid grid-cols-6 items-end gap-2" aria-hidden>
              {breakdown.map(([k, v]) => (
                <div key={k} className="flex flex-col items-center gap-1.5">
                  <div className="bg-muted flex h-20 w-full items-end overflow-hidden rounded-lg">
                    <div
                      className="bg-brand-gradient w-full rounded-lg transition-all duration-500 group-hover:opacity-90"
                      style={{ height: `${v}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground truncate text-[10px]">
                    {tm(`components.${k}`)}
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
          <BentoCard icon={Scale} title={t("pillars.fair.title")} text={t("pillars.fair.text")} />
          <BentoCard
            icon={Layers}
            title={t("pillars.sources.title")}
            text={t("pillars.sources.text")}
          />
          <BentoCard icon={MapPin} title={t("bento.travel.title")} text={t("bento.travel.text")} />
          <BentoCard
            icon={KanbanSquare}
            title={t("bento.tracker.title")}
            text={t("bento.tracker.text")}
          />
          <BentoCard
            icon={ShieldCheck}
            title={t("bento.privacy.title")}
            text={t("bento.privacy.text")}
            className="md:col-span-2"
          >
            <div className="flex flex-wrap gap-2">
              {(["eu", "encrypted", "export", "delete"] as const).map((k) => (
                <Badge key={k} variant="accent" className="px-3 py-1">
                  {t(`bento.privacy.tags.${k}`)}
                </Badge>
              ))}
            </div>
          </BentoCard>
          <BentoCard icon={Bell} title={t("bento.alerts.title")} text={t("bento.alerts.text")} />
        </BentoGrid>
      </section>

      {/* ── Steps timeline ───────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden py-24" aria-labelledby="steps">
        <div aria-hidden className="bg-muted/40 absolute inset-0 -z-10" />
        <div aria-hidden className="bg-dots absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            id="steps"
            eyebrow={t("stepsEyebrow")}
            title={t("stepsTitle")}
            subtitle={t("stepsSubtitle")}
            align="center"
          />
          <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
            <span
              aria-hidden
              className="from-primary/0 via-primary/40 to-primary/0 absolute top-7 right-[12%] left-[12%] hidden h-px bg-gradient-to-r md:block"
            />
            {steps.map(({ key, icon: Icon }, i) => (
              <FadeIn as="li" key={key} delay={i * 0.08} className="relative text-center">
                <span className="bg-card shadow-soft ring-background relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border ring-8">
                  <Icon aria-hidden className="text-primary size-6" />
                  <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full text-xs font-semibold">
                    {i + 1}
                  </span>
                </span>
                <h3 className="font-semibold">{t(`steps.${key}.title`)}</h3>
                <p className="text-muted-foreground mx-auto mt-1 max-w-[16rem] text-sm">
                  {t(`steps.${key}.text`)}
                </p>
              </FadeIn>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Explanation demo ─────────────────────────────────────────────── */}
      <section
        className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2"
        aria-labelledby="demo"
      >
        <SectionHeading
          id="demo"
          eyebrow={t("demo.eyebrow")}
          title={t("demo.title")}
          subtitle={t("demo.subtitle")}
          className="mb-0"
        />
        <Tabs defaultValue="reasons" className="bg-card shadow-lift rounded-2xl border p-5 sm:p-6">
          <TabsList className="w-full">
            {(["reasons", "gaps", "score"] as const).map((k) => (
              <TabsTrigger key={k} value={k} className="flex-1">
                {t(`demo.tabs.${k}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="reasons" className="space-y-3">
            {(["r1", "r2", "r3"] as const).map((r, i) => (
              <div key={r} className="bg-muted/50 flex gap-3 rounded-xl p-3.5 text-sm">
                <span className="bg-success/15 text-success flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                  {i + 1}
                </span>
                {t(`preview.${r}`)}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="gaps" className="space-y-3">
            {(["g1", "g2"] as const).map((g) => (
              <div
                key={g}
                className="flex items-center gap-3 rounded-xl border border-dashed p-3.5 text-sm"
              >
                <TrendingUp aria-hidden className="text-highlight size-4 shrink-0" />
                {t(`demo.${g}`)}
              </div>
            ))}
            <p className="text-muted-foreground text-sm">{t("demo.gapsHint")}</p>
          </TabsContent>
          <TabsContent value="score" className="space-y-3">
            {breakdown.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7rem_1fr_2.25rem] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{tm(`components.${k}`)}</span>
                <span className="bg-muted h-2 overflow-hidden rounded-full">
                  <span
                    className="bg-brand-gradient block h-full rounded-full"
                    style={{ width: `${v}%` }}
                  />
                </span>
                <span className="text-right font-medium tabular-nums">{v}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </section>

      {/* ── FAQ teaser ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6" aria-labelledby="faq-teaser">
        <SectionHeading
          id="faq-teaser"
          eyebrow={t("faqTeaser.eyebrow")}
          title={t("faqTeaser.title")}
          align="center"
        />
        <Accordion type="single" collapsible className="space-y-3">
          {FAQ_TEASER.map((q) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{tf(`items.${q}.q`)}</AccordionTrigger>
              <AccordionContent>{tf(`items.${q}.a`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-6 text-center">
          <Button asChild variant="link">
            <Link href="/faq">
              {t("faqTeaser.more")} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <div className="bg-primary text-primary-foreground shadow-lift relative isolate overflow-hidden rounded-3xl px-8 py-14 sm:px-14">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_20%,color-mix(in_oklch,var(--highlight)_45%,transparent),transparent_45%),radial-gradient(circle_at_10%_90%,color-mix(in_oklch,var(--success)_40%,transparent),transparent_40%)]"
            />
            <div aria-hidden className="bg-dots absolute inset-0 -z-10 opacity-40" />
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl space-y-3">
                <h2 className="text-3xl font-semibold sm:text-4xl">{t("ctaBlock.title")}</h2>
                <p className="text-lg opacity-90">{t("ctaBlock.text")}</p>
              </div>
              <Button asChild size="lg" variant="secondary" className="group shrink-0">
                <Link href="/register">
                  {t("ctaPrimary")}
                  <ArrowRight
                    aria-hidden
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </Button>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
