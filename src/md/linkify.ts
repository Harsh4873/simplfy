import type { StudyModule } from "../catalog/types";
import type { InlineSpan, PlateLink } from "./types";

const STOP_PHRASE = new Set([
  "glossary",
  "wikipedia",
  "inference",
  "secretion",
  "class",
  "gene",
  "drug",
  "test",
  "models",
  "model",
  "link",
  "figure",
  "story",
  "plate",
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "not",
  "but",
  "interaction",
  "regression",
  "comparison",
  "experiments",
  "experiment",
]);

const EXTRA: Record<string, string[]> = {
  "wiki-wilks": ["χ²", "χ2", "chi-square", "chi square", "chisquare"],
  "stats-lrt": ["2ΔLL", "2Δℓ", "likelihood ratio"],
  "tb-esx-secretion": ["esxB", "esxA", "PPE68", "ESX", "CFP-10", "ESAT-6"],
  "tb-rifampin": ["rif", "rifampin", "rifampicin"],
  "stats-ols-glm": ["GLM"],
  "wiki-glm": ["generalized linear model"],
  "stats-hierarchical": ["hierarchical"],
};

type Phrase = {
  phrase: string;
  moduleId: string;
  weight: number;
  pattern: RegExp;
};

const indexCache = new WeakMap<StudyModule[], Phrase[]>();

function isGeneLike(token: string): boolean {
  if (token.length < 3 || token.length > 18) return false;
  if (STOP_PHRASE.has(token.toLowerCase())) return false;
  if (/[a-z][A-Z]/.test(token)) return true;
  if (/^[A-Z]{2,}\d+$/.test(token)) return true;
  if (/_/.test(token)) return true;
  if (/^[A-Z]{2,5}$/.test(token) && token !== "TB" && token !== "WHO" && token !== "DST") return true;
  return false;
}

function geneTokensFrom(text: string): string[] {
  const found = new Set<string>();
  const re = /\b([A-Za-z][A-Za-z0-9_-]{1,16})\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (isGeneLike(match[1])) found.add(match[1]);
  }
  return [...found];
}

function usablePhrase(phrase: string): boolean {
  const trimmed = phrase.trim();
  if (!trimmed) return false;
  if (STOP_PHRASE.has(trimmed.toLowerCase())) return false;
  if (trimmed.length >= 3) return true;
  return /[χΧΔℓ²³]/.test(trimmed);
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function boundaryPattern(phrase: string): RegExp {
  const body = escapeRe(phrase).replace(/\s+/g, "\\s+");
  return new RegExp(`^${body}(?![A-Za-z0-9_])`, "i");
}

function phrasesFor(module: StudyModule): { phrase: string; weight: number }[] {
  const out: { phrase: string; weight: number }[] = [];
  const add = (phrase: string, weight: number) => {
    const trimmed = phrase.trim();
    if (!usablePhrase(trimmed)) return;
    out.push({ phrase: trimmed, weight });
  };

  add(module.title, 6);
  for (const alias of module.aliases) add(alias, 8);
  add(module.id.replaceAll("-", " "), 3);
  const tail = module.id.split("-").pop() ?? "";
  if (tail.length >= 2 && tail.length <= 5) add(tail, 7);
  for (const tag of module.tags) {
    if (!isGeneLike(tag) && !/^[A-Z0-9-]{2,8}$/.test(tag)) continue;
    add(tag, 4);
  }
  if (module.visual.kind === "gene-track") add(module.visual.gene, 9);
  const hay = [module.title, module.dek, module.aliases.join(" "), module.tags.join(" "), module.story.join(" ")].join(
    " ",
  );
  for (const token of geneTokensFrom(hay)) add(token, 7);
  for (const extra of EXTRA[module.id] ?? []) add(extra, 9);
  return out;
}

export function plateIndex(modules: StudyModule[]): Phrase[] {
  const cached = indexCache.get(modules);
  if (cached) return cached;

  const best = new Map<string, Phrase>();
  for (const module of modules) {
    for (const { phrase, weight } of phrasesFor(module)) {
      const key = phrase.toLowerCase();
      const prev = best.get(key);
      if (prev && prev.weight >= weight) continue;
      best.set(key, { phrase, moduleId: module.id, weight, pattern: boundaryPattern(phrase) });
    }
  }

  const ranked = [...best.values()].sort(
    (a, b) => b.phrase.length - a.phrase.length || b.weight - a.weight || a.moduleId.localeCompare(b.moduleId),
  );
  indexCache.set(modules, ranked);
  return ranked;
}

function splitStrong(markdown: string): { text: string; strong: boolean }[] {
  const parts: { text: string; strong: boolean }[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown))) {
    if (match.index > last) parts.push({ text: markdown.slice(last, match.index), strong: false });
    parts.push({ text: match[1], strong: true });
    last = match.index + match[0].length;
  }
  if (last < markdown.length) parts.push({ text: markdown.slice(last), strong: false });
  return parts.filter((part) => part.text.length > 0);
}

function linkifyPlain(text: string, phrases: Phrase[], strong: boolean): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let i = 0;
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    spans.push(strong ? { kind: "text", text: buffer, strong: true } : { kind: "text", text: buffer });
    buffer = "";
  };

  while (i < text.length) {
    let hit: { length: number; moduleId: string } | null = null;
    const open = i === 0 || !/[A-Za-z0-9_]/.test(text[i - 1] ?? "");
    const slice = text.slice(i);
    if (open) {
      for (const phrase of phrases) {
        const found = slice.match(phrase.pattern);
        if (!found) continue;
        hit = { length: found[0].length, moduleId: phrase.moduleId };
        break;
      }
    }
    if (hit) {
      flush();
      const matched = text.slice(i, i + hit.length);
      spans.push(strong ? { kind: "plate", text: matched, moduleId: hit.moduleId, strong: true } : { kind: "plate", text: matched, moduleId: hit.moduleId });
      i += hit.length;
    } else {
      buffer += text[i];
      i += 1;
    }
  }
  flush();
  return spans;
}

export function linkifyMarkdown(markdown: string, modules: StudyModule[]): InlineSpan[] {
  const phrases = plateIndex(modules);
  const spans: InlineSpan[] = [];
  for (const part of splitStrong(markdown)) {
    spans.push(...linkifyPlain(part.text, phrases, part.strong));
  }
  return spans;
}

export function collectPlateLinks(spans: InlineSpan[]): PlateLink[] {
  const links: PlateLink[] = [];
  const seen = new Set<string>();
  for (const span of spans) {
    if (span.kind !== "plate") continue;
    const key = `${span.moduleId}:${span.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ text: span.text, moduleId: span.moduleId });
  }
  return links;
}
