import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.test.ts",
      "worker/**/*.test.ts",
      "scripts/**/*.test.ts",
      "tests/db/**/*.test.ts",
    ],
    coverage: { include: ["src/core/**"], reporter: ["text", "html"] },
  },
});
