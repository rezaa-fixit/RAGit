export async function generateAnswer(question, hits, config) {
  if (!config.openAiApiKey) {
    return buildFallbackAnswer(question, hits);
  }

  const context = hits
    .map(
      (rawHit, index) => {
        const hit = normalizeHit(rawHit);
        return [
        `[Kilde ${index + 1}]`,
        `Titel: ${hit.title}`,
        `FOB: ${hit.documentId}`,
        `Dato: ${hit.date ?? "ukendt"}`,
        `Ministerium: ${hit.ministry ?? "ukendt"}`,
        `Reference: ${hit.referenceLabel ?? "ukendt"}`,
        `HTML: ${hit.htmlUrl}`,
        `PDF: ${hit.pdfUrl ?? ""}`,
        `Uddrag: ${hit.text}`
        ].join("\n");
      }
    )
    .join("\n\n");

  try {
    const response = await fetch(`${config.openAiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.chatModel,
        messages: [
          {
            role: "system",
            content:
              "Du er en juridisk RAG-assistent. Svar pa dansk og kun ud fra de givne kilder. Start med en kort konklusion, forklar derefter hovedpunkterne i et klart sprog, og afslut med et kort afsnit om eventuelle forbehold. Hvis kilderne ikke er nok, sig det tydeligt. Medtag altid kildehenvisninger som [Kilde 1], [Kilde 2] osv. Prioriter de mest direkte juridiske udsagn, brug helst flere forskellige afgorelser hvis kilderne peger i samme retning, og undga at bygge svaret pa gentagelser af samme pointe."
          },
          {
            role: "user",
            content: `Sporgsmal: ${question}\n\nKilder:\n${context}`
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Chat completion failed: ${response.status} ${message}`);
    }

    const payload = await response.json();
    return payload.choices?.[0]?.message?.content?.trim() ?? buildFallbackAnswer(question, hits);
  } catch (error) {
    console.error("Falling back from chat completion:", error);
    return buildFallbackAnswer(question, hits);
  }
}

function buildFallbackAnswer(question, hits) {
  if (hits.length === 0) {
    return `Jeg fandt ingen relevante kilder til sporgsmalet: "${question}".`;
  }

  const intro =
    `Jeg har ikke en aktiv chat-model konfigureret, sa her er de mest relevante ` +
    `kilder til sporgsmalet: "${question}".`;
  const bullets = hits
    .slice(0, 3)
    .map(
      (rawHit, index) => {
        const hit = normalizeHit(rawHit);
        const suffix = hit.referenceLabel ? ` [${hit.referenceLabel}]` : "";
        return `[Kilde ${index + 1}] ${hit.title} (${hit.date ?? "ukendt dato"})${suffix} - ` +
        `${hit.text.slice(0, 320).trim()}`
      }
    )
    .join("\n");

  return `${intro}\n\n${bullets}`;
}

function normalizeHit(hit) {
  const pageLabel = hit.pageLabel ?? formatPageLabel(hit.pageStart, hit.pageEnd);
  const sectionTitle = isUsefulSectionTitle(hit.sectionTitle) ? hit.sectionTitle : null;
  const referenceLabel = [sectionTitle, pageLabel].filter(Boolean).join(" | ") || null;

  return {
    ...hit,
    pageLabel,
    sectionTitle,
    referenceLabel
  };
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

function isUsefulSectionTitle(sectionTitle) {
  if (!sectionTitle) {
    return false;
  }

  const raw = String(sectionTitle).trim();
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 72) {
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
