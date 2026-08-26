import type { StudyModule } from "./types";

export type LibraryHit = {
  id: string;
  name: string;
  text: string;
};

export type SearchHit =
  | { kind: "module"; score: number; module: StudyModule }
  | { kind: "library"; score: number; item: LibraryHit };

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function haystack(module: StudyModule): string {
  return [
    module.id,
    module.title,
    module.dek,
    module.aliases.join(" "),
    module.tags.join(" "),
    module.story.join(" "),
    module.deep.join(" "),
    module.visual.caption,
  ]
    .join(" ")
    .toLowerCase();
}

function scoreText(query: string, parts: { text: string; weight: number }[]): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const words = tokens(q);
  let score = 0;
  for (const part of parts) {
    const text = part.text.toLowerCase();
    if (!text) continue;
    if (text === q) score += 12 * part.weight;
    else if (text.startsWith(q)) score += 8 * part.weight;
    else if (text.includes(q)) score += 5 * part.weight;
    let matched = 0;
    for (const word of words) {
      if (text.includes(word)) matched += 1;
    }
    if (words.length > 0 && matched === words.length) score += 3 * part.weight;
    else score += matched * part.weight;
  }
  return score;
}

export function searchCatalog(query: string, modules: StudyModule[]): SearchHit[] {
  const q = query.trim();
  if (!q) {
    return modules.map((module) => ({ kind: "module", score: 0, module }));
  }
  return modules
    .map((module) => ({
      kind: "module" as const,
      module,
      score: scoreText(q, [
        { text: module.title, weight: 6 },
        { text: module.aliases.join(" "), weight: 5 },
        { text: module.tags.join(" "), weight: 3 },
        { text: module.id.replaceAll("-", " "), weight: 3 },
        { text: haystack(module), weight: 1 },
      ]),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.module.title.localeCompare(b.module.title));
}

export function searchStudio(
  query: string,
  modules: StudyModule[],
  library: LibraryHit[],
): SearchHit[] {
  const catalogHits = searchCatalog(query, modules);
  const q = query.trim();
  const libraryHits: SearchHit[] = q
    ? library
        .map((item) => ({
          kind: "library" as const,
          item,
          score: scoreText(q, [
            { text: item.name, weight: 5 },
            { text: item.text.slice(0, 8000), weight: 2 },
          ]),
        }))
        .filter((hit) => hit.score > 0)
    : [];
  return [...catalogHits, ...libraryHits].sort((a, b) => b.score - a.score);
}

export function relatedModules(module: StudyModule, byId: Map<string, StudyModule>): StudyModule[] {
  const direct = module.related
    .map((id) => byId.get(id))
    .filter((item): item is StudyModule => Boolean(item));
  const extra = [...byId.values()].filter(
    (item) => item.domain === module.domain && item.id !== module.id && !direct.some((d) => d.id === item.id),
  );
  return [...direct, ...extra].slice(0, 10);
}
