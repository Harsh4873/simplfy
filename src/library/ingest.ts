import type { StudyModule } from "../catalog/types";
import type { LibraryItem } from "./db";

export const MAX_DROP_FILES = 80;
export const MAX_SPAWN_LESSONS = 12;
export const MAX_SPAWN_PAPERS = 8;

const SKIP_DIR = new Set([
  ".git",
  "node_modules",
  "__pycache__",
  ".venv",
  "venv",
  "dist",
  "build",
  ".next",
  ".cursor",
  "target",
  "coverage",
  ".idea",
  ".vscode",
  ".github",
  "vendor",
  ".tox",
  ".mypy_cache",
]);

const SKIP_BASE = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "cargo.lock",
  "go.sum",
  "poetry.lock",
  "thumbs.db",
]);

const SKIP_FILE =
  /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp3|mp4|mov|zip|gz|bz2|7z|dylib|so|pyc|class|exe|bin|lock)$/i;

const NOTES_EXT = /\.(md|markdown|txt|pdf|tex|ipynb|rmd|qmd|rst|org)$/i;
const DATA_EXT = /\.(csv|tsv|r|py)$/i;

export const GENERIC_ROOTS = new Set([
  "update",
  "updates",
  "notes",
  "files",
  "docs",
  "pack",
  "briefing",
  "snapshots",
  "markdown",
  "md",
  "src",
  "dump",
  "inbox",
]);

export function relPathOf(file: File): string {
  const extra = file as File & { webkitRelativePath?: string };
  const rel = (extra.webkitRelativePath || "").replaceAll("\\", "/").replace(/^\/+/, "");
  return rel || file.name;
}

export function shouldSkipRelPath(rel: string): boolean {
  const parts = rel.split("/").filter(Boolean);
  if (parts.some((part) => SKIP_DIR.has(part) || part === ".DS_Store")) return true;
  const base = parts[parts.length - 1] ?? "";
  if (base === ".DS_Store" || SKIP_BASE.has(base.toLowerCase())) return true;
  if (base.startsWith(".") && !/\.(md|txt|csv|json|tex|r|py)$/i.test(base)) return true;
  if (SKIP_FILE.test(base)) return true;
  return false;
}

export function isSnapshotRel(rel: string): boolean {
  return /(^|\/)snapshots\//i.test(rel.replaceAll("\\", "/"));
}

export function rankForDrop(rel: string): number {
  if (NOTES_EXT.test(rel)) return 0;
  if (DATA_EXT.test(rel)) return 1;
  return 2;
}

export function pickDropFiles(files: File[]): File[] {
  const usable = [...files].filter((file) => !shouldSkipRelPath(relPathOf(file)));
  const livingNotes = usable.some((file) => {
    const rel = relPathOf(file);
    return NOTES_EXT.test(rel) && !isSnapshotRel(rel);
  });
  return usable
    .filter((file) => !(livingNotes && isSnapshotRel(relPathOf(file))))
    .sort((a, b) => rankForDrop(relPathOf(a)) - rankForDrop(relPathOf(b)) || relPathOf(a).localeCompare(relPathOf(b)))
    .slice(0, MAX_DROP_FILES);
}

export function fileBaseName(relOrName: string): string {
  const parts = relOrName.replaceAll("\\", "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || relOrName;
}

export function packFileRank(rel: string): number {
  const path = rel.toLowerCase();
  const base = fileBaseName(path);
  if (isSnapshotRel(path)) return 80;
  if (/last-class|lecture/.test(base)) return 0;
  if (/where-we-are|progress/.test(base)) return 1;
  if (/next-class/.test(base)) return 2;
  if (/deadline/.test(base)) return 3;
  if (/^todo/.test(base)) return 4;
  if (/how-this-course|syllabus/.test(base)) return 5;
  if (/^readme/.test(base)) return 6;
  return 10;
}

/** Everyday words that also appear as module-id tails or aliases. Never treat them as catalogue hits. */
export const GENERIC_CATALOGUE_PHRASE = new Set([
  "error",
  "line",
  "tree",
  "trees",
  "plot",
  "fast",
  "power",
  "clock",
  "mask",
  "cost",
  "rate",
  "bias",
  "event",
  "coverage",
  "variance",
  "density",
  "diagnosis",
  "projection",
  "topology",
  "residuals",
  "influence",
  "sandwich",
  "blocking",
  "prior",
  "risk",
  "ratio",
  "acid",
  "gene",
  "class",
  "link",
  "test",
  "tests",
  "stat",
  "art",
  "info",
  "score",
  "empty",
  "state",
  "states",
  "accept",
  "reject",
  "string",
  "language",
  "finite",
  "regular",
  "union",
  "proof",
  "type",
  "form",
  "set",
  "map",
  "node",
  "path",
  "mean",
  "data",
  "file",
  "note",
  "pack",
  "update",
  "course",
  "week",
  "last",
  "next",
  "start",
  "end",
  "model",
  "models",
  "figure",
  "story",
  "plate",
  "drug",
  "inference",
  "secretion",
  "glossary",
  "wikipedia",
  "comparison",
  "experiment",
  "experiments",
  "interaction",
  "regression",
  "dx",
  "tx",
  "se",
  "sp",
  "tb",
]);

export function spawnWorthyGene(gene: string): boolean {
  return /[a-z][A-Z]/.test(gene) || /\d/.test(gene) || /_/.test(gene);
}

export function spawnWorthyLink(text: string): boolean {
  const t = text.trim();
  if (!t || GENERIC_CATALOGUE_PHRASE.has(t.toLowerCase())) return false;
  if (spawnWorthyGene(t)) return true;
  if (/^[A-Z]{2,12}$/.test(t)) return true;
  if (t.length >= 8 && /[A-Za-z]/.test(t)) return true;
  return false;
}

export function looksLikeFolderDrop(files: File[]): boolean {
  return files.some((file) => relPathOf(file).includes("/"));
}

export function stripGenericRoot(rel: string): string {
  const parts = rel.split("/").filter(Boolean);
  if (parts.length > 1 && GENERIC_ROOTS.has(parts[0].toLowerCase())) {
    return parts.slice(1).join("/");
  }
  return rel;
}

export function itemKey(relOrName: string): string {
  return stripGenericRoot(relOrName).replaceAll("\\", "/").toLowerCase();
}

export function titleFromReadme(text: string): string | null {
  const line = text
    .split(/\n/)
    .map((part) => part.trim())
    .find((part) => /^#\s+/.test(part));
  if (!line) return null;
  let title = line.replace(/^#\s+/, "").trim();
  title = title.replace(/\s*[—–-]\s*update pack\b.*$/i, "");
  title = title.replace(/\s*\(read this folder\)\s*/gi, "");
  title = title.replace(/\s+/g, " ").trim();
  if (title.length < 2 || title.length > 80) return null;
  return title;
}

export function inferCollectionName(files: File[], typed = "", readmeText = ""): string {
  const named = typed.trim();
  if (named) return named;
  const fromReadme = titleFromReadme(readmeText);
  if (fromReadme) return fromReadme;
  const roots = new Set<string>();
  for (const file of files) {
    const parts = relPathOf(file).split("/").filter(Boolean);
    if (parts.length > 1) roots.add(parts[0]);
  }
  const meaningful = [...roots].filter((root) => !GENERIC_ROOTS.has(root.toLowerCase()));
  if (meaningful.length === 1) return meaningful[0];
  return "Inbox";
}

export async function inferCollectionNameFromFiles(files: File[], typed = ""): Promise<string> {
  if (typed.trim()) return typed.trim();
  const readme = files.find((file) => /(^|\/)readme\.md$/i.test(relPathOf(file)));
  const text = readme ? await readme.text() : "";
  return inferCollectionName(files, typed, text);
}

export type SpawnPlan = {
  moduleIds: string[];
  paperQueries: string[];
};

export function spawnPlan(items: LibraryItem[], modules: StudyModule[]): SpawnPlan {
  const known = new Set(modules.map((module) => module.id));
  const moduleIds: string[] = [];
  const seenModule = new Set<string>();
  const paperQueries: string[] = [];
  const seenPaper = new Set<string>();

  const addModule = (id: string) => {
    if (!known.has(id) || seenModule.has(id)) return;
    seenModule.add(id);
    moduleIds.push(id);
  };
  const addPaper = (query: string) => {
    const q = query.trim();
    if (!q) return;
    const key = q.toLowerCase();
    if (seenPaper.has(key)) return;
    seenPaper.add(key);
    paperQueries.push(q);
  };

  for (const item of items) {
    for (const link of item.brief?.links ?? []) {
      if (spawnWorthyLink(link.text)) addModule(link.moduleId);
    }
    for (const hit of item.brief?.hits ?? []) {
      if (hit.gene && spawnWorthyGene(hit.gene)) addPaper(hit.gene);
    }
  }

  return {
    moduleIds: moduleIds.slice(0, MAX_SPAWN_LESSONS),
    paperQueries: paperQueries.slice(0, MAX_SPAWN_PAPERS),
  };
}

export function folderOf(relPath: string): string {
  const parts = relPath.split("/").filter(Boolean);
  if (parts.length < 2) return "";
  return parts.slice(0, -1).join("/");
}
