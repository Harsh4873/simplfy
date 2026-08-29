import type { LabBrief } from "../md/types";

export type LibraryKind = "file" | "note" | "paper";

export type LibraryItem = {
  id: string;
  kind: LibraryKind;
  name: string;
  mime: string;
  size: number;
  text: string;
  createdAt: number;
  parseNote?: string;
  blob?: Blob;
  brief?: LabBrief;
  collectionId?: string;
  relPath?: string;
};

export type Collection = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type RecallCard = {
  id: string;
  moduleId: string;
  checkId: string;
  prompt: string;
  kind: "conceptual" | "calculation" | "figure";
  createdAt: number;
  misses: number;
  lastMissedAt: number;
  collectionId?: string;
  answer?: string;
  noteId?: string;
};

export type StudioKind = "lesson" | "note" | "papers" | "class";

export type StudioCanvas = {
  id: string;
  kind: StudioKind;
  title: string;
  moduleId?: string;
  noteId?: string;
  papersQuery?: string;
  collectionId?: string;
  step?: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

const DB_NAME = "simplfy";
const DB_VERSION = 5;

export const SYNC_STORES = ["library", "recall", "studios", "collections", "prefs"] as const;
export type SyncStore = (typeof SYNC_STORES)[number];

export type SyncMetadata = {
  key: string;
  store: SyncStore;
  id: string;
  updatedAtMs: number;
  clientId: string;
  deleted: boolean;
};

export type StudioMutation = {
  store: SyncStore;
  id: string;
  value: Record<string, unknown> | null;
  updatedAtMs: number;
};

const mutationListeners = new Set<(mutation: StudioMutation) => void>();

function emitMutation(store: SyncStore, id: string, value: Record<string, unknown> | null) {
  const mutation = { store, id, value, updatedAtMs: Date.now() };
  mutationListeners.forEach((listener) => listener(mutation));
}

export function subscribeStudioMutations(listener: (mutation: StudioMutation) => void) {
  mutationListeners.add(listener);
  return () => mutationListeners.delete(listener);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function ensureStores(db: IDBDatabase) {
  if (!db.objectStoreNames.contains("library")) {
    db.createObjectStore("library", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("recall")) {
    db.createObjectStore("recall", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("prefs")) {
    db.createObjectStore("prefs", { keyPath: "key" });
  }
  if (!db.objectStoreNames.contains("studios")) {
    db.createObjectStore("studios", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("collections")) {
    db.createObjectStore("collections", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("syncMeta")) {
    db.createObjectStore("syncMeta", { keyPath: "key" });
  }
}

export function openStudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      ensureStores(request.result);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };
    request.onblocked = () => {
      reject(new Error("Simplfy database upgrade is blocked by another tab."));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function listLibrary(db: IDBDatabase): Promise<LibraryItem[]> {
  const items = await requestToPromise(db.transaction("library").objectStore("library").getAll());
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLibraryItem(db: IDBDatabase, id: string): Promise<LibraryItem | undefined> {
  return requestToPromise(db.transaction("library").objectStore("library").get(id));
}

export async function putLibraryItem(db: IDBDatabase, item: LibraryItem, notify = true): Promise<void> {
  const tx = db.transaction("library", "readwrite");
  tx.objectStore("library").put(item);
  await txDone(tx);
  if (notify) emitMutation("library", item.id, item as unknown as Record<string, unknown>);
}

export async function deleteLibraryItem(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction("library", "readwrite");
  tx.objectStore("library").delete(id);
  await txDone(tx);
  emitMutation("library", id, null);
}

export async function listRecall(db: IDBDatabase): Promise<RecallCard[]> {
  const items = await requestToPromise(db.transaction("recall").objectStore("recall").getAll());
  return items.sort((a, b) => b.lastMissedAt - a.lastMissedAt);
}

export async function putRecallCard(db: IDBDatabase, card: RecallCard): Promise<void> {
  const tx = db.transaction("recall", "readwrite");
  tx.objectStore("recall").put(card);
  await txDone(tx);
  emitMutation("recall", card.id, card as unknown as Record<string, unknown>);
}

export async function deleteRecallCard(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction("recall", "readwrite");
  tx.objectStore("recall").delete(id);
  await txDone(tx);
  emitMutation("recall", id, null);
}

export async function getPref(db: IDBDatabase, key: string): Promise<string | null> {
  const row = await requestToPromise(
    db.transaction("prefs").objectStore("prefs").get(key) as IDBRequest<{ key: string; value: string } | undefined>,
  );
  return row?.value ?? null;
}

export async function setPref(db: IDBDatabase, key: string, value: string): Promise<void> {
  const tx = db.transaction("prefs", "readwrite");
  const row = { key, value };
  tx.objectStore("prefs").put(row);
  await txDone(tx);
  emitMutation("prefs", key, row);
}

export async function listStudios(db: IDBDatabase): Promise<StudioCanvas[]> {
  if (!db.objectStoreNames.contains("studios")) return [];
  const items = await requestToPromise(db.transaction("studios").objectStore("studios").getAll());
  return items.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

export async function getStudio(db: IDBDatabase, id: string): Promise<StudioCanvas | undefined> {
  return requestToPromise(db.transaction("studios").objectStore("studios").get(id));
}

export async function putStudio(db: IDBDatabase, canvas: StudioCanvas): Promise<void> {
  const tx = db.transaction("studios", "readwrite");
  tx.objectStore("studios").put(canvas);
  await txDone(tx);
  emitMutation("studios", canvas.id, canvas as unknown as Record<string, unknown>);
}

export async function deleteStudio(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction("studios", "readwrite");
  tx.objectStore("studios").delete(id);
  await txDone(tx);
  emitMutation("studios", id, null);
}

export async function listCollections(db: IDBDatabase): Promise<Collection[]> {
  if (!db.objectStoreNames.contains("collections")) return [];
  const items = await requestToPromise(db.transaction("collections").objectStore("collections").getAll());
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCollection(db: IDBDatabase, id: string): Promise<Collection | undefined> {
  if (!db.objectStoreNames.contains("collections")) return undefined;
  return requestToPromise(db.transaction("collections").objectStore("collections").get(id));
}

export async function putCollection(db: IDBDatabase, collection: Collection): Promise<void> {
  const tx = db.transaction("collections", "readwrite");
  tx.objectStore("collections").put(collection);
  await txDone(tx);
  emitMutation("collections", collection.id, collection as unknown as Record<string, unknown>);
}

export async function deleteCollectionRow(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction("collections", "readwrite");
  tx.objectStore("collections").delete(id);
  await txDone(tx);
  emitMutation("collections", id, null);
}

export function syncMetadataKey(store: SyncStore, id: string) {
  return `${store}:${id}`;
}

export async function listSyncStoreRows(
  db: IDBDatabase,
  store: SyncStore,
): Promise<Record<string, unknown>[]> {
  return requestToPromise(
    db.transaction(store).objectStore(store).getAll() as IDBRequest<Record<string, unknown>[]>,
  );
}

export async function listSyncMetadata(db: IDBDatabase): Promise<SyncMetadata[]> {
  if (!db.objectStoreNames.contains("syncMeta")) return [];
  return requestToPromise(
    db.transaction("syncMeta").objectStore("syncMeta").getAll() as IDBRequest<SyncMetadata[]>,
  );
}

export async function getSyncMetadata(
  db: IDBDatabase,
  store: SyncStore,
  id: string,
): Promise<SyncMetadata | undefined> {
  if (!db.objectStoreNames.contains("syncMeta")) return undefined;
  return requestToPromise(
    db.transaction("syncMeta").objectStore("syncMeta").get(syncMetadataKey(store, id)) as IDBRequest<SyncMetadata | undefined>,
  );
}

export async function putSyncMetadata(db: IDBDatabase, metadata: SyncMetadata): Promise<void> {
  const tx = db.transaction("syncMeta", "readwrite");
  tx.objectStore("syncMeta").put(metadata);
  await txDone(tx);
}

export async function applyRemoteSyncRecord(
  db: IDBDatabase,
  store: SyncStore,
  id: string,
  value: Record<string, unknown> | null,
  metadata: SyncMetadata,
): Promise<void> {
  const tx = db.transaction([store, "syncMeta"], "readwrite");
  if (value) tx.objectStore(store).put(value);
  else tx.objectStore(store).delete(id);
  tx.objectStore("syncMeta").put(metadata);
  await txDone(tx);
}

export async function clearStudioData(db: IDBDatabase): Promise<void> {
  const stores = [...SYNC_STORES, "syncMeta"];
  const tx = db.transaction(stores, "readwrite");
  stores.forEach((store) => tx.objectStore(store).clear());
  await txDone(tx);
}
