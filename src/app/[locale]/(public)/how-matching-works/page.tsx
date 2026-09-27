import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Ban, Hand, ListChecks, Scale } from "lucide-react";
import { resolveLocale } from "@/i18n/locale";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { COMPONENTS, KNOCKOUT_RULES } from "@/core/matching/types";
import { DEFAULT_MODEL_CONFIG, modelConfigSchema } from "@/core/matching/config";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/how-matching-works">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "howItWorks" });
  return { title: t("title") };
}

/** Transparency page: shows the weights of the ACTIVE model version straight from the database. */
async function activeModel() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("matching_model_versions")
      .select("version, config, activated_at, created_at")
      .eq("is_active", true)
      .maybeSingle();
    const parsed = data ? modelConfigSchema.safeParse(data.config) : null;
    if (data && parsed?.success)
      return {
        version: data.version,
        date: data.activated_at ?? data.created_at,
        config: parsed.data,
      };
  } catch {
    // no backend configured – fall back to documented defaults
  }
  return { version: 1, date: null, config: DEFAULT_MODEL_CONFIG };
}

export default async function HowMatchingWorksPage({
  params,
}: PageProps<"/[locale]/how-matching-works">) {
  await resolveLocale(params);
  const t = await getTranslations("howItWorks");
  const tm = await getTranslations("matching");
  const format = await getFormatter();
  const model = await activeModel();

  return (
    <div className="mx-auto max-w-4xl space-y-16 px-4 py-16 sm:px-6">
      <FadeIn className="space-y-4">
        <h1 className="text-4xl font-semibold sm:text-5xl">{t("title")}</h1>
        <p className="text-muted-foreground text-lg">{t("intro")}</p>
        <p className="text-muted-foreground text-sm">
          {t("modelVersion", { version: model.version })}
          {model.date ? ` · ${format.dateTime(new Date(model.date), { dateStyle: "long" })}` : ""}
        </p>
      </FadeIn>

      <section aria-labelledby="layer-a" className="space-y-6">
        <div className="flex items-center gap-3">
          <ListChecks aria-hidden className="text-primary size-6" />
          <h2 id="layer-a" className="text-2xl font-semibold">
            {t("layerA.title")}
          </h2>
        </div>
        <p className="text-muted-foreground">{t("layerA.intro")}</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {KNOCKOUT_RULES.map((rule) => (
            <li key={rule}>
              <Card className="h-full gap-2 p-5">
                <h3 className="font-semibold">{tm(`rules.${rule}`)}</h3>
                <p className="text-muted-foreground text-sm">
                  {t(`layerA.rules.${rule}`, {
                    norm: format.number(model.config.salaryNorms.graduate),
                  })}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="layer-b" className="space-y-6">
        <div className="flex items-center gap-3">
          <Scale aria-hidden className="text-primary size-6" />
          <h2 id="layer-b" className="text-2xl font-semibold">
            {t("layerB.title")}
          </h2>
        </div>
        <p className="text-muted-foreground">{t("layerB.intro")}</p>
        <Card className="gap-6">
          <ul className="space-y-6">
            {COMPONENTS.map((c) => (
              <li key={c} className="space-y-2">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-semibold">{tm(`components.${c}`)}</h3>
                  <span className="text-primary text-lg font-semibold tabular-nums">
                    {model.config.weights[c]}%
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${model.config.weights[c]}%` }}
                  />
                </div>
                <p className="text-muted-foreground text-sm">{t(`layerB.components.${c}`)}</p>
              </li>
            ))}
          </ul>
        </Card>
        <p className="text-muted-foreground text-sm">
          {t("labels", {
            strong: model.config.thresholds.strong,
            good: model.config.thresholds.good,
            possible: model.config.thresholds.possible,
          })}
        </p>
      </section>

      <section aria-labelledby="never" className="grid gap-5 md:grid-cols-2">
        <Card>
          <Ban aria-hidden className="text-destructive size-6" />
          <h2 id="never" className="text-xl font-semibold">
            {t("never.title")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("never.text")}</p>
        </Card>
        <Card>
          <Hand aria-hidden className="text-primary size-6" />
          <h2 className="text-xl font-semibold">{t("control.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("control.text")}</p>
        </Card>
      </section>

      <section className="text-muted-foreground space-y-3 text-sm">
        <h2 className="text-foreground text-lg font-semibold">{t("science.title")}</h2>
        <p>{t("science.text")}</p>
      </section>
    </div>
  );
}
