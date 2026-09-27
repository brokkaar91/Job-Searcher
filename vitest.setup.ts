// Load .env.local / .env for DB integration tests (unit tests don't need any env).
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
