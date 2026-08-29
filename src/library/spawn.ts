import type { StudyModule } from "../catalog/types";
import { sayBackItem } from "../lesson/fromModule";
import {
  getStudio,
  listRecall,
  putRecallCard,
  putStudio,
  type Collection,
  type LibraryItem,
} from "./db";
import { spawnPlan, type SpawnPlan } from "./ingest";

export async function seedClassStudios(
  db: IDBDatabase,
  folder: Collection,
  items: LibraryItem[],
  modules: StudyModule[],
  byId: Map<string, StudyModule>,
): Promise<SpawnPlan> {
  const plan = spawnPlan(items, modules);
  const now = Date.now();
  const classRow = await getStudio(db, `class:${folder.id}`);
  await putStudio(db, {
    id: `class:${folder.id}`,
    kind: "class",
    title: folder.name,
    collectionId: folder.id,
    pinned: classRow?.pinned ?? false,
    createdAt: classRow?.createdAt ?? now,
    updatedAt: now,
  });
  for (const item of items) {
    const existing = await getStudio(db, `note:${item.id}`);
    await putStudio(db, {
      id: `note:${item.id}`,
      kind: "note",
      title: item.name,
      noteId: item.id,
      collectionId: folder.id,
      pinned: existing?.pinned ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }
  for (const moduleId of plan.moduleIds) {
    const module = byId.get(moduleId);
    if (!module) continue;
    const existing = await getStudio(db, `lesson:${module.id}`);
    await putStudio(db, {
      id: `lesson:${module.id}`,
      kind: "lesson",
      title: module.title,
      moduleId: module.id,
      step: existing?.step ?? "teach",
      collectionId: folder.id,
      pinned: existing?.pinned ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    const seed = sayBackItem(module);
    const already = (await listRecall(db)).find(
      (card) => card.moduleId === module.id && card.checkId === seed.id && card.collectionId === folder.id,
    );
    if (!already) {
      await putRecallCard(db, {
        id: crypto.randomUUID(),
        moduleId: module.id,
        checkId: seed.id,
        prompt: seed.prompt,
        kind: seed.kind,
        createdAt: now,
        misses: 0,
        lastMissedAt: now,
        collectionId: folder.id,
      });
    }
  }
  for (const query of plan.paperQueries) {
    const existing = await getStudio(db, `papers:${query.toLowerCase()}`);
    await putStudio(db, {
      id: `papers:${query.toLowerCase()}`,
      kind: "papers",
      title: `Lookup · ${query}`,
      papersQuery: query,
      collectionId: folder.id,
      pinned: existing?.pinned ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }
  return plan;
}
