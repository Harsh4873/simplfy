import { looksLikePaperText, paperToMarkdown } from "./paperText";

async function loadPdfjs() {
  if (typeof DOMMatrix === "undefined") {
    return import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return import("pdfjs-dist");
}

const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/tab-separated-values",
  "application/json",
  "application/xml",
  "text/xml",
  "text/html",
]);

const TEXT_EXT = [
  ".txt",
  ".md",
  ".csv",
  ".tsv",
  ".json",
  ".xml",
  ".html",
  ".tex",
  ".r",
  ".py",
  ".ipynb",
  ".rmd",
  ".qmd",
  ".rst",
  ".org",
];

const MIME_BY_EXT: Record<string, string> = {
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".json": "application/json",
  ".xml": "application/xml",
  ".html": "text/html",
  ".tex": "text/plain",
  ".r": "text/plain",
  ".py": "text/plain",
  ".pdf": "application/pdf",
};

export function mimeForDroppedFile(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "text/markdown";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (file.type) return file.type;
  const ext = Object.keys(MIME_BY_EXT).find((item) => name.endsWith(item));
  if (ext) return MIME_BY_EXT[ext];
  return "application/octet-stream";
}

export function linesFromPdfItems(items: unknown[]): string[] {
  const rows = new Map<number, { x: number; str: string }[]>();
  let hasGeom = false;
  const loose: string[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { str?: string; transform?: number[]; hasEOL?: boolean };
    const str = item.str ?? "";
    if (!str) continue;
    if (Array.isArray(item.transform) && item.transform.length >= 6) {
      hasGeom = true;
      const x = item.transform[4] ?? 0;
      const y = item.transform[5] ?? 0;
      const key = Math.round(y / 3) * 3;
      const list = rows.get(key) ?? [];
      list.push({ x, str });
      rows.set(key, list);
    } else {
      loose.push(str);
    }
  }
  if (!hasGeom) {
    const blob = loose.join(" ").replace(/\s+/g, " ").trim();
    return blob ? [blob] : [];
  }
  return [...rows.keys()]
    .sort((a, b) => b - a)
    .map((key) =>
      (rows.get(key) ?? [])
        .sort((a, b) => a.x - b.x)
        .map((part) => part.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

export type ParsedFile = {
  text: string;
  parseNote?: string;
};

function isTextFile(file: File): boolean {
  if (TEXT_TYPES.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return TEXT_EXT.some((ext) => name.endsWith(ext));
}

async function extractPdf(file: File): Promise<ParsedFile> {
  const pdfjs = await loadPdfjs();
  const worker =
    typeof DOMMatrix === "undefined"
      ? new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url)
      : new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.toString();
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  const limit = Math.min(doc.numPages, 40);
  for (let i = 1; i <= limit; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = linesFromPdfItems(content.items).join("\n").trim();
    if (pageText) pages.push(pageText);
  }
  const raw = pages.join("\n\n");
  const text = raw ? paperToMarkdown(raw) : "";
  const parseNote =
    doc.numPages > limit
      ? `Extracted text from the first ${limit} of ${doc.numPages} pages and cut a study deck from the sections.`
      : text
        ? `Extracted text from ${doc.numPages} page${doc.numPages === 1 ? "" : "s"} and cut a study deck from the sections.`
        : "PDF stored, but no extractable text layer was found. Image-only scans cannot become flip cards.";
  return { text, parseNote };
}

export async function parseDroppedFile(file: File): Promise<ParsedFile> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      return await extractPdf(file);
    } catch (error) {
      return {
        text: "",
        parseNote: `PDF stored without text (${error instanceof Error ? error.message : "parse failed"}).`,
      };
    }
  }
  if (isTextFile(file)) {
    const raw = await file.text();
    const markdown = mimeForDroppedFile(file) === "text/markdown";
    const asPaper = !/^#{1,3}\s+/m.test(raw.trim()) && looksLikePaperText(raw);
    const text = asPaper ? paperToMarkdown(raw) : raw;
    return {
      text,
      parseNote: asPaper
        ? "Academic paper text cut into sections for a study deck."
        : markdown
          ? "Markdown stored as original text. The studio composes a lab brief on file."
          : "Stored as searchable text.",
    };
  }
  return {
    text: "",
    parseNote: "Binary file stored as a blob. Filename is searchable; contents were not parsed.",
  };
}

export const MAX_FILE_BYTES = 12 * 1024 * 1024;
