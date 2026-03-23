import { loadConfig } from "../lib/config.js";
import { generateAnswer } from "../lib/llm.js";
import { presentHit, searchWithBackend } from "../lib/retrieval.js";

async function main() {
  const question = process.argv.slice(2).join(" ").trim();
  if (!question) {
    throw new Error("Usage: npm run ask -- <question>");
  }

  const config = await loadConfig();
  const { backend, hits } = await searchWithBackend(question, config, { limit: 5 });
  const answer = await generateAnswer(question, hits, config);

  console.log(`Backend: ${backend}`);
  console.log(answer);
  console.log("\nKilder:");

  for (const [indexNumber, rawHit] of hits.entries()) {
    const hit = presentHit(rawHit);
    const reference = hit.referenceLabel ? ` | ${hit.referenceLabel}` : "";
    console.log(
      `${indexNumber + 1}. ${hit.title} | ${hit.documentId}${reference} | score=${hit.score} | ${hit.htmlUrl}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
