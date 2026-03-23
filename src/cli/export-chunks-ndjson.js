import path from "node:path";
import { readJsonLines } from "../lib/jsonl.js";

function formatArray(items) {
  const escaped = items.map((item) => `"${String(item).replaceAll('"', '\\"')}"`);
  return `{${escaped.join(",")}}`;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "\\N";
  }

  if (Array.isArray(value)) {
    return formatArray(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value).replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

async function main() {
  const rows = await readJsonLines(
    path.join(process.cwd(), "data", "processed", "embeddings.jsonl")
  );

  for (const row of rows) {
    const output = [
      row.chunkId,
      row.documentId,
      row.chunkIndex,
      row.title,
      row.date ? row.date.split("-").reverse().join("-") : null,
      row.ministry,
      row.topics ?? [],
      row.caseNumbers ?? [],
      row.htmlUrl,
      row.pdfUrl,
      row.retsinformationUrl,
      row.text,
      row.embeddingSql,
      row.metadata ?? {}
    ];

    process.stdout.write(`${output.map(formatValue).join("\t")}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
