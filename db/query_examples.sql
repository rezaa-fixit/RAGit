-- Hybrid retrieval example.
-- Replace :query_embedding with a pgvector literal like:
-- '[0.01,0.02,...]'

WITH vector_hits AS (
  SELECT
    c.id,
    c.document_id,
    c.title,
    c.text,
    c.html_url,
    c.pdf_url,
    c.retsinformation_url,
    c.ministry,
    c.topics,
    c.decision_date,
    1 - (c.embedding <=> :query_embedding::vector) AS vector_score
  FROM chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> :query_embedding::vector
  LIMIT 20
),
keyword_hits AS (
  SELECT
    c.id,
    ts_rank_cd(
      to_tsvector('danish', coalesce(c.title, '') || ' ' || coalesce(c.text, '')),
      plainto_tsquery('danish', :query_text)
    ) AS keyword_score
  FROM chunks c
  WHERE to_tsvector('danish', coalesce(c.title, '') || ' ' || coalesce(c.text, ''))
        @@ plainto_tsquery('danish', :query_text)
  ORDER BY keyword_score DESC
  LIMIT 20
)
SELECT
  v.id,
  v.document_id,
  v.title,
  v.text,
  v.html_url,
  v.pdf_url,
  v.retsinformation_url,
  v.ministry,
  v.topics,
  v.decision_date,
  v.vector_score,
  coalesce(k.keyword_score, 0) AS keyword_score,
  (v.vector_score * 0.7) + (coalesce(k.keyword_score, 0) * 0.3) AS hybrid_score
FROM vector_hits v
LEFT JOIN keyword_hits k ON k.id = v.id
ORDER BY hybrid_score DESC
LIMIT 10;
