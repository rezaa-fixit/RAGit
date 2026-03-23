import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");

  try {
    const content = await readFile(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

export async function loadConfig() {
  await loadDotEnv();

  const config = {
    embeddingProvider: process.env.EMBEDDING_PROVIDER ?? "openai",
    searchBackend: process.env.SEARCH_BACKEND ?? "auto",
    openAiApiKey: process.env.OPENAI_API_KEY ?? "",
    openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-large",
    embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? "1536"),
    chatModel: process.env.CHAT_MODEL ?? "gpt-5.4-mini",
    port: Number(process.env.PORT ?? "3000"),
    pgHost: process.env.PGHOST ?? "localhost",
    pgPort: Number(process.env.PGPORT ?? "5432"),
    pgDatabase: process.env.PGDATABASE ?? "ombudsmanden_rag",
    pgUser: process.env.PGUSER ?? "postgres",
    pgPassword: process.env.PGPASSWORD ?? "",
    pgSslMode: process.env.PGSSLMODE ?? "disable",
    basicAuthUser: process.env.BASIC_AUTH_USER ?? "",
    basicAuthPassword: process.env.BASIC_AUTH_PASSWORD ?? ""
  };

  const hasBasicAuthUser = Boolean(config.basicAuthUser);
  const hasBasicAuthPassword = Boolean(config.basicAuthPassword);

  if (hasBasicAuthUser !== hasBasicAuthPassword) {
    throw new Error(
      "Both BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must be set together if Basic Auth is enabled."
    );
  }

  return config;
}
