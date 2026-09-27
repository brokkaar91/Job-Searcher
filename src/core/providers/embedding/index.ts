/**
 * Embeddings behind a provider interface. All providers MUST return unit-normalised vectors of
 * EMBEDDING_DIMENSIONS (768, the `vector(768)` columns). Text is always PII-redacted first.
 */
export const EMBEDDING_DIMENSIONS = 768;

export type EmbeddingKind = "query" | "passage";

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  embed(texts: string[], kind: EmbeddingKind): Promise<number[][]>;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

// ─── fake: deterministic hashed bag-of-words (tests / offline demo) ──────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Hashed bag of words (unigrams + bigrams), mixed with a shared constant direction so cosine
 * similarities fall in ~0.7–1.0 like multilingual-e5 – the default matching calibration then
 * works unchanged with this provider.
 */
export class FakeEmbeddingProvider implements EmbeddingProvider {
  readonly name = "fake";
  readonly model = "fake-hashing-768";
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => {
      const words = t
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const bow = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
      const grams = [...words, ...words.slice(1).map((w, i) => `${words[i]}_${w}`)];
      for (const g of grams) {
        const h = hash(g);
        bow[(h % (EMBEDDING_DIMENSIONS - 1)) + 1]! += h & 1 ? 1 : -1;
      }
      const unit = normalize(bow);
      // 0.7 shared + 0.3 content (squared weights) → cos in [0.7, 1] for non-negative overlap.
      const out = unit.map((x) => x * Math.sqrt(0.3));
      out[0] = Math.sqrt(0.7);
      return normalize(out);
    });
  }
}

// ─── local: multilingual-e5-base via transformers.js (worker only) ───────────

export class LocalE5EmbeddingProvider implements EmbeddingProvider {
  readonly name = "local";
  private extractor: Promise<
    (texts: string[], opts: object) => Promise<{ tolist(): number[][] }>
  > | null = null;
  constructor(readonly model = "Xenova/multilingual-e5-base") {}

  private load() {
    this.extractor ??= (async () => {
      // Optional dependency: only installed where embeddings are computed (the worker).
      const mod = (await import("@huggingface/transformers")) as unknown as {
        pipeline: (
          task: string,
          model: string,
        ) => Promise<(texts: string[], opts: object) => Promise<{ tolist(): number[][] }>>;
      };
      return mod.pipeline("feature-extraction", this.model);
    })();
    return this.extractor;
  }

  async embed(texts: string[], kind: EmbeddingKind): Promise<number[][]> {
    const extractor = await this.load();
    // e5 models expect "query: " / "passage: " prefixes.
    const output = await extractor(
      texts.map((t) => `${kind}: ${t}`),
      { pooling: "mean", normalize: true },
    );
    return output.tolist();
  }
}

// ─── openai: text-embedding-3-small with dimensions=768 ──────────────────────

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";
  constructor(
    private readonly apiKey: string,
    readonly model = "text-embedding-3-small",
  ) {}
  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts, dimensions: EMBEDDING_DIMENSIONS }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    return json.data.sort((a, b) => a.index - b.index).map((d) => normalize(d.embedding));
  }
}

export function createEmbeddingProvider(env: NodeJS.ProcessEnv = process.env): EmbeddingProvider {
  switch (env.EMBEDDING_PROVIDER ?? "fake") {
    case "local":
      return new LocalE5EmbeddingProvider(env.EMBEDDING_MODEL || undefined);
    case "openai":
      if (!env.OPENAI_API_KEY)
        throw new Error("OPENAI_API_KEY is required for EMBEDDING_PROVIDER=openai");
      return new OpenAIEmbeddingProvider(env.OPENAI_API_KEY);
    case "fake":
      return new FakeEmbeddingProvider();
    default:
      throw new Error(`Unknown EMBEDDING_PROVIDER "${env.EMBEDDING_PROVIDER}"`);
  }
}
