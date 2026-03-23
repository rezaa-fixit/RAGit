function repairMojibake(value) {
  if (!/[ÃÂâ€™€]/.test(value)) {
    return value;
  }

  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

function normalizeWhitespace(value) {
  return repairMojibake(String(value ?? ""))
    .replace(/\u00ad/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeParagraphText(value) {
  return normalizeWhitespace(value)
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([’"])/g, "$1")
    .replace(/([“"]) +/g, "$1")
    .replace(/\n{3,}/g, "\n\n");
}

function isBoilerplateParagraph(text) {
  return (
    !text ||
    /^folketingets ombudsmands logo$/i.test(text) ||
    /^udtalelse ombudsmandens$/i.test(text) ||
    /^i det folgende gengives ombudsmandens udtalelse om sagen:?$/i.test(text) ||
    /^gammeltorv 22\b/i.test(text) ||
    /^kontakt\b/i.test(text) ||
    /^tilgaengelighedserklaering$/i.test(text) ||
    /^cookies$/i.test(text) ||
    /^abonner pa vores nyheder$/i.test(text) ||
    /^side \d+(\s*\|\s*\d+)?$/i.test(text)
  );
}

function isHeading(text) {
  if (!text) {
    return false;
  }

  const compact = text.replace(/\n+/g, " ").trim();
  const lineCount = text.split("\n").filter(Boolean).length;

  return (
    /^(resume|resume|resumé|indhold|indledning|retsgrundlag|bilag)\b/i.test(compact) ||
    (/^\d+(\.\d+)*\.?\s+\S/.test(compact) && compact.length <= 140 && lineCount <= 3) ||
    (/^[A-ZÆØÅ0-9][^.!?]{0,110}$/.test(compact) && compact.split(" ").length <= 12)
  );
}

function isAppendixMarker(text) {
  return /^bilag(\s+\d+)?$/i.test(text);
}

function deriveSectionTitle(text) {
  const normalized = normalizeParagraphText(text);
  if (!normalized) {
    return null;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const numberedHeadingLines = lines
    .filter((line) => /^\d+(\.\d+)*\.?\s+\S/.test(line))
    .slice(0, 2);
  const headingLines = lines.filter((line) => isHeading(line)).slice(0, 3);
  let sourceLines = [];

  if (numberedHeadingLines.length > 0) {
    sourceLines = numberedHeadingLines;
  } else if (headingLines.length > 0) {
    sourceLines = headingLines;
  }

  if (sourceLines.length === 0) {
    return null;
  }

  const title = sourceLines.join("\n").trim();

  return title.length <= 180 ? title : `${title.slice(0, 177).trim()}...`;
}

function splitIntoParagraphs(text) {
  return normalizeWhitespace(text)
    .split(/\n{2,}/)
    .map((part) => normalizeParagraphText(part))
    .filter(Boolean)
    .filter((part) => !isBoilerplateParagraph(part));
}

function splitLongText(text, maxChars) {
  const normalized = normalizeParagraphText(text);
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const parts = [];
  const sentences = normalized.split(/(?<=[.!?])\s+/);
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      parts.push(current);
      current = "";
    }

    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }

    let start = 0;
    while (start < sentence.length) {
      parts.push(sentence.slice(start, start + maxChars).trim());
      start += maxChars;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts.filter(Boolean);
}

function pageParagraphsFromDocument(document) {
  if (!Array.isArray(document.pdfPages) || document.pdfPages.length === 0) {
    return splitIntoParagraphs(document.summary ?? "").map((text) => ({
      text,
      pageNumber: null
    }));
  }

  const paragraphs = [];
  let inAppendix = false;

  for (const page of document.pdfPages) {
    const pageParagraphs = splitIntoParagraphs(page.text ?? "");

    for (const text of pageParagraphs) {
      if (isAppendixMarker(text)) {
        inAppendix = true;
      }

      if (inAppendix) {
        continue;
      }

      for (const piece of splitLongText(text, 900)) {
        paragraphs.push({
          text: piece,
          pageNumber: page.pageNumber
        });
      }
    }
  }

  return paragraphs;
}

function chunkParagraphObjects(paragraphs, options = {}) {
  const maxChars = options.maxChars ?? 1400;
  const overlapChars = options.overlapChars ?? 250;
  const chunks = [];

  let current = [];
  let currentLength = 0;
  let currentSection = null;

  function flushChunk() {
    if (current.length === 0) {
      return;
    }

    const text = current.map((item) => item.text).join("\n\n");
    const derivedSectionTitle = deriveSectionTitle(text) ?? currentSection;
    chunks.push({
      chunkIndex: chunks.length,
      text: normalizeParagraphText(text),
      pageStart: current[0].pageNumber ?? null,
      pageEnd: current[current.length - 1].pageNumber ?? null,
      sectionTitle: derivedSectionTitle
    });
  }

  for (const paragraph of paragraphs) {
    const heading = isHeading(paragraph.text);
    const nextSection = heading ? deriveSectionTitle(paragraph.text) : currentSection;

    if (
      currentLength > 0 &&
      (
        currentLength + paragraph.text.length + 2 > maxChars ||
        (heading && currentLength >= Math.floor(maxChars * 0.45))
      )
    ) {
      flushChunk();

      const overlap = [];
      let overlapLength = 0;

      for (let index = current.length - 1; index >= 0; index -= 1) {
        const item = current[index];
        if (isHeading(item.text)) {
          break;
        }

        overlap.unshift(item);
        overlapLength += item.text.length;

        if (overlapLength >= overlapChars) {
          break;
        }
      }

      current = overlap;
      currentLength = current.reduce((sum, item) => sum + item.text.length, 0);
    }

    if (heading) {
      currentSection = deriveSectionTitle(paragraph.text);
    }

    current.push(paragraph);
    currentLength += paragraph.text.length;
    currentSection = nextSection;
  }

  flushChunk();
  return chunks;
}

export function buildChunksFromSummary(summary, options = {}) {
  const paragraphs = splitIntoParagraphs(summary).flatMap((text) =>
    splitLongText(text, 900).map((piece) => ({
      text: piece,
      pageNumber: null
    }))
  );

  return chunkParagraphObjects(paragraphs, options);
}

export function buildChunksFromDocument(document, options = {}) {
  return chunkParagraphObjects(pageParagraphsFromDocument(document), options);
}
