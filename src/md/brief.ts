import type { NamedHit } from "./types";

const STOP_GENE = new Set([
  "new",
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "they",
  "rank",
  "next",
  "max",
  "both",
  "solid",
  "liquid",
  "joint",
  "every",
  "main",
  "mains",
  "still",
  "there",
  "clean",
  "hole",
  "bars",
  "full",
  "each",
  "test",
  "tests",
  "sheet",
  "again",
  "drop",
  "two",
  "one",
  "now",
  "not",
  "are",
  "was",
  "were",
  "but",
  "those",
  "more",
  "than",
  "from",
  "into",
  "over",
  "weak",
  "as",
  "is",
  "in",
]);

const CONTRAST =
  /\b[A-Za-z][A-Za-z+]*(?:\s*[×x]\s*[A-Za-z][A-Za-z+]*)+\b|\bS\s*[×x]\s*P\b/g;

const RANK_HIT =
  /\b([A-Za-z][A-Za-z0-9_]{1,18})\s+(?:is\s+)?#(\d+)(?:\s*\(\s*2\s*Δ\s*LL\s*([\d.]+)\s*\))?/g;

const DOT_LL = /\b([A-Za-z][A-Za-z0-9_]{1,18})\.\s*2\s*Δ\s*LL\s*([\d.]+)/g;

const BURIED_RANK =
  /ranked as\s+([^.()]+?)\s*\(([A-Za-z][A-Za-z0-9_]{1,18})\s+is still rank\s+(\d+)/i;

const MAX_LL = /max\s*2\s*Δ\s*LL\s*([\d.]+),\s*([^.]+)/i;

const IS_CONTRAST = /\b([A-Za-z][A-Za-z+]*(?:\s*[×x]\s*[A-Za-z][A-Za-z+]*)+)\s+is\s+([A-Za-z][A-Za-z0-9_]{1,18})/;

const P_VALUE = /p\s*≈\s*([\d.]+)/i;

function looksLikeGene(token: string): boolean {
  if (token.length < 3 || token.length > 20) return false;
  if (STOP_GENE.has(token.toLowerCase())) return false;
  if (/^(Monday|There|Every|Liquid|Solid|Joint|Park|Don)/i.test(token)) return false;
  return /[A-Z]/.test(token) || /_/.test(token) || /\d/.test(token) || /^(prp|esx|vap|man|sec|cma|ppe)/i.test(token);
}

export function findContrasts(text: string): string[] {
  const found: string[] = [];
  const re = new RegExp(CONTRAST.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const value = match[0].replace(/\s+/g, " ").replace(/\s*[x]\s*/g, " × ");
    if (!found.some((item) => item.toLowerCase() === value.toLowerCase())) found.push(value);
  }
  return found;
}

function contrastNear(para: string, fallback: string): string {
  const all = findContrasts(para);
  return all[0] ?? fallback;
}

function splitGenes(raw: string): string[] {
  return raw
    .split(/[/,]| and /)
    .map((part) => part.replace(/\bunnamed\b/gi, "").trim())
    .filter((part) => looksLikeGene(part));
}

function directionsFrom(para: string): string | undefined {
  const liquid = para.match(/liquid[^.]*?\b(up|down)\b/i);
  const solid = para.match(/solid[^.]*?\b(up|down)\b/i);
  if (liquid && solid) {
    return `liquid ${liquid[1].toLowerCase()}, solid ${solid[1].toLowerCase()}`;
  }
  const bars = para.match(/bars go\s+\*{0,2}(up|down)\*{0,2}\s+on\s+([^.—]+)/i);
  if (bars) return `${bars[1].toLowerCase()} on ${bars[2].trim()}`;
  return undefined;
}

function upsert(hits: NamedHit[], next: NamedHit) {
  const key = `${next.contrast.toLowerCase()}::${next.gene.toLowerCase()}`;
  const existing = hits.find((hit) => `${hit.contrast.toLowerCase()}::${hit.gene.toLowerCase()}` === key);
  if (!existing) {
    hits.push(next);
    return;
  }
  if (next.ll != null) existing.ll = next.ll;
  if (next.rank != null) existing.rank = next.rank;
  if (next.direction) existing.direction = next.direction;
  if (next.note) existing.note = next.note;
}

export function extractHits(text: string): NamedHit[] {
  const hits: NamedHit[] = [];
  for (const para of text.split(/\n{2,}/)) {
    const named = para.match(IS_CONTRAST);
    const defaultContrast = named?.[1]?.replace(/\s+/g, " ") ?? contrastNear(para, "");
    const defaultGene = named?.[2];
    const direction = directionsFrom(para);
    const p = para.match(P_VALUE);

    for (const match of para.matchAll(new RegExp(RANK_HIT.source, "g"))) {
      const gene = match[1];
      if (!looksLikeGene(gene)) continue;
      upsert(hits, {
        contrast: defaultContrast,
        gene,
        rank: Number(match[2]),
        ll: match[3] ? Number(match[3]) : undefined,
      });
    }

    for (const match of para.matchAll(new RegExp(DOT_LL.source, "g"))) {
      if (!looksLikeGene(match[1])) continue;
      upsert(hits, { contrast: defaultContrast, gene: match[1], ll: Number(match[2]) });
    }

    const buried = para.match(BURIED_RANK);
    if (buried && looksLikeGene(buried[2])) {
      upsert(hits, {
        contrast: buried[1].trim(),
        gene: buried[2],
        rank: Number(buried[3]),
        note: "does not rank as this interaction",
      });
    }

    if (defaultGene && looksLikeGene(defaultGene)) {
      const nearby = para.match(new RegExp(`${defaultGene}[.\\s*]*2\\s*Δ\\s*LL\\s*([\\d.]+)`, "i"));
      if (nearby) upsert(hits, { contrast: defaultContrast, gene: defaultGene, ll: Number(nearby[1]) });
    }

    const nextRank = para.match(/\b([A-Za-z0-9_]+(?:\/[A-Za-z0-9_]+)+)\s+rank next/i);
    if (nextRank) {
      const nextDirection = para.match(/bars go\s+\*{0,2}(up|down)\*{0,2}\s+on\s+([^.—]+)/i);
      for (const gene of splitGenes(nextRank[1])) {
        upsert(hits, {
          contrast: defaultContrast,
          gene,
          note: "rank next",
          direction: nextDirection ? `${nextDirection[1].toLowerCase()} on ${nextDirection[2].trim()}` : undefined,
        });
      }
    }

    const max = para.match(MAX_LL);
    if (max) {
      const contrast = findContrasts(para)[0] ?? defaultContrast;
      for (const gene of splitGenes(max[2])) {
        upsert(hits, { contrast, gene, ll: Number(max[1]), note: "max 2ΔLL" });
      }
    }

    if (p && defaultGene) {
      const row = hits.find((hit) => hit.gene.toLowerCase() === defaultGene.toLowerCase() || hit.gene === "prpC");
      const prpC = hits.find((hit) => hit.gene === "prpC");
      const target = prpC ?? row;
      if (target) target.note = `p ≈ ${p[1]} on the main`;
    }

    if (direction) {
      for (const hit of hits) {
        if (hit.contrast === defaultContrast && hit.gene === defaultGene) hit.direction = direction;
      }
    }
  }

  return hits.sort((a, b) => {
    const c = a.contrast.localeCompare(b.contrast);
    if (c !== 0) return c;
    return (b.ll ?? 0) - (a.ll ?? 0) || (a.rank ?? 9999) - (b.rank ?? 9999) || a.gene.localeCompare(b.gene);
  });
}

const SMALL = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
  "Twenty",
];

export function prettyCount(n: number): string {
  if (n >= 0 && n < SMALL.length) return SMALL[n];
  return String(n);
}

export function tidyHeading(raw: string): string {
  return raw
    .replace(/^(New, and clean:\s*|New:\s*)/i, "")
    .replace(/\*\*/g, "")
    .trim()
    .replace(/[.]+$/, "");
}

export function inventTitle(stripped: string, hits: NamedHit[]): string {
  const count = stripped.match(/(\d+)\s+LRT workbooks/i);
  const operon = stripped.match(/\bis\s+(prpRDC|[a-z]{3}[A-Z]{2,})\b/);
  const ranked = [...hits].filter((hit) => hit.ll != null).sort((a, b) => (b.ll ?? 0) - (a.ll ?? 0));
  const names: string[] = [];
  if (operon) names.push(operon[1]);
  for (const hit of ranked) {
    if (names.some((name) => name.toLowerCase().includes(hit.gene.toLowerCase()) || hit.gene.toLowerCase().includes(name.toLowerCase()))) {
      continue;
    }
    names.push(hit.gene);
    if (names.length >= 2) break;
  }
  if (!operon) {
    for (const hit of hits) {
      if (names.length >= 2) break;
      if (!names.some((name) => name.toLowerCase() === hit.gene.toLowerCase())) names.push(hit.gene);
    }
  }
  if (count && names.length >= 2) return `${prettyCount(Number(count[1]))} LRT workbooks: ${names[0]} and ${names[1]}`;
  if (count && names.length === 1) return `${prettyCount(Number(count[1]))} LRT workbooks: ${names[0]}`;
  if (count) return `${prettyCount(Number(count[1]))} LRT workbooks`;

  const bold = stripped.match(/\*\*([^*]{6,80})\*\*/);
  if (bold) return tidyHeading(bold[1]).slice(0, 72);

  const plain = stripped.replace(/\*\*/g, "").trim();
  const sentence = plain.split(/(?<=[.!?])\s+/)[0] ?? "Field note";
  const title = tidyHeading(sentence);
  return title.length > 72 ? `${title.slice(0, 69)}…` : title || "Field note";
}

export function inventDek(stripped: string, hits: NamedHit[]): string {
  const contrasts = [...new Set(hits.map((hit) => hit.contrast).filter(Boolean))].slice(0, 3);
  if (contrasts.length) return `Named hits across ${contrasts.join(", ")}. Original dump kept in this browser.`;
  const first = stripped.replace(/\*\*/g, "").split(/(?<=[.!?])\s+/).find(Boolean);
  return first ? first.slice(0, 220) : "Local field note, stored only in this browser.";
}

export function headingForParagraph(para: string): string | undefined {
  const bold = para.match(/^\*\*([^*]+)\*\*/);
  if (bold) return tidyHeading(bold[1]);
  if (/\d+\s+LRT workbooks/i.test(para)) return "Workbook layout";
  if (/joint tests/i.test(para)) return "Joint tests";
  if (/^[A-Za-z]+(?:\s*[×x]\s*[A-Za-z]+)+ is as weak/i.test(para)) {
    return findContrasts(para)[0] ?? "Weak contrasts";
  }
  if (/full \d+-row table|dropdown into each test/i.test(para)) return "Pointers";
  return undefined;
}

export function bodyAfterHeading(para: string): string {
  const bold = para.match(/^\*\*[^*]+\*\*\s*/);
  if (bold) return para.slice(bold[0].length).trim();
  return para.trim();
}

export function hitTable(hits: NamedHit[]): { columns: string[]; rows: string[][] } {
  const columns = ["Contrast", "Gene", "2ΔLL", "Rank", "Direction"];
  const rows = hits.map((hit) => [
    hit.contrast || "—",
    hit.gene,
    hit.ll != null ? String(hit.ll) : "—",
    hit.rank != null ? String(hit.rank) : hit.note === "rank next" ? "next" : "—",
    hit.direction || hit.note || "—",
  ]);
  return { columns, rows };
}
