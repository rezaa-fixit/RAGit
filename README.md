# Ombudsmanden RAG

RAG-applikation over Folketingets Ombudsmands udtalelser med:

- ingestion af arssider, sagssider og PDF'er
- chunking, embeddings og hybrid retrieval
- sokning mod lokale JSONL-filer eller PostgreSQL med `pgvector`
- web-UI med sogning, svar, filtre og workspace for gemte afgorelser

## Status

Projektet kan nu:

- hente og parse Ombudsmandens udtalelser
- indeksere dokumenter i Neon/Postgres med `pgvector`
- svare via `/search` og `/ask`
- vise et moderne UI pa `/`
- gemme pinned afgorelser, noter, labels og sogehistorik i browseren
- beskytte UI og API med enkel HTTP Basic Auth

## Lokal drift

Krav:

- Node.js 20+
- en `.env` baseret pa [`.env.example`](C:\Users\RezaAhmadian\OneDrive - Resolva ApS\Dokumenter\New project\.env.example)

Start appen:

```bash
npm install
npm run validate-config
npm start
```

Serveren starter pa `http://localhost:3000` som standard.

## Dataflow

Hvis du vil bygge eller opdatere korpuset:

```bash
npm run ingest -- --years=2025,2024,2023
npm run build-corpus
npm run embed-corpus
npm run db:init
npm run db:load
```

## API

- `GET /health`
- `GET /ready`
- `GET /metadata`
- `GET /search?q=...&limit=5&year=2024&ministry=...&topic=...`
- `POST /ask`

Eksempel pa `/ask` body:

```json
{
  "question": "Hvad siger ombudsmanden om aktindsigt?",
  "limit": 5,
  "filters": {
    "year": null,
    "ministry": null,
    "topic": null
  }
}
```

## Miljovariabler

Se [`.env.example`](C:\Users\RezaAhmadian\OneDrive - Resolva ApS\Dokumenter\New project\.env.example). De vigtigste er:

- `SEARCH_BACKEND=auto|postgres|file`
- `OPENAI_API_KEY`
- `EMBEDDING_PROVIDER=openai|mock`
- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSLMODE`
- `PORT`
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASSWORD`

Hvis `BASIC_AUTH_USER` og `BASIC_AUTH_PASSWORD` er sat, bliver UI og API beskyttet med HTTP Basic Auth. `GET /health` og `GET /ready` forbliver offentlige, sa hosting-platforme stadig kan lave health checks og readiness checks.

## Docker

Byg image:

```bash
docker build -t ombudsmanden-rag .
```

Kor container:

```bash
docker run --rm -p 3000:3000 --env-file .env ombudsmanden-rag
```

Containeren forventer, at embeddings og database allerede er klargjort. Den er lavet til serving, ikke til ingestion.

## Deployment

Den letteste produktionssti er en simpel container-platform som:

- Railway
- Render
- Fly.io

Minimum for deployment:

1. deploy containeren
2. saet miljo-variabler fra `.env`
3. peg appen pa Neon via `SEARCH_BACKEND=postgres`
4. sorg for at `db:init` og `db:load` allerede er koert mod Neon

### Railway

Repoet indeholder nu:

- [railway.json](C:\Users\RezaAhmadian\OneDrive - Resolva ApS\Dokumenter\New project\railway.json)
- [Procfile](C:\Users\RezaAhmadian\OneDrive - Resolva ApS\Dokumenter\New project\Procfile)
- [Dockerfile](C:\Users\RezaAhmadian\OneDrive - Resolva ApS\Dokumenter\New project\Dockerfile)

Sat mindst disse variabler i Railway:

- `NODE_ENV=production`
- `SEARCH_BACKEND=postgres`
- `OPENAI_API_KEY`
- `EMBEDDING_PROVIDER=openai`
- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSLMODE=require`
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASSWORD`

Anbefalet Railway-flow:

1. opret en ny service fra repoet
2. vaelg Docker deployment
3. saet miljo-variablerne ovenfor
4. deploy og kontroller `GET /health` og `GET /ready`
5. abn appen og log ind med Basic Auth

### Render

Repoet indeholder nu ogsa [render.yaml](C:\Users\RezaAhmadian\OneDrive - Resolva ApS\Dokumenter\New project\render.yaml).

Pa Render kan du:

1. oprette en ny Web Service fra repoet
2. bruge Docker-runtime
3. saette de samme miljo-variabler som ovenfor
4. bruge `/health` som health check
5. kontrollere `/ready` efter første deploy

### For production cutover

For appen eksponeres udadtil, bor du:

1. sikre at `.env` og nøglefiler ikke er committed
2. validere at Neon indeholder det onskede korpus
3. køre `npm run validate-config` lokalt eller i CI
4. teste `/health`, `/ready`, `/search` og `/ask` mod den hostede version
5. saette `BASIC_AUTH_USER` og `BASIC_AUTH_PASSWORD`, hvis UI'et ikke skal vaere offentligt

## Sikkerhed

Folgende er nu ignoreret i git:

- `.env`
- lokale logfiler
- filer med API-nogler i navnet

## Naeste skridt

- deployment til en rigtig host
- finpudsning af auth og deling
- deling eller eksport af workspaces
- mere avanceret sammenligning mellem pinned afgorelser
