import type { LibraryItem, RecallCard } from "./db";
import { isSnapshotRel, packFileRank } from "./ingest";

export const MAX_CARDS_PER_FILE = 8;
export const MAX_CLASS_CARDS = 40;

const SKIP_HEADING =
  /^(rules|honor|who \/ when|if you need|read this folder|platforms \/ people|optional|as of)|update pack/i;

function slug(value: string): string {
  const s = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return s || "card";
}

function tidy(value: string): string {
  return value
    .replace(/\[[^\]]*\]\([^)]+\)/g, (m) => {
      const label = m.match(/^\[([^\]]*)\]/);
      return label?.[1] ?? "";
    })
    .replace(/[*_`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function skipSnapshot(rel: string): boolean {
  return isSnapshotRel(rel);
}

function parseTableRows(block: string): { prompt: string; answer: string }[] {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  if (lines.length < 3) return [];
  const cells = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => tidy(cell));
  const header = cells(lines[0] ?? "");
  const out: { prompt: string; answer: string }[] = [];
  for (const line of lines.slice(2)) {
    const row = cells(line);
    if (!row.length || /^-+$/.test(row.join(""))) continue;
    const prompt = tidy(row[0] ?? "");
    const answer = tidy(row.slice(1).join(" · "));
    if (prompt.length < 3 || answer.length < 3) continue;
    out.push({
      prompt: header[0] ? `${header[0]}: ${prompt}` : prompt,
      answer,
    });
  }
  return out;
}

export function cardsFromMarkdown(text: string, itemId: string, fileLabel: string): Omit<RecallCard, "id" | "createdAt" | "misses" | "lastMissedAt" | "collectionId">[] {
  const cards: Omit<RecallCard, "id" | "createdAt" | "misses" | "lastMissedAt" | "collectionId">[] = [];
  const seen = new Set<string>();
  const push = (prompt: string, answer: string, checkId: string) => {
    const p = tidy(prompt);
    const a = tidy(answer);
    if (p.length < 8 || a.length < 24) return;
    if (cards.length >= MAX_CARDS_PER_FILE) return;
    const key = p.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cards.push({
      moduleId: "note",
      checkId: `${itemId}:${checkId}`,
      prompt: p.length > 220 ? `${p.slice(0, 217)}…` : p,
      kind: "conceptual",
      answer: a.length > 900 ? `${a.slice(0, 897)}…` : a,
      noteId: itemId,
    });
  };

  const chunks = text.split(/\n(?=#{1,3}\s)/);
  for (const chunk of chunks) {
    const headingMatch = chunk.match(/^#{1,3}\s+(.+)\n?/);
    const heading = tidy(headingMatch?.[1] ?? "");
    const body = headingMatch ? chunk.slice(headingMatch[0].length) : chunk;
    if (heading && SKIP_HEADING.test(heading)) continue;

    for (const table of body.matchAll(/(?:^|\n)(\|.+\n\|[-:| ]+\n(?:\|.+\n?)+)/g)) {
      for (const row of parseTableRows(table[1] ?? "")) {
        push(row.prompt, row.answer, slug(row.prompt));
      }
    }

    for (const todo of body.matchAll(/^- \[[ xX]\] (.+)$/gm)) {
      const task = tidy(todo[1] ?? "");
      if (task) push(`Todo from ${fileLabel}`, task, `todo-${slug(task)}`);
    }

    const prose = tidy(
      body
        .replace(/(?:^|\n)\|.+/g, "\n")
        .replace(/^- \[[ xX]\].+$/gm, "")
        .replace(/^#{1,6}\s+.+$/gm, ""),
    );
    if (heading && prose) push(heading, prose, slug(heading));
  }

  return cards;
}

export function cardsFromClassNotes(items: LibraryItem[]): Omit<RecallCard, "id" | "createdAt" | "misses" | "lastMissedAt" | "collectionId">[] {
  const ranked = [...items].sort((a, b) => {
    const ra = packFileRank(a.relPath ?? a.name);
    const rb = packFileRank(b.relPath ?? b.name);
    return ra - rb || a.name.localeCompare(b.name);
  });
  const out: Omit<RecallCard, "id" | "createdAt" | "misses" | "lastMissedAt" | "collectionId">[] = [];
  for (const item of ranked) {
    const rel = item.relPath ?? item.name;
    if (skipSnapshot(rel) && ranked.some((row) => !skipSnapshot(row.relPath ?? row.name))) continue;
    const label = rel.split("/").pop() || item.name;
    const cards = cardsFromMarkdown(item.text, item.id, label);
    for (const card of cards) {
      if (out.length >= MAX_CLASS_CARDS) return out;
      out.push(card);
    }
  }
  return out;
}
