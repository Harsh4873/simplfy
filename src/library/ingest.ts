import type { StudyModule } from "../catalog/types";
import { relatedForLibraryItem } from "./fieldNote";
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

export function rankForDrop(rel: string): number {
  if (NOTES_EXT.test(rel)) return 0;
  if (DATA_EXT.test(rel)) return 1;
  return 2;
}

export function pickDropFiles(files: File[]): File[] {
  return [...files]
    .filter((file) => !shouldSkipRelPath(relPathOf(file)))
    .sort((a, b) => rankForDrop(relPathOf(a)) - rankForDrop(relPathOf(b)) || relPathOf(a).localeCompare(relPathOf(b)))
    .slice(0, MAX_DROP_FILES);
}

export function inferCollectionName(files: File[], typed = ""): string {
  const named = typed.trim();
  if (named) return named;
  const roots = new Set<string>();
  for (const file of files) {
    const parts = relPathOf(file).split("/").filter(Boolean);
    if (parts.length > 1) roots.add(parts[0]);
  }
  if (roots.size === 1) return [...roots][0];
  return "Inbox";
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
    for (const link of item.brief?.links ?? []) addModule(link.moduleId);
    for (const hit of item.brief?.hits ?? []) {
      if (hit.gene) addPaper(hit.gene);
    }
    for (const related of relatedForLibraryItem(item, modules)) addModule(related.id);
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
