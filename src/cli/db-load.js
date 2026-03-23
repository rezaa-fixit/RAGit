import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { loadConfig } from "../lib/config.js";
import { readJsonLines } from "../lib/jsonl.js";
import { createPool, testConnection, upsertChunk, upsertDocument } from "../lib/postgres.js";

async function loadDocuments() {
  const directory = path.join(process.cwd(), "data", "raw", "documents");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
  const rows = [];

  for (const file of files) {
    rows.push(JSON.parse(await readFile(path.join(directory, file), "utf8")));
  }

  return rows.sort((a, b) => a.fobId.localeCompare(b.fobId));
}

async function main() {
  const config = await loadConfig();
  const pool = createPool(config);

  try {
    await testConnection(pool);
    const documents = await loadDocuments();
    const chunks = await readJsonLines(
      path.join(process.cwd(), "data", "processed", "embeddings.jsonl")
    );

    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("delete from chunks");
      await client.query("delete from documents");

      for (const document of documents) {
        await upsertDocument(client, document);
      }

      for (const chunk of chunks) {
        await upsertChunk(client, chunk);
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    console.log(`loaded ${documents.length} documents and ${chunks.length} chunks`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
