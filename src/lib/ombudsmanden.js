const BASE_URL = "https://www.ombudsmanden.dk";
const LIST_URL = `${BASE_URL}/find-viden/udtalelser`;
import { extractPdfTextFromUrl } from "./pdf.js";

function absoluteUrl(url) {
  return new URL(decodeHtml(url), BASE_URL).toString();
}

function repairMojibake(value) {
  if (!/[ÃÂ]/.test(value)) {
    return value;
  }

  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

function stripTags(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ");
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&shy;/g, "")
    .replace(/&oslash;/g, "\u00f8")
    .replace(/&Oslash;/g, "\u00d8")
    .replace(/&aring;/g, "\u00e5")
    .replace(/&Aring;/g, "\u00c5")
    .replace(/&aelig;/g, "\u00e6")
    .replace(/&AElig;/g, "\u00c6")
    .replace(/&ndash;/g, "-")
    .replace(/&#(\d+);/g, (_, codePoint) =>
      String.fromCodePoint(Number(codePoint))
    );
}

function cleanText(value) {
  return repairMojibake(
    decodeHtml(stripTags(value)).replace(/\s+/g, " ").trim()
  );
}

function htmlToPlainText(html) {
  return repairMojibake(
    decodeHtml(
      html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h1|\/h2|\/h3|\/h4|\/h5|\/h6)\b[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    )
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
  );
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "ombudsmanden-rag-mvp/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  const bytes = await response.arrayBuffer();
  return new TextDecoder("utf-8").decode(bytes);
}

function matchAllValues(pattern, value) {
  return [...value.matchAll(pattern)];
}

function extractYearLinks(html) {
  const matches = matchAllValues(
    /href="(\/find-viden\/udtalelser\/(19|20)\d{2})"/gi,
    html
  );

  const unique = new Map();
  for (const match of matches) {
    unique.set(match[1], {
      year: match[1].split("/").at(-1),
      url: absoluteUrl(match[1])
    });
  }

  return [...unique.values()].sort((a, b) => Number(b.year) - Number(a.year));
}

function extractCaseLinks(html) {
  const matches = matchAllValues(
    /href="(\/find-viden\/udtalelser\/(\d{4})\/(\d{4}-\d+))"/gi,
    html
  );

  const unique = new Map();
  for (const match of matches) {
    unique.set(match[1], {
      year: match[2],
      fobId: match[3],
      url: absoluteUrl(match[1])
    });
  }

  return [...unique.values()];
}

function extractCaseNumbers(text) {
  const match = text.match(/\(Sag nr\.\s*([^)]+)\)/i);
  if (!match) {
    return [];
  }

  return match[1]
    .split(/,|\bog\b/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isUsableHref(href) {
  if (!href) {
    return false;
  }

  const normalized = href.trim().toLowerCase();
  return !(
    normalized === "#" ||
    normalized === "https://#" ||
    normalized.startsWith("javascript:")
  );
}

function extractLinkByLabel(html, label, hrefPattern = null) {
  const anchors = matchAllValues(
    /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    html
  );

  for (const match of anchors) {
    const href = match[1];
    const text = cleanText(match[2]);
    if (!isUsableHref(href)) {
      continue;
    }

    if (text.includes(label) && (!hrefPattern || hrefPattern.test(decodeHtml(href)))) {
      return absoluteUrl(href);
    }
  }

  return null;
}

function extractTitle(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? cleanText(match[1]) : "";
}

function extractDate(html) {
  const match = html.match(/\b(\d{2}-\d{2}-\d{4})\b/);
  return match ? match[1] : "";
}

function extractFobId(html, fallback) {
  const match = html.match(/\bFOB\s+(\d{4}-\d+)\b/i);
  return match ? match[1] : fallback;
}

function extractStructuredContent(html, title, date, fobId) {
  const plainText = htmlToPlainText(html);
  const lines = plainText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const titleIndex = lines.findIndex((line) => line === title);
  const dateIndex = lines.findIndex(
    (line, index) => index > titleIndex && line === date
  );
  const caseNumberIndex = lines.findIndex((line) => /\(Sag nr\./i.test(line));
  const linksIndex = lines.findIndex((line) =>
    /Retsinformation\s*&\s*PDF/i.test(line)
  );

  const tagsLine =
    dateIndex >= 0 && dateIndex + 1 < lines.length ? lines[dateIndex + 1] : "";

  const summaryStartIndex = tagsLine ? dateIndex + 2 : dateIndex + 1;
  const summaryEndIndex =
    linksIndex >= 0
      ? linksIndex
      : caseNumberIndex >= 0
        ? caseNumberIndex + 1
        : lines.length;

  const summaryLines = lines.slice(summaryStartIndex, summaryEndIndex);
  const extractedTopics = [];

  while (summaryLines.length > 0) {
    const candidate = summaryLines[0];
    const looksLikeNarrative =
      candidate.startsWith("Ombudsmanden ") ||
      candidate.startsWith("Jeg ") ||
      candidate.startsWith("Det ") ||
      candidate.startsWith("En myndighed ") ||
      candidate.startsWith("(Sag nr.");

    if (looksLikeNarrative) {
      break;
    }

    if (candidate.length <= 120) {
      extractedTopics.push(candidate);
      summaryLines.shift();
      continue;
    }

    break;
  }

  const summary = summaryLines.join("\n\n").trim();
  const rawTags = tagsLine
    .split(/\s{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item !== fobId);

  return {
    rawTags: [...rawTags, ...extractedTopics],
    summary
  };
}

function splitTags(tags) {
  return {
    ministry: tags[0] ?? null,
    topics: tags.slice(1)
  };
}

export async function fetchAvailableYears() {
  const html = await fetchText(LIST_URL);
  return extractYearLinks(html);
}

export async function fetchCaseIndex(year) {
  const html = await fetchText(`${LIST_URL}/${year}`);
  return extractCaseLinks(html);
}

export async function fetchCaseDocument(caseUrl, fallbackId = null) {
  const html = await fetchText(caseUrl);
  const title = extractTitle(html);
  const date = extractDate(html);
  const fobId = extractFobId(html, fallbackId);
  const structuredContent = extractStructuredContent(html, title, date, fobId);
  const { ministry, topics } = splitTags(structuredContent.rawTags);
  const summary = structuredContent.summary;
  const pdfUrl = extractLinkByLabel(html, "Hent hele teksten som PDF", /\.pdf/i);
  const pdfContent = await extractPdfTextFromUrl(pdfUrl);

  return {
    source: "folketingets-ombudsmand",
    htmlUrl: caseUrl,
    fetchedAt: new Date().toISOString(),
    fobId,
    title,
    date,
    ministry,
    topics,
    caseNumbers: extractCaseNumbers(summary),
    pdfUrl,
    retsinformationUrl: extractLinkByLabel(
      html,
      "Retsinformation",
      /retsinformation\.dk/i
    ),
    summary,
    pdfPageCount: pdfContent.pageCount,
    pdfPages: pdfContent.pages,
    pdfText: pdfContent.text
  };
}
