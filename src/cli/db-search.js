import { loadConfig } from "../lib/config.js";
import { presentHit, searchWithBackend } from "../lib/retrieval.js";

function parseArgs(argv) {
  const filters = {
    year: null,
    ministry: null,
    topic: null
  };
  let limit = 5;
  const questionParts = [];

  for (const arg of argv) {
    if (arg.startsWith("--year=")) {
      filters.year = arg.slice("--year=".length).trim() || null;
      continue;
    }

    if (arg.startsWith("--ministry=")) {
      filters.ministry = arg.slice("--ministry=".length).trim() || null;
      continue;
    }

    if (arg.startsWith("--topic=")) {
      filters.topic = arg.slice("--topic=".length).trim() || null;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const parsed = Number(arg.slice("--limit=".length));
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = parsed;
      }
      continue;
    }

    questionParts.push(arg);
  }

  return {
    question: questionParts.join(" ").trim(),
    filters,
    limit
  };
}

async function main() {
  const { question, filters, limit } = parseArgs(process.argv.slice(2));
  if (!question) {
    throw new Error(
      "Usage: npm run db:search -- [--year=2024] [--ministry=Skatteministeriet] [--topic=aktindsigt] [--limit=5] <question>"
    );
  }

  const config = await loadConfig();
  const result = await searchWithBackend(question, { ...config, searchBackend: "postgres" }, {
    limit,
    perDocumentLimit: 2,
    filters
  });

  console.log(
    JSON.stringify(
      {
        question,
        backend: result.backend,
        filters,
        hits: result.hits.map(presentHit)
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
