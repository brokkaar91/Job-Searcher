# JobMatch background worker (pg-boss). Build from the repository root:
#   docker build -f worker/Dockerfile -t jobmatch-worker .
FROM node:22-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Optional deps include @huggingface/transformers (local e5 embeddings) and nodemailer (SMTP).
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
COPY worker ./worker
COPY scripts/_env.ts ./scripts/_env.ts
COPY messages ./messages
ENV NODE_ENV=production
# The e5 model (~1 GB) is downloaded on first use and cached here – mount a volume in production.
ENV HF_HOME=/data/hf
CMD ["pnpm", "worker"]
