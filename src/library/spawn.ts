import type { StudyModule } from "../catalog/types";
import { sayBackItem } from "../lesson/fromModule";
import {
  deleteRecallCard,
  deleteStudio,
  getStudio,
  listRecall,
  listStudios,
  putRecallCard,
  putStudio,
  type Collection,
  type LibraryItem,
} from "./db";
import { spawnPlan, type SpawnPlan } from "./ingest";
import { cardsFromClassNotes, cardsFromNoteText } from "./noteCards";

export type SeedResult = SpawnPlan & { noteCards: number };

export async function seedNoteDeck(db: IDBDatabase, item: LibraryItem): Promise<number> {
  const now = Date.now();
  const existing = await getStudio(db, `note:${item.id}`);
  await putStudio(db, {
    id: `note:${item.id}`,
    kind: "note",
    title: item.name,
    noteId: item.id,
    collectionId: item.collectionId,
    pinned: existing?.pinned ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  const built = cardsFromNoteText(item.text, item.id, item.name);
  const keepKeys = new Set(built.map((card) => `${card.moduleId}:${card.checkId}`));
  for (const card of await listRecall(db)) {
    if (card.noteId !== item.id) continue;
    if (card.misses > 0) continue;
    const key = `${card.moduleId}:${card.checkId}`;
    if (!keepKeys.has(key)) await deleteRecallCard(db, card.id);
  }

  const recallNow = await listRecall(db);
  let stamp = now;
  for (const card of built) {
    const already = recallNow.find(
      (row) => row.moduleId === card.moduleId && row.checkId === card.checkId && row.noteId === item.id,
    );
    if (already) {
      if (already.misses === 0) {
        await putRecallCard(db, {
          ...already,
          prompt: card.prompt,
          answer: card.answer,
          noteId: item.id,
          collectionId: item.collectionId,
        });
      }
      continue;
    }
    await putRecallCard(db, {
      id: crypto.randomUUID(),
      ...card,
      createdAt: now,
      misses: 0,
      lastMissedAt: stamp,
      collectionId: item.collectionId,
    });
    stamp -= 1;
  }
  return built.length;
}

export async function seedClassStudios(
  db: IDBDatabase,
  folder: Collection,
  items: LibraryItem[],
  modules: StudyModule[],
  byId: Map<string, StudyModule>,
): Promise<SeedResult> {
  const plan = spawnPlan(items, modules);
  const now = Date.now();
  const itemIds = new Set(items.map((item) => item.id));
  const lessonIds = new Set(plan.moduleIds.map((id) => `lesson:${id}`));
  const paperIds = new Set(plan.paperQueries.map((query) => `papers:${query.toLowerCase()}`));

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

  for (const canvas of await listStudios(db)) {
    if (canvas.collectionId !== folder.id) continue;
    if (canvas.kind === "class") continue;
    if (canvas.kind === "note" && canvas.noteId && !itemIds.has(canvas.noteId)) {
      await deleteStudio(db, canvas.id);
      continue;
    }
    if (canvas.kind === "lesson" && !lessonIds.has(canvas.id) && !canvas.pinned) {
      await putStudio(db, { ...canvas, collectionId: undefined, updatedAt: now });
      continue;
    }
    if (canvas.kind === "papers" && !paperIds.has(canvas.id) && !canvas.pinned) {
      await putStudio(db, { ...canvas, collectionId: undefined, updatedAt: now });
    }
  }

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

  const keepKeys = new Set<string>();
  for (const moduleId of plan.moduleIds) {
    const module = byId.get(moduleId);
    if (!module) continue;
    const seed = sayBackItem(module);
    keepKeys.add(`${module.id}:${seed.id}`);
  }
  for (const card of cardsFromClassNotes(items)) {
    keepKeys.add(`${card.moduleId}:${card.checkId}`);
  }

  for (const card of await listRecall(db)) {
    if (card.collectionId !== folder.id) continue;
    if (card.noteId && !itemIds.has(card.noteId)) {
      await deleteRecallCard(db, card.id);
      continue;
    }
    if (card.misses > 0) continue;
    const key = `${card.moduleId}:${card.checkId}`;
    if (!keepKeys.has(key)) await deleteRecallCard(db, card.id);
  }

  const existingRecall = await listRecall(db);
  for (const moduleId of plan.moduleIds) {
    const module = byId.get(moduleId);
    if (!module) continue;
    const seed = sayBackItem(module);
    const already = existingRecall.find(
      (card) => card.moduleId === module.id && card.checkId === seed.id && card.collectionId === folder.id,
    );
    if (already) continue;
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

  const built = cardsFromClassNotes(items);
  let stamp = now;
  const recallNow = await listRecall(db);
  for (const card of built) {
    const already = recallNow.find(
      (row) => row.moduleId === card.moduleId && row.checkId === card.checkId && row.collectionId === folder.id,
    );
    if (already) {
      if (already.misses === 0) {
        await putRecallCard(db, {
          ...already,
          prompt: card.prompt,
          answer: card.answer,
          noteId: card.noteId,
        });
      }
      continue;
    }
    await putRecallCard(db, {
      id: crypto.randomUUID(),
      ...card,
      createdAt: now,
      misses: 0,
      lastMissedAt: stamp,
      collectionId: folder.id,
    });
    stamp -= 1;
  }

  return { ...plan, noteCards: built.length };
}
