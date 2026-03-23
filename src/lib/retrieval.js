import path from "node:path";
import { readJsonLines } from "./jsonl.js";
import { embedTexts } from "./embeddings.js";
import { createPool, searchDatabase, testConnection } from "./postgres.js";

const STOPWORDS = new Set([
  "af",
  "at",
  "de",
  "den",
  "det",
  "der",
  "du",
  "en",
  "er",
  "et",
  "for",
  "fra",
  "har",
  "hvad",
  "hvordan",
  "hvorfor",
  "hvis",
  "i",
  "ikke",
  "kan",
  "med",
  "mig",
  "min",
  "om",
  "og",
  "på",
  "sig",
  "siger",
  "skal",
  "som",
  "til",
  "ved",
  "var",
  "vil"
]);

const LEGAL_SYNONYMS = new Map([
  ["aktindsigt", ["offentlighedsloven", "ekstrahering", "meroffentlighed", "temakrav"]],
  ["telefonbetjening", ["telefoniske", "henvendelser", "vejledning", "tilgængelighed"]],
  ["spidsbelastningsperioder", ["spidsbelastningsperiode", "ventetider", "afviste", "telefonopkald"]],
  ["begrundelse", ["begrundelsespligt", "begrundelse", "afgørelse"]],
  ["partshøring", ["høring", "partshøring", "forvaltningsloven"]],
  ["meroffentlighed", ["meroffentlighed", "offentlighedslovens", "§", "14"]],
  ["ekstrahering", ["ekstrahering", "ekstraheringspligt", "faktiske", "oplysninger"]],
  ["temakrav", ["temakrav", "offentlighedslovens", "§", "9"]],
  ["tavshedspligt", ["tavshedspligt", "fortrolige", "oplysninger"]],
  ["god", ["god", "forvaltningsskik"]],
  ["forvaltningsskik", ["god", "forvaltningsskik"]]
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !STOPWORDS.has(token));
}

function expandQueryTokens(question) {
  const baseTokens = tokenize(question);
  const expanded = new Set(baseTokens);

  for (const token of baseTokens) {
    const synonyms = LEGAL_SYNONYMS.get(token);
    if (!synonyms) {
      continue;
    }

    for (const synonym of synonyms) {
      for (const synonymToken of tokenize(synonym)) {
        expanded.add(synonymToken);
      }
    }
  }

  return [...expanded];
}

function cosineSimilarity(left, right) {
  if (!left || !right || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function keywordScore(queryTokens, row) {
  const haystack = tokenize(
    [row.title, row.text, row.ministry, ...(row.topics ?? [])].filter(Boolean).join(" ")
  );
  const haystackSet = new Set(haystack);

  let matches = 0;
  for (const token of queryTokens) {
    if (haystackSet.has(token)) {
      matches += 1;
    }
  }

  return queryTokens.length === 0 ? 0 : matches / queryTokens.length;
}

function titleScore(queryTokens, row) {
  const haystack = tokenize(
    [row.title, row.ministry, ...(row.topics ?? [])].filter(Boolean).join(" ")
  );
  const haystackSet = new Set(haystack);

  let matches = 0;
  for (const token of queryTokens) {
    if (haystackSet.has(token)) {
      matches += 1;
    }
  }

  return queryTokens.length === 0 ? 0 : matches / queryTokens.length;
}

function parseEmbeddingRows(rows) {
  return rows.map((row) => ({
    ...row,
    embedding: Array.isArray(row.embedding) ? row.embedding : null
  }));
}

function normalizeFilterValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function extractYearFromDate(value) {
  const match = String(value ?? "").match(/(\d{4})$/);
  return match ? Number(match[1]) : null;
}

function matchesFilters(row, filters = {}) {
  const year = filters.year ? Number(filters.year) : null;
  const ministry = normalizeFilterValue(filters.ministry);
  const topic = normalizeFilterValue(filters.topic);

  if (year && extractYearFromDate(row.date) !== year) {
    return false;
  }

  if (ministry) {
    const rowMinistry = normalizeFilterValue(row.ministry);
    if (!rowMinistry.includes(ministry)) {
      return false;
    }
  }

  if (topic) {
    const topics = (row.topics ?? []).map((item) => normalizeFilterValue(item));
    if (!topics.some((item) => item.includes(topic))) {
      return false;
    }
  }

  return true;
}

function filterRowsByMetadata(rows, filters = {}) {
  if (!filters.year && !filters.ministry && !filters.topic) {
    return rows;
  }

  return rows.filter((row) => matchesFilters(row, filters));
}

export async function loadSearchIndex() {
  const processedDir = path.join(process.cwd(), "data", "processed");
  const corpusRows = await readJsonLines(path.join(processedDir, "corpus.jsonl"));

  let embeddingRows = [];
  try {
    embeddingRows = parseEmbeddingRows(
      await readJsonLines(path.join(processedDir, "embeddings.jsonl"))
    );
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const embeddingByChunkId = new Map(
    embeddingRows.map((row) => [row.chunkId, row.embedding])
  );

  return corpusRows.map((row) => ({
    ...row,
    embedding: embeddingByChunkId.get(row.chunkId) ?? null
  }));
}

function substringMatchRatio(queryTokens, values) {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  if (queryTokens.length === 0 || !haystack) {
    return 0;
  }

  let matches = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      matches += 1;
    }
  }

  return matches / queryTokens.length;
}

function normalizeForComparison(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textFingerprint(text, maxTokens = 32) {
  return normalizeForComparison(text)
    .split(" ")
    .filter(Boolean)
    .slice(0, maxTokens)
    .join(" ");
}

function tokenOverlapRatio(leftText, rightText) {
  const leftTokens = new Set(tokenize(leftText));
  const rightTokens = new Set(tokenize(rightText));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

function isNearDuplicate(leftRow, rightRow) {
  if (!leftRow || !rightRow) {
    return false;
  }

  const leftFingerprint = textFingerprint(leftRow.text);
  const rightFingerprint = textFingerprint(rightRow.text);
  if (leftFingerprint && leftFingerprint === rightFingerprint) {
    return true;
  }

  return tokenOverlapRatio(leftRow.text, rightRow.text) >= 0.85;
}

function qualityAdjustment(row) {
  let adjustment = 0;

  if (!row.pdfUrl) {
    adjustment -= 0.04;
  }

  if (/Gammeltorv 22|Kontakt|Tilgængelighedserklæring|Cookies/i.test(row.text ?? "")) {
    adjustment -= 0.08;
  }

  return adjustment;
}

function formatPageLabel(pageStart, pageEnd) {
  if (!pageStart && !pageEnd) {
    return null;
  }

  if (pageStart && pageEnd && pageStart !== pageEnd) {
    return `s. ${pageStart}-${pageEnd}`;
  }

  return `s. ${pageStart ?? pageEnd}`;
}

function normalizeMetadataLabel(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function isNarrativeLike(value) {
  const normalized = normalizeMetadataLabel(value);
  if (!normalized) {
    return true;
  }

  if (normalized.length > 80) {
    return true;
  }

  if (/[.!?]/.test(normalized)) {
    return true;
  }

  if ((normalized.match(/,/g) ?? []).length >= 2) {
    return true;
  }

  if (normalized.split(" ").length > 10) {
    return true;
  }

  return /\b(klagede|bad|afslag|journalist|myndigheden|ombudsmanden|referater|dokumenter)\b/i.test(
    normalized
  );
}

function sanitizeMetadataLabel(value, type) {
  const normalized = normalizeMetadataLabel(value);
  if (!normalized || isNarrativeLike(normalized)) {
    return null;
  }

  if (type === "ministry") {
    const looksInstitutional =
      /\b(ministeriet|ministerium|styrelsen|tilsynet|politiet|ankestyrelsen|forvaltningen)\b/i.test(
        normalized
      ) || normalized.split(" ").length <= 5;

    return looksInstitutional ? normalized : null;
  }

  return normalized;
}

function isUsefulSectionTitle(sectionTitle) {
  if (!sectionTitle) {
    return false;
  }

  const raw = String(sectionTitle).trim();
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return false;
  }

  if (normalized.length > 72) {
    return false;
  }

  const lineCount = raw.split("\n").filter(Boolean).length;
  if (lineCount > 2) {
    return false;
  }

  if (/^[a-zæøå]/.test(normalized)) {
    return false;
  }

  if (/^\d{4}\b/.test(normalized)) {
    return false;
  }

  if (/[,:;][^0-9]/.test(normalized)) {
    return false;
  }

  const wordCount = normalized.split(" ").length;
  const isNumberedHeading = /^\d+(\.\d+)*\.?\s+\S/.test(normalized);
  const looksLikeShortHeading =
    wordCount <= 8 &&
    !/[.!?]/.test(normalized) &&
    !/,/.test(normalized);

  return (isNumberedHeading && wordCount <= 10) || looksLikeShortHeading;
}

function enrichPresentationMetadata(hit) {
  const pageLabel = formatPageLabel(hit.pageStart, hit.pageEnd);
  const sectionTitle = isUsefulSectionTitle(hit.sectionTitle) ? hit.sectionTitle : null;
  const referenceLabel = [sectionTitle, pageLabel].filter(Boolean).join(" | ") || null;

  return {
    ...hit,
    pageLabel,
    sectionTitle,
    referenceLabel
  };
}

function aggregateDocuments(rerankedRows) {
  const groups = new Map();

  for (const row of rerankedRows) {
    const existing = groups.get(row.documentId);
    if (existing) {
      existing.rows.push(row);
      continue;
    }

    groups.set(row.documentId, {
      documentId: row.documentId,
      rows: [row]
    });
  }

  return [...groups.values()]
    .map((group) => {
      group.rows.sort((left, right) => right.rerankedScore - left.rerankedScore);

      const best = group.rows[0]?.rerankedScore ?? 0;
      const second = group.rows[1]?.rerankedScore ?? 0;
      const averageTitle =
        group.rows.reduce((sum, row) => sum + Number(row.titleScore ?? 0), 0) / group.rows.length;
      const averageLexical =
        group.rows.reduce((sum, row) => sum + Number(row.lexicalScore ?? 0), 0) / group.rows.length;
      const pdfBonus = group.rows.some((row) => row.sourceType === "pdf") ? 0.02 : 0;

      return {
        ...group,
        documentScore: Number(
          (best * 0.72 + second * 0.18 + averageTitle * 0.06 + averageLexical * 0.04 + pdfBonus)
            .toFixed(4)
        )
      };
    })
    .sort((left, right) => right.documentScore - left.documentScore);
}

function filterWeakDocumentGroups(documentGroups) {
  if (documentGroups.length === 0) {
    return documentGroups;
  }

  const topDocumentScore = documentGroups[0].documentScore;
  const minimumScore = Math.max(0.12, topDocumentScore * 0.24);

  return documentGroups.filter((group, index) => {
    if (index === 0) {
      return true;
    }

    const bestRow = group.rows[0];
    const hasStrongLexicalSignal =
      Number(bestRow?.titleScore ?? 0) >= 0.15 || Number(bestRow?.lexicalScore ?? 0) >= 0.08;

    return group.documentScore >= minimumScore || hasStrongLexicalSignal;
  });
}

function selectDiverseHits(documentGroups, options = {}) {
  const limit = options.limit ?? 5;
  const perDocumentLimit = options.perDocumentLimit ?? 2;
  const selected = [];
  const selectedByDocument = new Map();

  function trySelect(row, documentScore, documentRank) {
    const currentRows = selectedByDocument.get(row.documentId) ?? [];
    if (currentRows.length >= perDocumentLimit) {
      return false;
    }

    for (const existing of currentRows) {
      if (isNearDuplicate(existing, row)) {
        return false;
      }
    }

    for (const existing of selected) {
      if (existing.documentId !== row.documentId && isNearDuplicate(existing, row)) {
        return false;
      }
    }

    const selectedRow = {
      ...row,
      documentScore,
      documentRank,
      score: row.rerankedScore
    };

    selected.push(selectedRow);
    selectedByDocument.set(row.documentId, [...currentRows, selectedRow]);
    return true;
  }

  for (const [index, group] of documentGroups.entries()) {
    if (selected.length >= limit) {
      break;
    }

    const primary = group.rows[0];
    if (primary) {
      trySelect(primary, group.documentScore, index + 1);
    }
  }

  if (selected.length >= limit) {
    return selected.slice(0, limit);
  }

  for (let position = 1; position < perDocumentLimit; position += 1) {
    for (const [index, group] of documentGroups.entries()) {
      if (selected.length >= limit) {
        break;
      }

      const candidate = group.rows[position];
      if (!candidate) {
        continue;
      }

      trySelect(candidate, group.documentScore, index + 1);
    }
  }

  return selected
    .sort((left, right) => {
      if (left.documentRank !== right.documentRank) {
        return left.documentRank - right.documentRank;
      }

      return right.score - left.score;
    })
    .slice(0, limit);
}

function rerankCandidates(candidates, question, config, options = {}) {
  const perDocumentLimit = options.perDocumentLimit ?? 2;
  const queryTokens = expandQueryTokens(question);
  const questionLower = question.toLowerCase();
  const baseWeight = config.embeddingProvider === "mock" ? 0.15 : 0.35;

  const reranked = candidates.map((row) => {
    const titleMatch = substringMatchRatio(queryTokens, [
      row.title,
      row.ministry,
      ...(row.topics ?? [])
    ]);
    const bodyMatch = substringMatchRatio(queryTokens, [row.text]);
    const phraseBonus =
      row.title?.toLowerCase().includes(questionLower) ||
      row.text?.toLowerCase().includes(questionLower)
        ? 0.12
        : 0;
    const ministryBonus = substringMatchRatio(queryTokens, [row.ministry]) > 0 ? 0.04 : 0;
    const topicBonus = substringMatchRatio(queryTokens, row.topics ?? []) > 0 ? 0.06 : 0;
    const sourceBonus = row.sourceType === "pdf" ? 0.03 : 0;
    const quality = qualityAdjustment(row);
    const baseScore = Number(row.score ?? 0);

    const rerankedScore =
      baseScore * baseWeight +
      titleMatch * 0.4 +
      bodyMatch * 0.25 +
      (row.lexicalScore ?? 0) * 0.1 +
      phraseBonus +
      ministryBonus +
      topicBonus +
      sourceBonus +
      quality;

    return {
      ...row,
      titleScore: Number(Math.max(row.titleScore ?? 0, titleMatch).toFixed(4)),
      rerankedScore: Number(rerankedScore.toFixed(4))
    };
  });

  reranked.sort((left, right) => right.rerankedScore - left.rerankedScore);
  const documentGroups = filterWeakDocumentGroups(aggregateDocuments(reranked));
  return selectDiverseHits(documentGroups, {
    ...options,
    perDocumentLimit
  });
}

export async function searchIndex(indexRows, question, config, options = {}) {
  const limit = options.limit ?? 5;
  const filteredRows = filterRowsByMetadata(indexRows, options.filters);
  const queryTokens = expandQueryTokens(question);
  const hasEmbeddings = filteredRows.some((row) => Array.isArray(row.embedding));

  let queryEmbedding = null;
  if (hasEmbeddings) {
    [queryEmbedding] = await embedTexts([question], config);
  }

  const scored = filteredRows.map((row) => {
    const lexical = keywordScore(queryTokens, row);
    const title = titleScore(queryTokens, row);
    const vector = queryEmbedding && row.embedding
      ? cosineSimilarity(queryEmbedding, row.embedding)
      : 0;
    const score = queryEmbedding
      ? lexical * 0.25 + title * 0.2 + vector * 0.55
      : lexical * 0.6 + title * 0.4;

    return {
      ...row,
      lexicalScore: Number(lexical.toFixed(4)),
      titleScore: Number(title.toFixed(4)),
      vectorScore: Number(vector.toFixed(4)),
      score: Number(score.toFixed(4))
    };
  });

  const ranked = scored
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(limit * 12, 60));

  return rerankCandidates(ranked, question, config, options);
}

export async function searchWithBackend(question, config, options = {}) {
  if (config.searchBackend === "postgres" || config.searchBackend === "auto") {
    try {
      const pool = createPool(config);
      try {
        await testConnection(pool);
        const [queryEmbedding] = await embedTexts([question], config);
        const candidates = await searchDatabase(pool, queryEmbedding, question, {
          ...options,
          limit: Math.max((options.limit ?? 5) * 12, 60)
        });
        const hits = rerankCandidates(candidates, question, config, options);
        return { backend: "postgres", hits };
      } finally {
        await pool.end();
      }
    } catch (error) {
      if (config.searchBackend === "postgres") {
        throw error;
      }
    }
  }

  const indexRows = await loadSearchIndex();
  const hits = await searchIndex(indexRows, question, config, options);
  return { backend: "file", hits };
}

export function presentHit(hit) {
  const topics = (hit.topics ?? [])
    .map((topic) => sanitizeMetadataLabel(topic, "topic"))
    .filter(Boolean);

  return enrichPresentationMetadata({
    documentId: hit.documentId,
    chunkId: hit.chunkId,
    chunkIndex: hit.chunkIndex,
    title: hit.title,
    date: hit.date,
    ministry: sanitizeMetadataLabel(hit.ministry, "ministry") ?? hit.ministry ?? null,
    topics,
    caseNumbers: hit.caseNumbers,
    htmlUrl: hit.htmlUrl,
    pdfUrl: hit.pdfUrl,
    retsinformationUrl: hit.retsinformationUrl,
    sourceType: hit.sourceType,
    sectionTitle: hit.sectionTitle,
    pageStart: hit.pageStart,
    pageEnd: hit.pageEnd,
    documentScore: hit.documentScore,
    documentRank: hit.documentRank,
    score: hit.score,
    lexicalScore: hit.lexicalScore,
    titleScore: hit.titleScore,
    vectorScore: hit.vectorScore,
    text: hit.text
  });
}

export function collectMetadata(indexRows) {
  const years = new Set();
  const ministries = new Set();
  const topics = new Set();

  for (const row of indexRows) {
    const year = extractYearFromDate(row.date);
    if (year) {
      years.add(year);
    }

    const ministry = sanitizeMetadataLabel(row.ministry, "ministry");
    if (ministry) {
      ministries.add(ministry);
    }

    for (const topic of row.topics ?? []) {
      const normalizedTopic = sanitizeMetadataLabel(topic, "topic");
      if (normalizedTopic) {
        topics.add(normalizedTopic);
      }
    }
  }

  return {
    years: [...years].sort((left, right) => right - left),
    ministries: [...ministries].sort((left, right) => left.localeCompare(right, "da")),
    topics: [...topics].sort((left, right) => left.localeCompare(right, "da"))
  };
}
