function buildMockEmbedding(text, dimensions) {
  const vector = new Array(dimensions).fill(0);

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const slot = index % dimensions;
    vector[slot] += ((code % 97) + 1) / 100;
  }

  const magnitude =
    Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;

  return vector.map((value) => Number((value / magnitude).toFixed(8)));
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function vectorToSqlLiteral(vector) {
  return `[${vector.join(",")}]`;
}

export async function embedTexts(texts, config) {
  if (config.embeddingProvider === "mock") {
    return texts.map((text) =>
      buildMockEmbedding(text, config.embeddingDimensions)
    );
  }

  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const batches = chunkArray(texts, 50);
  const vectors = [];

  for (const batch of batches) {
    const response = await fetch(`${config.openAiBaseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.embeddingModel,
        input: batch,
        dimensions: config.embeddingDimensions
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Embedding request failed: ${response.status} ${message}`);
    }

    const payload = await response.json();
    for (const item of payload.data) {
      vectors.push(item.embedding);
    }
  }

  return vectors;
}

export function enrichChunksWithEmbeddings(chunks, embeddings, config) {
  return chunks.map((chunk, index) => ({
    ...chunk,
    embeddingModel: config.embeddingModel,
    embeddingDimensions: config.embeddingDimensions,
    embedding: embeddings[index],
    embeddingSql: vectorToSqlLiteral(embeddings[index]),
    metadata: {
      source: "folketingets-ombudsmand",
      embeddingModel: config.embeddingModel,
      sourceType: chunk.sourceType ?? null,
      ministry: chunk.ministry ?? null,
      topics: chunk.topics ?? [],
      pageStart: chunk.pageStart ?? null,
      pageEnd: chunk.pageEnd ?? null,
      sectionTitle: chunk.sectionTitle ?? null
    }
  }));
}
