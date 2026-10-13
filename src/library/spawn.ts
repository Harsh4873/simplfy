import {
  deleteCollectionRow,
  deleteLibraryItem,
  deleteRecallCard,
  deleteStudio,
  getCollection,
  getLibraryItem,
  getStudio,
  listCollections,
  listLibrary,
  listRecall,
  listStudios,
  putRecallCard,
  putStudio,
  type Collection,
  type LibraryItem,
} from "./db";
import type { SpawnPlan } from "./ingest";
import { cardsFromClassNotes, cardsFromNoteText } from "./noteCards";

export type SeedResult = SpawnPlan & { noteCards: number; cardsCapped: boolean };

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
    ...(existing?.step ? { step: existing.step } : {}),
  });

  const built = cardsFromNoteText(item.text, item.id, item.name);
  const keepKeys = new Set(built.map((card) => `${card.moduleId}:${card.checkId}`));
  for (const card of await listRecall(db)) {
    if (card.noteId !== item.id) continue;
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
      if (
        already.prompt !== card.prompt
        || already.answer !== card.answer
        || already.noteId !== item.id
        || already.collectionId !== item.collectionId
      ) {
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

/** Catalogue tutor plates and lookups never belong on a class pack. */
export async function isolateClassFromCatalogue(db: IDBDatabase, folderId: string): Promise<void> {
  const now = Date.now();
  for (const canvas of await listStudios(db)) {
    if (canvas.collectionId !== folderId) continue;
    if (canvas.kind !== "lesson" && canvas.kind !== "papers") continue;
    await putStudio(db, { ...canvas, collectionId: undefined, updatedAt: now });
  }
  for (const card of await listRecall(db)) {
    if (card.collectionId !== folderId || card.noteId) continue;
    if (card.misses > 0) {
      await putRecallCard(db, { ...card, collectionId: undefined });
      continue;
    }
    await deleteRecallCard(db, card.id);
  }
}

export async function isolateAllClasses(db: IDBDatabase): Promise<void> {
  for (const folder of await listCollections(db)) {
    await isolateClassFromCatalogue(db, folder.id);
  }
}

export async function seedClassStudios(
  db: IDBDatabase,
  folder: Collection,
  items: LibraryItem[],
): Promise<SeedResult> {
  const now = Date.now();
  const itemIds = new Set(items.map((item) => item.id));

  await isolateClassFromCatalogue(db, folder.id);

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
      ...(existing?.step ? { step: existing.step } : {}),
    });
  }

  const builtPack = cardsFromClassNotes(items);
  const built = builtPack.cards;
  const keepKeys = new Set(built.map((card) => `${card.moduleId}:${card.checkId}`));

  for (const card of await listRecall(db)) {
    if (card.collectionId !== folder.id) continue;
    if (!card.noteId || !itemIds.has(card.noteId)) {
      if (!card.noteId && card.misses > 0) {
        await putRecallCard(db, { ...card, collectionId: undefined });
        continue;
      }
      await deleteRecallCard(db, card.id);
      continue;
    }
    const key = `${card.moduleId}:${card.checkId}`;
    if (!keepKeys.has(key)) await deleteRecallCard(db, card.id);
  }

  let stamp = now;
  const recallNow = await listRecall(db);
  for (const card of built) {
    const already = recallNow.find(
      (row) => row.moduleId === card.moduleId && row.checkId === card.checkId && row.collectionId === folder.id,
    );
    if (already) {
      if (
        already.prompt !== card.prompt
        || already.answer !== card.answer
        || already.noteId !== card.noteId
        || already.collectionId !== folder.id
      ) {
        await putRecallCard(db, {
          ...already,
          prompt: card.prompt,
          answer: card.answer,
          noteId: card.noteId,
          collectionId: folder.id,
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

  return { moduleIds: [], paperQueries: [], noteCards: built.length, cardsCapped: builtPack.capped };
}

/** Drop one filed source and rebuild its class deck from what is still stored. */
export async function removeFiledSource(db: IDBDatabase, id: string): Promise<void> {
  const item = await getLibraryItem(db, id);
  const folderId = item?.collectionId;
  await deleteLibraryItem(db, id);
  await deleteStudio(db, `note:${id}`);
  for (const card of await listRecall(db)) {
    if (card.noteId === id) await deleteRecallCard(db, card.id);
  }
  if (!folderId) return;
  const folder = await getCollection(db, folderId);
  if (!folder) return;
  const classItems = (await listLibrary(db)).filter((row) => row.collectionId === folderId);
  await seedClassStudios(db, folder, classItems);
}

/** Drop a class and every stored file, canvas, and card that still belongs to it. */
export async function removeFiledCollection(db: IDBDatabase, id: string): Promise<void> {
  const items = (await listLibrary(db)).filter((item) => item.collectionId === id);
  const itemIds = new Set(items.map((item) => item.id));
  for (const item of items) {
    await deleteLibraryItem(db, item.id);
    await deleteStudio(db, `note:${item.id}`);
  }
  for (const canvas of await listStudios(db)) {
    if (canvas.collectionId === id) await deleteStudio(db, canvas.id);
  }
  for (const card of await listRecall(db)) {
    if (card.collectionId === id || (card.noteId != null && itemIds.has(card.noteId))) {
      await deleteRecallCard(db, card.id);
    }
  }
  await deleteCollectionRow(db, id);
}
