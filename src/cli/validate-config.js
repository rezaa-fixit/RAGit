import { loadConfig } from "../lib/config.js";

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

async function main() {
  const config = await loadConfig();
  const issues = [];

  if (!Number.isFinite(config.port) || config.port <= 0) {
    issues.push("PORT must be a positive number.");
  }

  if (config.embeddingProvider === "openai" && !config.openAiApiKey) {
    issues.push("OPENAI_API_KEY must be set when EMBEDDING_PROVIDER=openai.");
  }

  if (config.searchBackend === "postgres" || config.searchBackend === "auto") {
    if (!config.pgHost) {
      issues.push("PGHOST must be set for postgres-backed search.");
    }
    if (!config.pgDatabase) {
      issues.push("PGDATABASE must be set for postgres-backed search.");
    }
    if (!config.pgUser) {
      issues.push("PGUSER must be set for postgres-backed search.");
    }
    if (!config.pgPassword) {
      issues.push("PGPASSWORD must be set for postgres-backed search.");
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      fail(`- ${issue}`);
    }
    return;
  }

  console.log("Config looks valid.");
  console.log(`searchBackend=${config.searchBackend}`);
  console.log(`embeddingProvider=${config.embeddingProvider}`);
  console.log(`authEnabled=${Boolean(config.basicAuthUser && config.basicAuthPassword)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
