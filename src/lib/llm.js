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
              "Du er en juridisk RAG-assistent. Svar på dansk og kun ud fra de givne kilder. Brug denne faste struktur og disse overskrifter præcist: 'Kort svar', 'Det vigtigste', 'Kilder' og 'Forbehold'. Under 'Det vigtigste' skal du bruge 3-5 korte punktlinjer. Under 'Kilder' skal du nævne de mest centrale kilder med [Kilde 1], [Kilde 2] osv. Hvis kilderne ikke er tilstrækkelige, skal du skrive det tydeligt under 'Forbehold'. Skriv i rent tekstformat uden markdown-syntaks som ## eller **. Prioriter de mest direkte juridiske udsagn, brug helst flere forskellige afgørelser hvis kilderne peger i samme retning, og undgå gentagelser."
          },
          {
            role: "user",
            content: `Spørgsmål: ${question}\n\nKilder:\n${context}`
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
    return [
      "Kort svar",
      `Jeg fandt ikke tilstrækkelige kilder til at besvare spørgsmålet: "${question}".`,
      "",
      "Det vigtigste",
      "- Der blev ikke fundet relevante afgørelser i det aktuelle udsnit af databasen.",
      "- Prøv at omformulere spørgsmålet eller fjerne filtre.",
      "",
      "Kilder",
      "- Ingen relevante kilder fundet.",
      "",
      "Forbehold",
      "- Svaret bygger på de aktuelle søgeresultater og kan ændre sig, hvis flere kilder kommer med."
    ].join("\n");
  }

  const bullets = hits
    .slice(0, 3)
    .map(
      (rawHit, index) => {
        const hit = normalizeHit(rawHit);
        const suffix = hit.referenceLabel ? ` [${hit.referenceLabel}]` : "";
        return `- [Kilde ${index + 1}] ${hit.title} (${hit.date ?? "ukendt dato"})${suffix}`
      }
    )
    .join("\n");

  const highlights = hits
    .slice(0, 3)
    .map((rawHit, index) => {
      const hit = normalizeHit(rawHit);
      return `- [Kilde ${index + 1}] ${hit.text.slice(0, 220).trim()}`;
    })
    .join("\n");

  return [
    "Kort svar",
    `Her er et foreløbigt svar på spørgsmålet "${question}" baseret på de mest relevante fundne kilder.`,
    "",
    "Det vigtigste",
    highlights,
    "",
    "Kilder",
    bullets,
    "",
    "Forbehold",
    "- Svaret er genereret i fallback-tilstand og bør læses sammen med de viste kilder."
  ].join("\n");
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
