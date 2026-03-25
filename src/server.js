import http from "node:http";
import { loadConfig } from "./lib/config.js";
import { generateAnswer } from "./lib/llm.js";
import { createPool, fetchDatabaseMetadata, testConnection } from "./lib/postgres.js";
import {
  collectMetadata,
  loadSearchIndex,
  presentHit,
  searchIndex,
  searchWithBackend
} from "./lib/retrieval.js";
import { renderWebUi } from "./lib/web-ui.js";

function json(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  response.end(JSON.stringify(payload, null, 2));
}

function serializeError(error) {
  if (error instanceof AggregateError) {
    const nested = error.errors
      .map((item) => serializeError(item).error)
      .filter(Boolean);

    return {
      error: nested[0] ?? error.message ?? "Unknown aggregate error",
      code: error.code ?? null,
      details: nested
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message || String(error),
      code: error.code ?? null
    };
  }

  return {
    error: String(error)
  };
}

async function loadOptionalSearchIndex() {
  try {
    return await loadSearchIndex();
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function unauthorized(response) {
  response.writeHead(401, {
    "Content-Type": "application/json; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="Ombudsmanden RAG", charset="UTF-8"'
  });
  response.end(JSON.stringify({ error: "Unauthorized" }, null, 2));
}

function empty(response, statusCode, headers = {}) {
  response.writeHead(statusCode, headers);
  response.end();
}

function parseCookies(header = "") {
  const cookies = {};

  for (const part of String(header).split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    cookies[key] = value;
  }

  return cookies;
}

function buildSessionToken(username, password) {
  return Buffer.from(`${username}:${password}`, "utf8").toString("base64url");
}

function buildSessionCookie(config) {
  const token = buildSessionToken(config.basicAuthUser, config.basicAuthPassword);
  return `ragit_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function authHeaders(config, authState) {
  if (authState?.via === "basic") {
    return {
      "Set-Cookie": buildSessionCookie(config)
    };
  }

  return {};
}

function getAuthorizationState(request, config) {
  if (!config.basicAuthUser || !config.basicAuthPassword) {
    return { ok: true, via: "disabled" };
  }

  const cookies = parseCookies(request.headers.cookie ?? "");
  if (cookies.ragit_auth) {
    const expectedToken = buildSessionToken(config.basicAuthUser, config.basicAuthPassword);
    if (cookies.ragit_auth === expectedToken) {
      return { ok: true, via: "cookie" };
    }
  }

  const header = request.headers.authorization ?? "";
  if (!header.startsWith("Basic ")) {
    return { ok: false };
  }

  let decoded = "";

  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return { ok: false };
  }

  const separator = decoded.indexOf(":");
  if (separator === -1) {
    return { ok: false };
  }

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  return username === config.basicAuthUser && password === config.basicAuthPassword
    ? { ok: true, via: "basic" }
    : { ok: false };
}

async function getReadiness(config, fileIndex) {
  const authEnabled = Boolean(config.basicAuthUser && config.basicAuthPassword);

  if (config.searchBackend === "file") {
    const index = fileIndex ?? await loadOptionalSearchIndex();
    if (!index) {
      throw new Error("Local search index is missing for file-backed mode.");
    }
    return {
      ok: true,
      mode: "file",
      authEnabled,
      documents: new Set(index.map((row) => row.documentId)).size,
      chunks: index.length
    };
  }

  const pool = createPool(config);
  try {
    await testConnection(pool);
    return {
      ok: true,
      mode: "postgres",
      authEnabled
    };
  } catch (error) {
    if (config.searchBackend !== "auto") {
      throw error;
    }

    const index = fileIndex ?? await loadOptionalSearchIndex();
    if (!index) {
      throw error;
    }
    return {
      ok: true,
      mode: "file-fallback",
      authEnabled,
      documents: new Set(index.map((row) => row.documentId)).size,
      chunks: index.length,
      warning: error instanceof Error ? error.message : String(error)
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

async function getMetadata(config, fileIndex) {
  if (fileIndex) {
    return collectMetadata(fileIndex);
  }

  if (config.searchBackend === "file") {
    return collectMetadata([]);
  }

  const pool = createPool(config);
  try {
    await testConnection(pool);
    return await fetchDatabaseMetadata(pool);
  } catch (error) {
    if (config.searchBackend !== "auto") {
      throw error;
    }

    if (fileIndex) {
      return collectMetadata(fileIndex);
    }

    throw error;
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  const config = await loadConfig();
  const fileIndex = config.searchBackend === "file"
    ? await loadOptionalSearchIndex()
    : await loadOptionalSearchIndex();

  function parseFilters(searchParams) {
    return {
      year: searchParams.get("year")?.trim() || null,
      ministry: searchParams.get("ministry")?.trim() || null,
      topic: searchParams.get("topic")?.trim() || null
    };
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const isHead = request.method === "HEAD";
      const isGet = request.method === "GET";
      const authorizationState = getAuthorizationState(request, config);

      if ((isGet || isHead) && url.pathname === "/health") {
        if (isHead) {
          return empty(response, 200, {
            "Content-Type": "application/json; charset=utf-8"
          });
        }
        return json(response, 200, {
          ok: true,
          searchBackend: config.searchBackend,
          documents: fileIndex ? new Set(fileIndex.map((row) => row.documentId)).size : null,
          chunks: fileIndex ? fileIndex.length : null
        }, authHeaders(config, authorizationState));
      }

      if ((isGet || isHead) && url.pathname === "/ready") {
        const readiness = await getReadiness(config, fileIndex);
        if (isHead) {
          return empty(response, 200, {
            "Content-Type": "application/json; charset=utf-8"
          });
        }
        return json(response, 200, readiness, authHeaders(config, authorizationState));
      }

      if ((isGet || isHead) && url.pathname === "/") {
        if (!authorizationState.ok) {
          return unauthorized(response);
        }

        if (isHead) {
          return empty(response, 200, {
            "Content-Type": "text/html; charset=utf-8",
            ...authHeaders(config, authorizationState)
          });
        }
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          ...authHeaders(config, authorizationState)
        });
        response.end(renderWebUi());
        return;
      }

      if ((isGet || isHead) && url.pathname === "/metadata") {
        const metadata = await getMetadata(config, fileIndex);
        if (isHead) {
          return empty(response, 200, {
            "Content-Type": "application/json; charset=utf-8",
            ...authHeaders(config, authorizationState)
          });
        }
        return json(response, 200, metadata, authHeaders(config, authorizationState));
      }

      if ((isGet || isHead) && url.pathname === "/search") {
        const question = url.searchParams.get("q")?.trim() ?? "";
        const limit = Number(url.searchParams.get("limit") ?? "5");
        const filters = parseFilters(url.searchParams);

        if (!question) {
          return json(response, 400, { error: "Missing q parameter" });
        }

        const result = fileIndex
          ? {
              backend: "file",
              hits: await searchIndex(fileIndex, question, config, { limit, filters })
            }
          : await searchWithBackend(question, config, { limit, filters });
        if (isHead) {
          return empty(response, 200, {
            "Content-Type": "application/json; charset=utf-8",
            ...authHeaders(config, authorizationState)
          });
        }
        return json(response, 200, {
          question,
          backend: result.backend,
          filters,
          hits: result.hits.map(presentHit)
        }, authHeaders(config, authorizationState));
      }

      if (request.method === "POST" && url.pathname === "/ask") {
        const body = await new Promise((resolve, reject) => {
          let data = "";
          request.on("data", (chunk) => {
            data += chunk;
          });
          request.on("end", () => resolve(data));
          request.on("error", reject);
        });

        const payload = body ? JSON.parse(body) : {};
        const question = String(payload.question ?? "").trim();
        const limit = Number(payload.limit ?? 5);
        const filters = {
          year: payload.filters?.year ? String(payload.filters.year).trim() : null,
          ministry: payload.filters?.ministry ? String(payload.filters.ministry).trim() : null,
          topic: payload.filters?.topic ? String(payload.filters.topic).trim() : null
        };

        if (!question) {
          return json(response, 400, { error: "Missing question" });
        }

        const result = fileIndex
          ? {
              backend: "file",
              hits: await searchIndex(fileIndex, question, config, { limit, filters })
            }
          : await searchWithBackend(question, config, { limit, filters });
        const answer = await generateAnswer(question, result.hits, config);
        return json(response, 200, {
          question,
          backend: result.backend,
          filters,
          answer,
          hits: result.hits.map(presentHit)
        }, authHeaders(config, authorizationState));
      }

      if (!authorizationState.ok) {
        return unauthorized(response);
      }

      return json(response, 404, { error: "Not found" });
    } catch (error) {
      return json(response, 500, serializeError(error));
    }
  });

  server.listen(config.port, () => {
    console.log(`server listening on http://localhost:${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
