import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Heavy / native deps are only used server-side (worker, CV parsing).
  serverExternalPackages: ["unpdf", "mammoth", "pg", "pg-boss", "@huggingface/transformers"],
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default withNextIntl(nextConfig);
