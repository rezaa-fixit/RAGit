import path from "node:path";
import { loadConfig } from "../lib/config.js";
import { embedTexts, enrichChunksWithEmbeddings } from "../lib/embeddings.js";
import { writeJsonLines } from "../lib/fs.js";
import { readJsonLines } from "../lib/jsonl.js";

async function main() {
  const cwd = process.cwd();
  const config = await loadConfig();
  const corpusPath = path.join(cwd, "data", "processed", "corpus.jsonl");
  const outputPath = path.join(cwd, "data", "processed", "embeddings.jsonl");
  const rows = await readJsonLines(corpusPath);

  if (rows.length === 0) {
    throw new Error("corpus.jsonl is empty");
  }

  const texts = rows.map((row) => row.text);
  const embeddings = await embedTexts(texts, config);
  const enrichedRows = enrichChunksWithEmbeddings(rows, embeddings, config);

  await writeJsonLines(outputPath, enrichedRows);
  console.log(`wrote embeddings for ${enrichedRows.length} chunks`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
