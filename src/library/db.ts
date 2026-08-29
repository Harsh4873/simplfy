import type { LabBrief } from "../md/types";

export type LibraryKind = "file" | "note";

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
};

export type StudioKind = "lesson" | "note" | "papers";

export type StudioCanvas = {
  id: string;
  kind: StudioKind;
  title: string;
  moduleId?: string;
  noteId?: string;
  papersQuery?: string;
  step?: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

const DB_NAME = "simplfy";
const DB_VERSION = 3;

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

export async function putLibraryItem(db: IDBDatabase, item: LibraryItem): Promise<void> {
  const tx = db.transaction("library", "readwrite");
  tx.objectStore("library").put(item);
  await txDone(tx);
}

export async function deleteLibraryItem(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction("library", "readwrite");
  tx.objectStore("library").delete(id);
  await txDone(tx);
}

export async function listRecall(db: IDBDatabase): Promise<RecallCard[]> {
  const items = await requestToPromise(db.transaction("recall").objectStore("recall").getAll());
  return items.sort((a, b) => b.lastMissedAt - a.lastMissedAt);
}

export async function putRecallCard(db: IDBDatabase, card: RecallCard): Promise<void> {
  const tx = db.transaction("recall", "readwrite");
  tx.objectStore("recall").put(card);
  await txDone(tx);
}

export async function deleteRecallCard(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction("recall", "readwrite");
  tx.objectStore("recall").delete(id);
  await txDone(tx);
}

export async function getPref(db: IDBDatabase, key: string): Promise<string | null> {
  const row = await requestToPromise(
    db.transaction("prefs").objectStore("prefs").get(key) as IDBRequest<{ key: string; value: string } | undefined>,
  );
  return row?.value ?? null;
}

export async function setPref(db: IDBDatabase, key: string, value: string): Promise<void> {
  const tx = db.transaction("prefs", "readwrite");
  tx.objectStore("prefs").put({ key, value });
  await txDone(tx);
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
}

export async function deleteStudio(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction("studios", "readwrite");
  tx.objectStore("studios").delete(id);
  await txDone(tx);
}
