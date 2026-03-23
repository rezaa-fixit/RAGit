import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

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
  const rawDir = path.join(process.cwd(), "data", "raw", "documents");
  const files = (await readdir(rawDir)).filter((file) => file.endsWith(".json"));

  for (const file of files) {
    const document = JSON.parse(
      await readFile(path.join(rawDir, file), "utf8")
    );

    const row = [
      document.fobId,
      document.source,
      document.title,
      document.date ? document.date.split("-").reverse().join("-") : null,
      document.ministry,
      document.topics ?? [],
      document.caseNumbers ?? [],
      document.htmlUrl,
      document.pdfUrl,
      document.retsinformationUrl,
      document.summary,
      document
    ];

    process.stdout.write(`${row.map(formatValue).join("\t")}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
