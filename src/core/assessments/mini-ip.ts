import { RIASEC_KEYS, type RiasecKey, type RiasecProfile } from "../matching/types";

/**
 * Interest profiler – 30 items (5 per RIASEC type), answered on a 5-point like/dislike scale.
 *
 * Items are taken from the O*NET Interest Profiler Short Form (public domain, U.S. Department of
 * Labor/ETA; O*NET® is a trademark of USDOL/ETA), following the 30-item Mini-IP design (5 items
 * per type). Dutch translations are our own.
 * TODO(content review): verify the item selection against the official Mini-IP item list and
 * have the Dutch wording reviewed before launch.
 */
export interface InterestItem {
  id: string;
  type: RiasecKey;
  en: string;
  nl: string;
}

export const MINI_IP_ITEMS: InterestItem[] = [
  { id: "r1", type: "R", en: "Build kitchen cabinets", nl: "Keukenkastjes bouwen" },
  { id: "i1", type: "I", en: "Develop a new medicine", nl: "Een nieuw medicijn ontwikkelen" },
  { id: "a1", type: "A", en: "Write books or plays", nl: "Boeken of toneelstukken schrijven" },
  {
    id: "s1",
    type: "S",
    en: "Teach an individual an exercise routine",
    nl: "Iemand een trainingsschema aanleren",
  },
  {
    id: "e1",
    type: "E",
    en: "Buy and sell stocks and bonds",
    nl: "Aandelen en obligaties kopen en verkopen",
  },
  {
    id: "c1",
    type: "C",
    en: "Develop a spreadsheet using computer software",
    nl: "Een spreadsheet maken met computersoftware",
  },
  {
    id: "r2",
    type: "R",
    en: "Repair household appliances",
    nl: "Huishoudelijke apparaten repareren",
  },
  {
    id: "i2",
    type: "I",
    en: "Study ways to reduce water pollution",
    nl: "Onderzoeken hoe waterverontreiniging kan worden verminderd",
  },
  { id: "a2", type: "A", en: "Play a musical instrument", nl: "Een muziekinstrument bespelen" },
  {
    id: "s2",
    type: "S",
    en: "Help people with personal or emotional problems",
    nl: "Mensen helpen met persoonlijke of emotionele problemen",
  },
  { id: "e2", type: "E", en: "Manage a retail store", nl: "Een winkel leiden" },
  {
    id: "c2",
    type: "C",
    en: "Proofread records or forms",
    nl: "Documenten of formulieren controleren op fouten",
  },
  {
    id: "r3",
    type: "R",
    en: "Assemble electronic parts",
    nl: "Elektronische onderdelen in elkaar zetten",
  },
  {
    id: "i3",
    type: "I",
    en: "Conduct chemical experiments",
    nl: "Scheikundige experimenten uitvoeren",
  },
  { id: "a3", type: "A", en: "Draw pictures", nl: "Tekeningen maken" },
  { id: "s3", type: "S", en: "Give career guidance to people", nl: "Mensen loopbaanadvies geven" },
  { id: "e3", type: "E", en: "Start your own business", nl: "Een eigen bedrijf beginnen" },
  {
    id: "c3",
    type: "C",
    en: "Calculate the wages of employees",
    nl: "Salarissen van medewerkers berekenen",
  },
  {
    id: "r4",
    type: "R",
    en: "Set up and operate machines to make products",
    nl: "Machines instellen en bedienen om producten te maken",
  },
  {
    id: "i4",
    type: "I",
    en: "Examine blood samples using a microscope",
    nl: "Bloedmonsters onderzoeken met een microscoop",
  },
  {
    id: "a4",
    type: "A",
    en: "Create special effects for movies",
    nl: "Speciale effecten voor films maken",
  },
  {
    id: "s4",
    type: "S",
    en: "Do volunteer work at a non-profit organization",
    nl: "Vrijwilligerswerk doen bij een non-profitorganisatie",
  },
  {
    id: "e4",
    type: "E",
    en: "Negotiate business contracts",
    nl: "Over zakelijke contracten onderhandelen",
  },
  {
    id: "c4",
    type: "C",
    en: "Keep shipping and receiving records",
    nl: "Een administratie van in- en uitgaande zendingen bijhouden",
  },
  { id: "r5", type: "R", en: "Put out forest fires", nl: "Bosbranden blussen" },
  {
    id: "i5",
    type: "I",
    en: "Develop a way to better predict the weather",
    nl: "Een methode ontwikkelen om het weer beter te voorspellen",
  },
  {
    id: "a5",
    type: "A",
    en: "Write scripts for movies or television shows",
    nl: "Scripts schrijven voor films of tv-programma's",
  },
  { id: "s5", type: "S", en: "Teach a high-school class", nl: "Lesgeven op een middelbare school" },
  {
    id: "e5",
    type: "E",
    en: "Market a new line of clothing",
    nl: "Een nieuwe kledinglijn op de markt brengen",
  },
  {
    id: "c5",
    type: "C",
    en: "Inventory supplies using a hand-held computer",
    nl: "Voorraden inventariseren met een handcomputer",
  },
];

/** 1 = strongly dislike, 2 = dislike, 3 = unsure, 4 = like, 5 = strongly like */
export type InterestAnswer = 1 | 2 | 3 | 4 | 5;
export type InterestAnswers = Record<string, InterestAnswer>;

export function isComplete(answers: InterestAnswers): boolean {
  return MINI_IP_ITEMS.every((i) => answers[i.id] != null);
}

/**
 * Raw score per type = sum of 5 answers (5..25), normalised to 0..1.
 * Unanswered items count as "unsure" (3) so partial answers still give a stable profile.
 */
export function scoreInterests(answers: InterestAnswers): RiasecProfile {
  const profile = Object.fromEntries(RIASEC_KEYS.map((k) => [k, 0])) as RiasecProfile;
  for (const key of RIASEC_KEYS) {
    const items = MINI_IP_ITEMS.filter((i) => i.type === key);
    const sum = items.reduce((s, i) => s + (answers[i.id] ?? 3), 0);
    profile[key] = Math.round(((sum - items.length) / (items.length * 4)) * 1000) / 1000;
  }
  return profile;
}
