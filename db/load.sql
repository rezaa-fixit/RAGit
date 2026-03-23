\set ON_ERROR_STOP on

\echo Loading documents from data/processed/documents.import.jsonl
\copy documents (
  id,
  source,
  title,
  decision_date,
  ministry,
  topics,
  case_numbers,
  html_url,
  pdf_url,
  retsinformation_url,
  summary,
  raw_document
) FROM PROGRAM 'node ./src/cli/export-documents-ndjson.js' WITH (format text);

\echo Loading chunks from data/processed/chunks.import.jsonl
\copy chunks (
  id,
  document_id,
  chunk_index,
  title,
  decision_date,
  ministry,
  topics,
  case_numbers,
  html_url,
  pdf_url,
  retsinformation_url,
  text,
  embedding,
  metadata
) FROM PROGRAM 'node ./src/cli/export-chunks-ndjson.js' WITH (format text);
