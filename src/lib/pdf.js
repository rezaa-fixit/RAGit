import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

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

function normalizeLine(value) {
  return normalizeWhitespace(value)
    .replace(/^[-–•·]+\s*/, "")
    .replace(/^ï‚·\s*/i, "")
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/([([{])\s+/g, "$1");
}

function sortItems(items) {
  return [...items].sort((left, right) => {
    const leftY = left.transform?.[5] ?? 0;
    const rightY = right.transform?.[5] ?? 0;

    if (Math.abs(leftY - rightY) > 2) {
      return rightY - leftY;
    }

    const leftX = left.transform?.[4] ?? 0;
    const rightX = right.transform?.[4] ?? 0;
    return leftX - rightX;
  });
}

function groupIntoLines(items) {
  const lines = [];

  for (const item of sortItems(items)) {
    const text = normalizeLine(item.str ?? "");
    if (!text) {
      continue;
    }

    const y = item.transform?.[5] ?? 0;
    const lastLine = lines.at(-1);

    if (!lastLine || Math.abs(lastLine.y - y) > 2) {
      lines.push({ y, parts: [text] });
      continue;
    }

    lastLine.parts.push(text);
  }

  return lines.map((line) =>
    normalizeLine(line.parts.join(" "))
  );
}

function isBoilerplateLine(line, pageNumber) {
  return (
    !line ||
    /^side \d+(\s*\|\s*\d+)?$/i.test(line) ||
    line === `Side ${pageNumber}` ||
    /^ombudsmandens udtalelse$/i.test(line) ||
    /^folketingets ombudsmands logo$/i.test(line) ||
    /^fob \d{4}-\d+$/i.test(line) ||
    /^\d+(\.\d+)*$/.test(line) ||
    /^(forvaltningsret|skat|myndighedsguiden|international ret|statsministeriet)$/i.test(line) ||
    /^gammeltorv 22\b/i.test(line) ||
    /^telefon \+45/i.test(line) ||
    /^post@ombudsmanden\.dk$/i.test(line) ||
    /^(links|kontakt|tilgaengelighedserklaering|guide til oplaesning af tekst|cookies)$/i.test(line) ||
    /^\d{2,6}\.\d$/.test(line)
  );
}

function isHeadingLike(line) {
  return (
    /^(\d+(\.\d+)*\.?\s+\S+|Bilag|Resume|Resumé|Indhold|Indledning)$/i.test(line) ||
    (line.length <= 90 && /^[A-ZÆØÅ0-9]/.test(line) && !/[.!?]$/.test(line))
  );
}

function shouldJoinWithoutSpace(left, right) {
  return /[-/]$/.test(left) || /^[,.;:!?)]/.test(right);
}

function cleanPdfPageText(text, pageNumber) {
  const lines = text
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter(Boolean)
    .filter((line) => !isBoilerplateLine(line, pageNumber))
    .filter((line) => !/^bilag$/i.test(line))
    .filter((line) => !/^ï‚·$/i.test(line));

  const paragraphs = [];
  let current = "";

  for (const line of lines) {
    if (isHeadingLike(line)) {
      if (current) {
        paragraphs.push(current.trim());
        current = "";
      }
      paragraphs.push(line);
      continue;
    }

    if (!current) {
      current = line;
      continue;
    }

    if (/-$/.test(current)) {
      current = `${current.slice(0, -1)}${line}`;
    } else if (shouldJoinWithoutSpace(current, line)) {
      current = `${current}${line}`;
    } else {
      current = `${current} ${line}`;
    }
  }

  if (current) {
    paragraphs.push(current.trim());
  }

  return paragraphs
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean)
    .join("\n\n");
}

export async function extractPdfTextFromUrl(pdfUrl) {
  if (!pdfUrl) {
    return {
      pageCount: 0,
      pages: [],
      text: ""
    };
  }

  const response = await fetch(pdfUrl, {
    headers: {
      "user-agent": "ombudsmanden-rag-mvp/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${pdfUrl}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const standardFontDataUrl = `${pathToFileURL(
    path.resolve(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts")
  ).href}/`;
  const loadingTask = getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    standardFontDataUrl
  });

  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = groupIntoLines(content.items);
    const text = cleanPdfPageText(lines.join("\n"), pageNumber);

    if (text) {
      pages.push({
        pageNumber,
        text
      });
    }
  }

  return {
    pageCount: pdf.numPages,
    pages,
    text: normalizeWhitespace(pages.map((page) => page.text).join("\n\n"))
  };
}
