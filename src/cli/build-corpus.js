import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { buildChunksFromDocument, buildChunksFromSummary } from "../lib/chunking.js";
import { writeJsonLines } from "../lib/fs.js";

const cwd = process.cwd();

async function loadDocuments(directory) {
  const fileNames = await readdir(directory);
  const rows = [];

  for (const fileName of fileNames.filter((name) => name.endsWith(".json"))) {
    const filePath = path.join(directory, fileName);
    const content = await readFile(filePath, "utf8");
    rows.push(JSON.parse(content));
  }

  return rows.sort((a, b) => a.fobId.localeCompare(b.fobId));
}

function buildCorpusRows(document) {
  const sourceText =
    typeof document.pdfText === "string" && document.pdfText.trim()
      ? document.pdfText
      : document.summary;
  const chunks = document.pdfText
    ? buildChunksFromDocument(document, {
        maxChars: 1800,
        overlapChars: 260
      })
    : buildChunksFromSummary(sourceText, {
        maxChars: 1400,
        overlapChars: 250
      });

  if (chunks.length === 0) {
    return [
      {
        documentId: document.fobId,
        chunkId: `${document.fobId}:0`,
        chunkIndex: 0,
        title: document.title,
        date: document.date,
        ministry: document.ministry,
        topics: document.topics,
        caseNumbers: document.caseNumbers,
        htmlUrl: document.htmlUrl,
        pdfUrl: document.pdfUrl,
        retsinformationUrl: document.retsinformationUrl,
        text: sourceText,
        sourceType: document.pdfText ? "pdf" : "summary",
        pageStart: null,
        pageEnd: null,
        sectionTitle: null
      }
    ];
  }

  return chunks.map((chunk) => ({
    documentId: document.fobId,
    chunkId: `${document.fobId}:${chunk.chunkIndex}`,
    chunkIndex: chunk.chunkIndex,
    title: document.title,
    date: document.date,
    ministry: document.ministry,
    topics: document.topics,
    caseNumbers: document.caseNumbers,
    htmlUrl: document.htmlUrl,
    pdfUrl: document.pdfUrl,
    retsinformationUrl: document.retsinformationUrl,
    text: chunk.text,
    sourceType: document.pdfText ? "pdf" : "summary",
    pageStart: chunk.pageStart ?? null,
    pageEnd: chunk.pageEnd ?? null,
    sectionTitle: chunk.sectionTitle ?? null
  }));
}

async function main() {
  const inputDir = path.join(cwd, "data", "raw", "documents");
  const outputPath = path.join(cwd, "data", "processed", "corpus.jsonl");

  const documents = await loadDocuments(inputDir);
  const rows = documents.flatMap((document) => buildCorpusRows(document));

  await writeJsonLines(outputPath, rows);
  console.log(`wrote ${rows.length} chunks from ${documents.length} documents`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
