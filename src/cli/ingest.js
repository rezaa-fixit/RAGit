import path from "node:path";
import { ensureDir, writeJson } from "../lib/fs.js";
import {
  fetchAvailableYears,
  fetchCaseDocument,
  fetchCaseIndex
} from "../lib/ombudsmanden.js";

const cwd = process.cwd();

function parseArgs(argv) {
  const args = {
    years: [],
    limit: null
  };

  for (const arg of argv) {
    if (arg.startsWith("--years=")) {
      args.years = arg
        .slice("--years=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }

    if (arg.startsWith("--limit=")) {
      args.limit = Number(arg.slice("--limit=".length));
    }
  }

  return args;
}

async function resolveYears(requestedYears) {
  if (requestedYears.length > 0) {
    return requestedYears;
  }

  const available = await fetchAvailableYears();
  return available.slice(0, 2).map((item) => item.year);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const years = await resolveYears(args.years);

  const rawDir = path.join(cwd, "data", "raw", "documents");
  await ensureDir(rawDir);

  let processed = 0;
  let failed = 0;

  for (const year of years) {
    const cases = await fetchCaseIndex(year);
    const selectedCases =
      typeof args.limit === "number" && !Number.isNaN(args.limit)
        ? cases.slice(0, args.limit)
        : cases;

    for (const entry of selectedCases) {
      try {
        const document = await fetchCaseDocument(entry.url, entry.fobId);
        const outputPath = path.join(rawDir, `${document.fobId}.json`);
        await writeJson(outputPath, document);
        processed += 1;
        console.log(`saved ${document.fobId}`);
      } catch (error) {
        failed += 1;
        console.warn(
          `failed ${entry.fobId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  console.log(`completed ${processed} documents, failed ${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
