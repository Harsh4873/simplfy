import type { StudyModule } from "../catalog/types";
import type { LibraryItem } from "./db";
import { composeBrief } from "../md/compose";
import { BRIEF_VERSION } from "../md/types";

/** Class packs stay the files you dropped. Catalogue plates live under Learn. */
export function catalogForItem(item: { collectionId?: string }, modules: StudyModule[]): StudyModule[] {
  return item.collectionId ? [] : modules;
}

export function withBrief(item: LibraryItem, modules: StudyModule[]): LibraryItem {
  if (!item.text?.trim()) return item;
  if (item.brief?.version === BRIEF_VERSION) return item;
  const brief = composeBrief(item.text, catalogForItem(item, modules));
  return { ...item, brief, name: brief.title };
}
