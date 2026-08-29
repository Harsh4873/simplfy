const PAPER_SECTIONS = [
  "abstract",
  "introduction",
  "background",
  "related work",
  "related works",
  "methods",
  "method",
  "materials and methods",
  "materials",
  "results",
  "results and discussion",
  "discussion",
  "conclusion",
  "conclusions",
  "limitations",
  "future work",
  "acknowledgments",
  "acknowledgements",
  "references",
  "bibliography",
  "supplementary",
  "supplementary materials",
  "appendix",
];

const SKIP_TITLE =
  /^(arxiv|biorxiv|medrxiv|doi:|https?:|www\.|volume|vol\.|pp\.|page\s+\d|©|copyright|received|accepted|published|issn|isbn)/i;

function tidy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sectionKey(value: string): string {
  return tidy(value)
    .toLowerCase()
    .replace(/[:.]+$/, "");
}

export function looksLikePaperText(text: string): boolean {
  const slice = text.slice(0, 14000);
  const hasAbstract = /(^|\n)\s*abstract\b/i.test(slice) || /\babstract\b/i.test(slice.slice(0, 2800));
  const hasIntro =
    /(^|\n)\s*(?:\d+(?:\.\d+)*\.?\s*)?introduction\b/i.test(slice) ||
    /\b1(?:\.\d+)*\.?\s+introduction\b/i.test(slice);
  return hasAbstract && hasIntro;
}

export function isPdfFile(file: { name: string; type?: string }): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function libraryKindForSource(opts: {
  mime?: string;
  name?: string;
  text: string;
  pasted?: boolean;
}): "file" | "note" | "paper" {
  if (opts.mime === "application/pdf" || opts.name?.toLowerCase().endsWith(".pdf") || looksLikePaperText(opts.text)) {
    return "paper";
  }
  return opts.pasted ? "note" : "file";
}

export function isPaperItem(item: { kind: string; mime?: string; text?: string }): boolean {
  return item.kind === "paper" || item.mime === "application/pdf" || Boolean(item.text && looksLikePaperText(item.text));
}

export function headingOfPaperLine(line: string): string | null {
  const t = tidy(line).replace(/[:.]+$/, "");
  if (t.length < 4 || t.length > 90) return null;
  const numbered = t.match(/^(\d+(?:\.\d+)*)\.?\s+(.+)$/);
  const name = numbered ? numbered[2] ?? "" : t;
  const key = sectionKey(name);
  if (!PAPER_SECTIONS.includes(key)) return null;
  const pretty = name.replace(/\b\w/g, (ch) => ch.toUpperCase());
  return numbered ? `${numbered[1]} ${pretty}` : pretty;
}

function ciToken(name: string): string {
  return name
    .split(" ")
    .map((word) =>
      word
        .split("")
        .map((ch) => (/[a-z]/i.test(ch) ? `[${ch.toUpperCase()}${ch.toLowerCase()}]` : ch))
        .join(""),
    )
    .join("\\s+");
}

const SECTION_CI = PAPER_SECTIONS.map(ciToken).join("|");
const BARE_INLINE_CI = [
  "abstract",
  "introduction",
  "references",
  "bibliography",
  "acknowledgments",
  "acknowledgements",
  "conclusion",
  "conclusions",
]
  .map(ciToken)
  .join("|");

export function explodeInlineSections(text: string): string {
  const numbered = String.raw`\d+(?:\.\d+)*\.?\s+(?:${SECTION_CI})`;
  const re = new RegExp(
    String.raw`(^|\n|(?<=[.!?])\s+)((?:${numbered})|(?:${SECTION_CI}))(?=\s+[A-Z(])|(?<=[a-z])\s+(${BARE_INLINE_CI})(?=\s+[A-Z(])`,
    "gu",
  );
  return text.replace(re, (full, pre: string | undefined, heading: string | undefined, bare: string | undefined) => {
    const label = tidy(heading || bare || "");
    if (!label) return full;
    if (pre !== undefined && heading) {
      const pad = /(?:^|\n)$/.test(pre) ? pre : `${pre.replace(/\s+$/, "")}\n\n`;
      return `${pad}${label}\n\n`;
    }
    return `\n\n${label}\n\n`;
  });
}

function looksLikeAuthorLine(line: string): boolean {
  if (/@/.test(line)) return true;
  const parts = line.split(/,|;|\band\b/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3 && parts.every((part) => part.split(/\s+/).length <= 4)) return true;
  return false;
}

export function titleFromPaperText(text: string, fallback = "Paper"): string {
  const lines = explodeInlineSections(text)
    .split(/\n/)
    .map((line) => tidy(line))
    .filter(Boolean);
  for (const line of lines.slice(0, 16)) {
    const clean = line.replace(/^#+\s+/, "");
    if (clean.length < 8 || clean.length > 140) continue;
    if (SKIP_TITLE.test(clean) || headingOfPaperLine(clean)) continue;
    if (/^\d+$/.test(clean)) continue;
    if (looksLikeAuthorLine(clean)) continue;
    return clean.slice(0, 88);
  }
  const sentence = tidy(text).split(/(?<=[.!?])\s+/)[0] ?? "";
  if (sentence.length >= 8 && sentence.length <= 88) return sentence;
  return fallback;
}

function flushSection(out: string[], heading: string | null, body: string[]) {
  const prose = body.join("\n\n").trim();
  if (!prose) return;
  if (heading) out.push(`## ${heading}`, "", prose, "");
  else out.push(prose, "");
}

export function paperToMarkdown(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/^#{1,3}\s+/m.test(trimmed)) return trimmed;

  const exploded = explodeInlineSections(trimmed);
  const lines = exploded
    .split(/\n/)
    .map((line) => tidy(line))
    .filter(Boolean);
  const title = titleFromPaperText(exploded, "");
  const out: string[] = [];
  if (title) out.push(`# ${title}`, "");

  let heading: string | null = null;
  let body: string[] = [];
  let sawSection = false;

  for (const line of lines) {
    if (title && line === title && !sawSection && body.length === 0 && !heading) continue;
    const next = headingOfPaperLine(line);
    if (next) {
      flushSection(out, heading, body);
      heading = next;
      body = [];
      sawSection = true;
      continue;
    }
    body.push(line);
  }
  flushSection(out, heading, body);

  if (sawSection) return out.join("\n").trim();

  const pages = trimmed.split(/\n{2,}/).map((page) => tidy(page)).filter((page) => page.length >= 40);
  if (pages.length >= 2) {
    const paged: string[] = title ? [`# ${title}`, ""] : [];
    pages.forEach((page, index) => {
      if (title && index === 0 && page.startsWith(title)) {
        const rest = tidy(page.slice(title.length));
        if (rest.length < 40) return;
        paged.push(`## Page ${index + 1}`, "", rest, "");
        return;
      }
      paged.push(`## Page ${index + 1}`, "", page, "");
    });
    return paged.join("\n").trim();
  }

  return out.join("\n").trim() || trimmed;
}
