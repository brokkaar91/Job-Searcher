import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { groundCv, groundJob } from "./ground";
import { jobClassificationSchema, parsedCvSchema } from "./schemas";
import type { JobClassification, JobInput, ParsedCv, ParserContext, ParserProvider } from "./types";

const CV_SYSTEM = `You extract structured data from CVs for a job-matching service in the Netherlands.
Rules:
- The CV text has already been redacted; never try to reconstruct names, contact details, age, gender, nationality or photos, and never output them.
- Only extract what the CV supports. Do not invent skills, dates or levels.
- Skills: concrete professional skills, tools and knowledge areas. Prefer ESCO preferred labels (English) when one clearly fits; the candidate labels listed with the CV are known ESCO labels you may use verbatim.
- lastUsedYear: the last year the skill was evidently used (end year of the role where it appears; the current year for current roles), null if unclear.
- Languages: map descriptions to CEFR (native/moedertaal → C2, fluent/vloeiend → C1, good/goed → B2, basic/basis → A2).
- Seniority: intern, junior (<2y relevant), medior (2-5y), senior (5+y), lead (people/technical lead), executive.
- educationLevelEqf: MBO 2-4, HBO/bachelor 6, WO master 7, PhD 8.`;

const JOB_SYSTEM = `You classify job postings for a job-matching service in the Netherlands.
Rules:
- skills: concrete skills/tools/knowledge the ad asks for; "must" when required ("vereist", "you have", "requirements"), "nice" when optional ("pré", "nice to have", "bonus").
- languageRequirements: only languages the ad mentions; required=false when it is a plus.
- visaSponsorship: true only if the ad offers sponsorship/relocation for non-EU candidates; false if it says candidates must already have the right to work; otherwise null.
- explicitMinEducationEqf: ONLY when the ad explicitly states a minimum degree as a requirement ("HBO werk- en denkniveau" is NOT explicit; "WO-diploma vereist" is). Otherwise null.
- workValues: 0-1 how strongly the role offers each O*NET work value (achievement, independence, recognition, relationships, support, working_conditions), judged from the ad.
- Never infer anything about protected characteristics.`;

export class ClaudeParserProvider implements ParserProvider {
  readonly name = "anthropic";
  readonly version: string;
  private client: Anthropic;
  private model: string;

  constructor(opts: { apiKey?: string; model?: string } = {}) {
    this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
    this.model = opts.model ?? process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
    this.version = `anthropic:${this.model}:v1`;
  }

  private async extract<S extends z.ZodType>(
    schema: S,
    system: string,
    content: string,
  ): Promise<z.infer<S>> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      // Server-side fallback when the model declines for policy reasons.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content }],
      output_config: { format: betaZodOutputFormat(schema) },
    });
    if (response.stop_reason === "refusal")
      throw new ParserError("refused", "The model declined to process this document");
    if (response.stop_reason === "max_tokens")
      throw new ParserError("truncated", "Output was truncated");
    if (response.parsed_output == null)
      throw new ParserError("invalid_output", "Structured output could not be parsed");
    return response.parsed_output as z.infer<S>;
  }

  async parseCv(redactedText: string, ctx: ParserContext): Promise<ParsedCv> {
    const hints = ctx.esco.findSkillsInText(redactedText).map((m) => m.ref.preferredLabelEn);
    const content = `Current year: ${new Date().getFullYear()}\nKnown ESCO skill labels found in this CV: ${hints.join("; ") || "(none)"}\n\n<cv>\n${redactedText}\n</cv>`;
    const raw = await this.extract(parsedCvSchema, CV_SYSTEM, content);
    return groundCv(raw, ctx.esco);
  }

  async classifyJob(job: JobInput, ctx: ParserContext): Promise<JobClassification> {
    const text = `${job.title}\n${job.description}`;
    const hints = ctx.esco.findSkillsInText(text).map((m) => m.ref.preferredLabelEn);
    const content = `Known ESCO skill labels found in this ad: ${hints.join("; ") || "(none)"}\n\n<job>\nTitle: ${job.title}\nCompany: ${job.companyName ?? "unknown"}\n\n${job.description}\n</job>`;
    const raw = await this.extract(jobClassificationSchema, JOB_SYSTEM, content);
    return groundJob(raw, ctx.esco, job.title);
  }
}

export class ParserError extends Error {
  constructor(
    readonly code: "refused" | "truncated" | "invalid_output" | "unsupported_file",
    message: string,
  ) {
    super(message);
    this.name = "ParserError";
  }
}
