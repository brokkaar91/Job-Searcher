/**
 * Removes direct identifiers and protected characteristics from CV text BEFORE it is sent to a
 * ParserProvider or embedded. Heuristic, deliberately aggressive: we would rather lose a line of
 * context than leak a birth date or nationality into the matching pipeline.
 */

export interface RedactionResult {
  text: string;
  counts: Record<RedactionKind, number>;
}

export type RedactionKind =
  | "name"
  | "email"
  | "phone"
  | "url"
  | "address"
  | "postcode"
  | "birthdate"
  | "personal_line"
  | "id_number";

const PLACEHOLDER: Record<RedactionKind, string> = {
  name: "[NAME]",
  email: "[EMAIL]",
  phone: "[PHONE]",
  url: "[PROFILE_URL]",
  address: "[ADDRESS]",
  postcode: "[POSTCODE]",
  birthdate: "[REMOVED]",
  personal_line: "[REMOVED]",
  id_number: "[ID]",
};

/** Lines stating protected / irrelevant personal data are removed entirely (NL + EN labels). */
const PERSONAL_LINE =
  /^\s*(?:[-•*]\s*)?(?:date of birth|birth ?date|born|d\.?o\.?b\.?|geboortedatum|geboren|geboorteplaats|place of birth|age|leeftijd|nationality|nationaliteit|citizenship|staatsburgerschap|gender|sex|geslacht|marital status|burgerlijke staat|civil status|religion|religie|geloof|photo|foto|driver'?s licen[cs]e number|bsn|social security|burgerservicenummer|passport|paspoort)\b.*$/gim;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /(?<![\w/])(?:\+|0)(?:\d[\s().-]?){8,13}\d(?![\w/])/g;
const PROFILE_URL =
  /\b(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|facebook\.com|instagram\.com|x\.com|twitter\.com)\/[^\s)]+/gi;
const NL_POSTCODE = /\b[1-9]\d{3}\s?(?!SA|SD|SS)[A-Z]{2}\b/g;
const STREET =
  /\b[\p{Lu}][\p{L}'.-]+(?:\s[\p{L}'.-]+){0,3}\s?(?:straat|laan|weg|plein|gracht|kade|singel|dijk|pad|hof|dreef|street|st\.|road|rd\.|avenue|ave\.|lane|boulevard)\s*\d{1,5}\s?[a-zA-Z]?\b/giu;
const DATE_NEAR_BIRTH = /\b(?:born|geboren)\s+(?:on\s+|op\s+)?\d{1,2}[-/. ]\w+[-/. ]\d{2,4}/gi;
const BSN_LIKE = /\b\d{9}\b/g;

function looksLikeName(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 60 || /\d|@|:/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  const particles = new Set([
    "van",
    "de",
    "der",
    "den",
    "ten",
    "ter",
    "von",
    "da",
    "di",
    "el",
    "al",
    "bin",
    "le",
    "la",
  ]);
  return words.every((w) => particles.has(w.toLowerCase()) || /^[\p{Lu}][\p{L}'’-]*\.?$/u.test(w));
}

const SECTION_WORDS =
  /^(curriculum vitae|cv|resume|résumé|profile|profiel|summary|samenvatting|experience|werkervaring|education|opleiding|skills|vaardigheden|languages|talen|contact|personal details|persoonlijke gegevens)$/i;

export function redactPii(input: string, opts: { knownNames?: string[] } = {}): RedactionResult {
  const counts = Object.fromEntries(Object.keys(PLACEHOLDER).map((k) => [k, 0])) as Record<
    RedactionKind,
    number
  >;
  let text = input.replace(/\r\n?/g, "\n");

  const sub = (re: RegExp, kind: RedactionKind) => {
    text = text.replace(re, () => {
      counts[kind]++;
      return PLACEHOLDER[kind];
    });
  };

  sub(PERSONAL_LINE, "personal_line");
  sub(DATE_NEAR_BIRTH, "birthdate");
  sub(EMAIL, "email");
  sub(PROFILE_URL, "url");
  sub(STREET, "address");
  sub(NL_POSTCODE, "postcode");
  sub(PHONE, "phone");
  sub(BSN_LIKE, "id_number");

  // Known names (e.g. from the auth provider) anywhere in the text.
  for (const name of opts.knownNames ?? []) {
    for (const part of [name, ...name.split(/\s+/).filter((p) => p.length > 2)]) {
      const re = new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      sub(re, "name");
    }
  }

  // Heuristic: the first meaningful line of a CV is usually the candidate's name.
  const lines = text.split("\n");
  const first = lines.findIndex((l) => l.trim() && !SECTION_WORDS.test(l.trim()));
  if (first >= 0 && first < 3 && looksLikeName(lines[first]!)) {
    lines[first] = PLACEHOLDER.name;
    counts.name++;
    text = lines.join("\n");
  }

  return { text: text.replace(/\n{3,}/g, "\n\n").trim(), counts };
}
