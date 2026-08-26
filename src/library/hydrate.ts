import type { StudyModule } from "../catalog/types";
import type { LibraryItem } from "./db";
import { composeBrief } from "../md/compose";
import { BRIEF_VERSION } from "../md/types";

export function withBrief(item: LibraryItem, modules: StudyModule[]): LibraryItem {
  if (!item.text?.trim()) return item;
  if (item.brief?.version === BRIEF_VERSION) return item;
  const brief = composeBrief(item.text, modules);
  return { ...item, brief, name: brief.title };
}
