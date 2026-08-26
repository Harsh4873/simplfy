import type { StudyModule } from "../catalog/types";
import { searchCatalog } from "../catalog/search";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "were",
  "was",
  "are",
  "not",
  "but",
  "have",
  "has",
  "had",
  "into",
  "onto",
  "than",
  "then",
  "they",
  "their",
  "them",
  "which",
  "using",
  "used",
  "use",
  "can",
  "may",
  "also",
  "such",
  "via",
  "per",
]);

export function extractTerms(text: string, limit = 12): { label: string; weight: number }[] {
  const counts = new Map<string, number>();
  for (const raw of text.split(/[^A-Za-z0-9_+-]+/)) {
    const token = raw.trim();
    if (token.length < 3) continue;
    const key = token.toLowerCase();
    if (STOP.has(key)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, weight]) => ({ label, weight }));
}

export function relatedFromText(text: string, modules: StudyModule[]): StudyModule[] {
  const query = extractTerms(text, 8)
    .map((term) => term.label)
    .join(" ");
  if (!query) return [];
  return searchCatalog(query, modules)
    .filter((hit) => hit.kind === "module")
    .slice(0, 5)
    .map((hit) => hit.module);
}

export function firstLineTitle(text: string, fallback: string): string {
  const line = text.split(/\n/).map((part) => part.trim()).find(Boolean);
  if (!line) return fallback;
  return line.length > 72 ? `${line.slice(0, 69)}…` : line;
}
