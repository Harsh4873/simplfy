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

const TEXT_EXT = [".txt", ".md", ".csv", ".tsv", ".json", ".xml", ".html", ".tex", ".r", ".py", ".tsv"];

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
  const pdfjs = await import("pdfjs-dist");
  const worker = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.toString();
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  const limit = Math.min(doc.numPages, 40);
  for (let i = 1; i <= limit; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) pages.push(line);
  }
  const text = pages.join("\n\n");
  const parseNote =
    doc.numPages > limit
      ? `Extracted text from the first ${limit} of ${doc.numPages} pages.`
      : text
        ? `Extracted text from ${doc.numPages} page${doc.numPages === 1 ? "" : "s"}.`
        : "PDF stored, but no extractable text layer was found.";
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
    const text = await file.text();
    return { text, parseNote: "Stored as searchable text." };
  }
  return {
    text: "",
    parseNote: "Binary file stored as a blob. Filename is searchable; contents were not parsed.",
  };
}

export const MAX_FILE_BYTES = 12 * 1024 * 1024;
