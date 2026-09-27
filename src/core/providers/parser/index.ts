import { ClaudeParserProvider } from "./claude";
import { MockParserProvider } from "./mock";
import type { ParserProvider } from "./types";

export * from "./types";
export { ParserError } from "./claude";
export { MockParserProvider, ClaudeParserProvider };

/** Selected via PARSER_PROVIDER (anthropic | mock). Falls back to mock without an API key. */
export function createParserProvider(env: NodeJS.ProcessEnv = process.env): ParserProvider {
  const name = env.PARSER_PROVIDER ?? (env.ANTHROPIC_API_KEY ? "anthropic" : "mock");
  switch (name) {
    case "anthropic":
      return new ClaudeParserProvider({
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_MODEL,
      });
    case "mock":
      return new MockParserProvider();
    // case "textkernel": return new TextkernelParserProvider(...)  ← future
    default:
      throw new Error(`Unknown PARSER_PROVIDER "${name}"`);
  }
}
