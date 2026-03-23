import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

function buildSslConfig(config) {
  if (config.pgSslMode === "disable") {
    return false;
  }

  return {
    rejectUnauthorized: config.pgSslMode !== "require-no-verify"
  };
}

export function createPool(config) {
  return new Pool({
    host: config.pgHost,
    port: config.pgPort,
    database: config.pgDatabase,
    user: config.pgUser,
    password: config.pgPassword,
    ssl: buildSslConfig(config)
  });
}

export async function testConnection(pool) {
  const client = await pool.connect();
  try {
    await client.query("select 1");
  } finally {
    client.release();
  }
}

export async function runSchema(pool) {
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");
  await pool.query(schemaSql);
}

export async function upsertDocument(client, document) {
  await client.query(
    `
      insert into documents (
        id, source, title, decision_date, ministry, topics, case_numbers,
        html_url, pdf_url, retsinformation_url, summary, raw_document, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6::text[], $7::text[],
        $8, $9, $10, $11, $12::jsonb, now()
      )
      on conflict (id) do update set
        source = excluded.source,
        title = excluded.title,
        decision_date = excluded.decision_date,
        ministry = excluded.ministry,
        topics = excluded.topics,
        case_numbers = excluded.case_numbers,
        html_url = excluded.html_url,
        pdf_url = excluded.pdf_url,
        retsinformation_url = excluded.retsinformation_url,
        summary = excluded.summary,
        raw_document = excluded.raw_document,
        updated_at = now()
    `,
    [
      document.fobId,
      document.source,
      document.title,
      toIsoDate(document.date),
      document.ministry,
      document.topics ?? [],
      document.caseNumbers ?? [],
      document.htmlUrl,
      document.pdfUrl,
      document.retsinformationUrl,
      document.summary,
      JSON.stringify(document)
    ]
  );
}

export async function upsertChunk(client, chunk) {
  await client.query(
    `
      insert into chunks (
        id, document_id, chunk_index, title, decision_date, ministry, topics,
        case_numbers, html_url, pdf_url, retsinformation_url, text, embedding,
        metadata, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7::text[],
        $8::text[], $9, $10, $11, $12, $13::vector,
        $14::jsonb, now()
      )
      on conflict (id) do update set
        document_id = excluded.document_id,
        chunk_index = excluded.chunk_index,
        title = excluded.title,
        decision_date = excluded.decision_date,
        ministry = excluded.ministry,
        topics = excluded.topics,
        case_numbers = excluded.case_numbers,
        html_url = excluded.html_url,
        pdf_url = excluded.pdf_url,
        retsinformation_url = excluded.retsinformation_url,
        text = excluded.text,
        embedding = excluded.embedding,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      chunk.chunkId,
      chunk.documentId,
      chunk.chunkIndex,
      chunk.title,
      toIsoDate(chunk.date),
      chunk.ministry,
      chunk.topics ?? [],
      chunk.caseNumbers ?? [],
      chunk.htmlUrl,
      chunk.pdfUrl,
      chunk.retsinformationUrl,
      chunk.text,
      toVectorLiteral(chunk.embedding ?? []),
      JSON.stringify(chunk.metadata ?? {})
    ]
  );
}

export async function searchDatabase(pool, queryEmbedding, question, options = {}) {
  const limit = options.limit ?? 5;
  const perDocumentLimit = options.perDocumentLimit ?? 2;
  const filters = options.filters ?? {};
  const params = [];

  function pushParam(value) {
    params.push(value);
    return `$${params.length}`;
  }

  const vectorParam = pushParam(toVectorLiteral(queryEmbedding));
  const questionParam = pushParam(question);
  const perDocumentLimitParam = pushParam(perDocumentLimit);
  const limitParam = pushParam(limit);

  const filterClauses = [];
  if (filters.year) {
    filterClauses.push(`extract(year from c.decision_date) = ${pushParam(Number(filters.year))}`);
  }

  if (filters.ministry) {
    filterClauses.push(`c.ministry ilike ${pushParam(`%${filters.ministry}%`)}`);
  }

  if (filters.topic) {
    filterClauses.push(
      `exists (
        select 1
        from unnest(c.topics) as topic
        where topic ilike ${pushParam(`%${filters.topic}%`)}
      )`
    );
  }

  const filterWhere = filterClauses.length > 0
    ? `where ${filterClauses.join("\n          and ")}`
    : "";

  const result = await pool.query(
    `
      with filtered_chunks as (
        select *
        from chunks c
        ${filterWhere}
      ),
      vector_hits as (
        select
          c.id,
          1 - (c.embedding <=> ${vectorParam}::vector) as vector_score
        from filtered_chunks c
        where c.embedding is not null
        order by c.embedding <=> ${vectorParam}::vector
        limit 100
      ),
      keyword_hits as (
        select
          c.id,
          ts_rank_cd(
            to_tsvector('danish', coalesce(c.title, '') || ' ' || coalesce(c.text, '')),
            plainto_tsquery('danish', ${questionParam})
          ) as lexical_score
        from filtered_chunks c
        where to_tsvector('danish', coalesce(c.title, '') || ' ' || coalesce(c.text, ''))
          @@ plainto_tsquery('danish', ${questionParam})
        order by lexical_score desc
        limit 100
      ),
      title_hits as (
        select
          c.id,
          ts_rank_cd(
            to_tsvector(
              'danish',
              coalesce(c.title, '') || ' ' || coalesce(array_to_string(c.topics, ' '), '')
            ),
            plainto_tsquery('danish', ${questionParam})
          ) as title_score
        from filtered_chunks c
        where to_tsvector(
          'danish',
          coalesce(c.title, '') || ' ' || coalesce(array_to_string(c.topics, ' '), '')
        ) @@ plainto_tsquery('danish', ${questionParam})
        order by title_score desc
        limit 100
      ),
      candidate_ids as (
        select id from vector_hits
        union
        select id from keyword_hits
        union
        select id from title_hits
      ),
      scored as (
        select
          c.id,
          c.document_id,
          c.chunk_index,
          c.title,
          c.decision_date,
          c.ministry,
          c.topics,
          c.case_numbers,
          c.html_url,
          c.pdf_url,
          c.retsinformation_url,
          c.text,
          c.metadata,
          coalesce(k.lexical_score, 0) as lexical_score,
          coalesce(t.title_score, 0) as title_score,
          coalesce(v.vector_score, 0) as vector_score,
          (
            coalesce(v.vector_score, 0) * 0.55 +
            coalesce(k.lexical_score, 0) * 0.25 +
            coalesce(t.title_score, 0) * 0.20 +
            case when coalesce(c.pdf_url, '') = '' then -0.03 else 0 end
          ) as score
        from candidate_ids ids
        join chunks c on c.id = ids.id
        left join vector_hits v on v.id = c.id
        left join keyword_hits k on k.id = c.id
        left join title_hits t on t.id = c.id
      ),
      ranked as (
        select
          *,
          row_number() over (
            partition by document_id
            order by score desc, title_score desc, lexical_score desc, vector_score desc
          ) as document_rank
        from scored
      )
      select *
      from ranked
      where document_rank <= ${perDocumentLimitParam}
      order by score desc, title_score desc, lexical_score desc, vector_score desc
      limit ${limitParam}
    `,
    params
  );

  return result.rows.map((row) => ({
    documentId: row.document_id,
    chunkId: row.id,
    chunkIndex: row.chunk_index,
    title: row.title,
    date: row.decision_date ? formatDate(row.decision_date) : null,
    ministry: row.ministry,
    topics: row.topics ?? [],
    caseNumbers: row.case_numbers ?? [],
    htmlUrl: row.html_url,
    pdfUrl: row.pdf_url,
    retsinformationUrl: row.retsinformation_url,
    text: row.text,
    sourceType: row.metadata?.sourceType ?? null,
    pageStart: row.metadata?.pageStart ?? null,
    pageEnd: row.metadata?.pageEnd ?? null,
    sectionTitle: row.metadata?.sectionTitle ?? null,
    score: Number(row.score),
    lexicalScore: Number(row.lexical_score),
    titleScore: Number(row.title_score),
    vectorScore: Number(row.vector_score)
  }));
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const [day, month, year] = value.split("-");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function toVectorLiteral(vector) {
  return `[${vector.join(",")}]`;
}
