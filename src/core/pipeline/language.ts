import { franc } from "franc-min";

const ISO3_TO_1: Record<string, string> = {
  nld: "nl",
  eng: "en",
  deu: "de",
  fra: "fr",
  spa: "es",
  ita: "it",
  por: "pt",
  pol: "pl",
};

/** Detect the language of a job ad (ISO 639-1), null when unsure. */
export function detectLanguage(text: string): string | null {
  const sample = text.slice(0, 3000);
  if (sample.trim().length < 40) return null;
  const code = franc(sample, { only: Object.keys(ISO3_TO_1), minLength: 40 });
  return ISO3_TO_1[code] ?? null;
}
