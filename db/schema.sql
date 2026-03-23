CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  source text NOT NULL,
  title text NOT NULL,
  decision_date date,
  ministry text,
  topics text[] NOT NULL DEFAULT '{}',
  case_numbers text[] NOT NULL DEFAULT '{}',
  html_url text NOT NULL,
  pdf_url text,
  retsinformation_url text,
  summary text NOT NULL,
  raw_document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  title text NOT NULL,
  decision_date date,
  ministry text,
  topics text[] NOT NULL DEFAULT '{}',
  case_numbers text[] NOT NULL DEFAULT '{}',
  html_url text NOT NULL,
  pdf_url text,
  retsinformation_url text,
  text text NOT NULL,
  embedding vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS chunks_document_id_chunk_index_idx
  ON chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS documents_decision_date_idx
  ON documents (decision_date DESC);

CREATE INDEX IF NOT EXISTS documents_ministry_idx
  ON documents (ministry);

CREATE INDEX IF NOT EXISTS chunks_decision_date_idx
  ON chunks (decision_date DESC);

CREATE INDEX IF NOT EXISTS chunks_ministry_idx
  ON chunks (ministry);

CREATE INDEX IF NOT EXISTS chunks_topics_gin_idx
  ON chunks USING gin (topics);

CREATE INDEX IF NOT EXISTS chunks_case_numbers_gin_idx
  ON chunks USING gin (case_numbers);

CREATE INDEX IF NOT EXISTS chunks_text_tsv_idx
  ON chunks
  USING gin (to_tsvector('danish', coalesce(title, '') || ' ' || coalesce(text, '')));

CREATE INDEX IF NOT EXISTS chunks_embedding_cosine_idx
  ON chunks
  USING hnsw (embedding vector_cosine_ops);
