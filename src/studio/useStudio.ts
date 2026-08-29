import { useCallback, useEffect, useMemo, useState } from "react";
import { indexModules, loadCatalog } from "../catalog/loadCatalog";
import { searchStudio, type SearchHit } from "../catalog/search";
import type { CheckItem, StudyModule } from "../catalog/types";
import {
  deleteCollectionRow,
  deleteLibraryItem,
  deleteRecallCard,
  deleteStudio,
  getCollection,
  getPref,
  getStudio,
  listCollections,
  listLibrary,
  listRecall,
  listStudios,
  openStudioDb,
  putCollection,
  putLibraryItem,
  putRecallCard,
  putStudio,
  setPref,
  type Collection,
  type LibraryItem,
  type RecallCard,
  type StudioCanvas,
} from "../library/db";
import { withBrief } from "../library/hydrate";
import { inferCollectionName, MAX_DROP_FILES, pickDropFiles, relPathOf } from "../library/ingest";
import { seedClassStudios } from "../library/spawn";
import { MAX_FILE_BYTES, mimeForDroppedFile, parseDroppedFile } from "../library/parse";
import { composeBrief } from "../md/compose";
import { recallFromMiss } from "../quiz/grade";

export function useStudio() {
  const loaded = useMemo(() => loadCatalog(), []);
  const byId = useMemo(() => indexModules(loaded.modules), [loaded.modules]);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [recall, setRecall] = useState<RecallCard[]>([]);
  const [studios, setStudios] = useState<StudioCanvas[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [query, setQuery] = useState("");
  const [continueRef, setContinueRef] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    async (database: IDBDatabase) => {
      const [items, cards, canvases, folders] = await Promise.all([
        listLibrary(database),
        listRecall(database),
        listStudios(database),
        listCollections(database),
      ]);
      const hydrated: LibraryItem[] = [];
      for (const item of items) {
        const next = withBrief(item, loaded.modules);
        if (next !== item) await putLibraryItem(database, next);
        hydrated.push(next);
      }
      setLibrary(hydrated);
      setRecall(cards);
      setStudios(canvases);
      setCollections(folders);
    },
    [loaded.modules],
  );

  useEffect(() => {
    let cancelled = false;
    let database: IDBDatabase | null = null;
    void (async () => {
      try {
        database = await openStudioDb();
        if (cancelled) {
          database.close();
          return;
        }
        await refresh(database);
        const last = await getPref(database, "lastTopic");
        if (cancelled) {
          database.close();
          return;
        }
        setContinueRef(last);
        setDb(database);
      } catch (error) {
        console.error(error);
        if (!cancelled) setNotice("This browser blocked the local desk. Lessons still run; canvases will not persist.");
      }
    })();
    return () => {
      cancelled = true;
      database?.close();
    };
  }, [refresh]);

  const remember = useCallback(
    async (value: string) => {
      setContinueRef(value);
      if (!db) return;
      await setPref(db, "lastTopic", value);
    },
    [db],
  );

  const upsertCanvas = useCallback(
    async (partial: Omit<StudioCanvas, "createdAt" | "updatedAt" | "pinned"> & { pinned?: boolean }) => {
      if (!db) return;
      try {
        const existing = await getStudio(db, partial.id);
        const now = Date.now();
        const canvas: StudioCanvas = {
          pinned: existing?.pinned ?? false,
          createdAt: existing?.createdAt ?? now,
          ...existing,
          ...partial,
          collectionId: partial.collectionId ?? existing?.collectionId,
          updatedAt: now,
        };
        await putStudio(db, canvas);
        await refresh(db);
      } catch (error) {
        console.error(error);
        setNotice("Could not save this canvas to the local desk.");
      }
    },
    [db, refresh],
  );

  const touchLesson = useCallback(
    async (module: StudyModule, step?: string, collectionId?: string) => {
      await remember(`module:${module.id}`);
      await upsertCanvas({
        id: `lesson:${module.id}`,
        kind: "lesson",
        title: module.title,
        moduleId: module.id,
        step,
        collectionId,
      });
    },
    [remember, upsertCanvas],
  );

  const touchPapers = useCallback(
    async (query: string, title?: string, collectionId?: string) => {
      const q = query.trim();
      const id = q ? `papers:${q.toLowerCase()}` : "papers:";
      await upsertCanvas({
        id,
        kind: "papers",
        title: title ?? (q ? `Lookup · ${q}` : "Papers lookup"),
        papersQuery: q,
        collectionId,
      });
    },
    [upsertCanvas],
  );

  const pinStudio = useCallback(
    async (id: string, pinned: boolean) => {
      if (!db) return;
      const existing = await getStudio(db, id);
      if (!existing) return;
      await putStudio(db, { ...existing, pinned, updatedAt: Date.now() });
      await refresh(db);
    },
    [db, refresh],
  );

  const removeStudio = useCallback(
    async (id: string) => {
      if (!db) return;
      await deleteStudio(db, id);
      await refresh(db);
    },
    [db, refresh],
  );

  const hits: SearchHit[] = useMemo(
    () =>
      searchStudio(
        query,
        loaded.modules,
        library.map((item) => ({ id: item.id, name: item.name, text: item.text })),
      ),
    [query, loaded.modules, library],
  );

  const ensureCollection = useCallback(
    async (name: string, existingId?: string) => {
      if (!db) return null;
      if (existingId) {
        const row = await getCollection(db, existingId);
        if (row) {
          const next = { ...row, name: name.trim() || row.name, updatedAt: Date.now() };
          await putCollection(db, next);
          await refresh(db);
          return next;
        }
      }
      const title = name.trim() || "Inbox";
      const match = collections.find((row) => row.name.toLowerCase() === title.toLowerCase());
      if (match) {
        await putCollection(db, { ...match, updatedAt: Date.now() });
        await refresh(db);
        return match;
      }
      const row: Collection = {
        id: crypto.randomUUID(),
        name: title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await putCollection(db, row);
      await refresh(db);
      return row;
    },
    [collections, db, refresh],
  );

  const addFiles = useCallback(
    async (files: File[], opts?: { collectionId?: string; collectionName?: string }) => {
      if (!db) return null;
      setBusy(true);
      try {
        const batch = pickDropFiles(files);
        if (!batch.length) {
          setNotice("Nothing ingestible in that drop (skipped binaries, .git, node_modules).");
          return null;
        }
        const truncated = files.length > batch.length;
        const folder = await ensureCollection(inferCollectionName(batch, opts?.collectionName), opts?.collectionId);
        if (!folder) return null;

        const filed: LibraryItem[] = [];
        const inClass = library.filter((item) => item.collectionId === folder.id);
        for (const file of batch) {
          if (file.size > MAX_FILE_BYTES) {
            setNotice(`${file.name} exceeds the 12 MB studio limit.`);
            continue;
          }
          const rel = relPathOf(file);
          const parsed = await parseDroppedFile(file);
          const mime = mimeForDroppedFile(file);
          const brief = parsed.text.trim() ? composeBrief(parsed.text, loaded.modules) : undefined;
          const prior =
            inClass.find((item) => (item.relPath || item.name) === rel) ??
            filed.find((item) => (item.relPath || item.name) === rel);
          const item: LibraryItem = {
            id: prior?.id ?? crypto.randomUUID(),
            kind: "file",
            name: brief?.title ?? file.name,
            mime,
            size: file.size,
            text: parsed.text,
            parseNote: parsed.parseNote,
            createdAt: prior?.createdAt ?? Date.now(),
            blob: file,
            brief,
            collectionId: folder.id,
            relPath: rel,
          };
          await putLibraryItem(db, item);
          if (!prior) inClass.push(item);
          else {
            const idx = inClass.findIndex((row) => row.id === prior.id);
            if (idx >= 0) inClass[idx] = item;
          }
          filed.push(item);
        }

        const plan = await seedClassStudios(db, folder, filed, loaded.modules, byId);

        await refresh(db);
        const last = filed[filed.length - 1] ?? null;
        if (last) await remember(`library:${last.id}`);
        const bits = [`Filed ${filed.length} note${filed.length === 1 ? "" : "s"} in ${folder.name}`];
        if (plan.moduleIds.length) bits.push(`${plan.moduleIds.length} lesson${plan.moduleIds.length === 1 ? "" : "s"}`);
        if (plan.paperQueries.length) bits.push(`${plan.paperQueries.length} paper lookup${plan.paperQueries.length === 1 ? "" : "s"}`);
        if (truncated) bits.push(`kept ${batch.length} of ${files.length} (skipped binaries/repo junk, cap ${MAX_DROP_FILES})`);
        setNotice(`${bits.join(". ")}. They are on the desk, grouped under the class.`);
        return last;
      } finally {
        setBusy(false);
      }
    },
    [byId, db, ensureCollection, library, loaded.modules, refresh, remember],
  );

  const addNote = useCallback(
    async (raw: string, collectionId?: string) => {
      if (!db || !raw.trim()) return null;
      const body = raw.trim();
      const brief = composeBrief(body, loaded.modules);
      const folder = await ensureCollection(collectionId ? "" : "Inbox", collectionId);
      if (!folder) return null;
      const item: LibraryItem = {
        id: crypto.randomUUID(),
        kind: "note",
        name: brief.title,
        mime: "text/markdown",
        size: body.length,
        text: body,
        parseNote: "Pasted note, stored only in this browser.",
        createdAt: Date.now(),
        brief,
        collectionId: folder.id,
      };
      await putLibraryItem(db, item);
      await remember(`library:${item.id}`);
      await seedClassStudios(db, folder, [item], loaded.modules, byId);
      await refresh(db);
      setNotice(`Note kept in the local library (${folder.name}).`);
      return item;
    },
    [byId, db, ensureCollection, loaded.modules, refresh, remember],
  );

  const removeLibrary = useCallback(
    async (id: string) => {
      if (!db) return;
      await deleteLibraryItem(db, id);
      await deleteStudio(db, `note:${id}`);
      await refresh(db);
      if (continueRef === `library:${id}`) {
        await remember("");
      }
    },
    [continueRef, db, refresh, remember],
  );

  const removeCollection = useCallback(
    async (id: string) => {
      if (!db) return;
      const items = library.filter((item) => item.collectionId === id);
      for (const item of items) {
        await deleteLibraryItem(db, item.id);
        await deleteStudio(db, `note:${item.id}`);
      }
      for (const canvas of studios.filter((row) => row.collectionId === id)) {
        await deleteStudio(db, canvas.id);
      }
      for (const card of recall.filter((row) => row.collectionId === id)) {
        await deleteRecallCard(db, card.id);
      }
      await deleteCollectionRow(db, id);
      await refresh(db);
    },
    [db, library, recall, refresh, studios],
  );

  const missCheck = useCallback(
    async (moduleId: string, item: CheckItem) => {
      if (!db) return;
      const seed = recallFromMiss(moduleId, item);
      const fromClass = studios.find((row) => row.kind === "lesson" && row.moduleId === moduleId)?.collectionId;
      const existing = recall.find(
        (card) =>
          card.moduleId === moduleId &&
          card.checkId === item.id &&
          (fromClass ? card.collectionId === fromClass : true),
      );
      const card: RecallCard = existing
        ? { ...existing, misses: existing.misses + 1, lastMissedAt: Date.now(), prompt: item.prompt }
        : {
            id: crypto.randomUUID(),
            ...seed,
            createdAt: Date.now(),
            misses: 1,
            lastMissedAt: Date.now(),
            collectionId: fromClass,
          };
      await putRecallCard(db, card);
      await refresh(db);
    },
    [db, recall, refresh, studios],
  );

  const bumpRecall = useCallback(
    async (id: string) => {
      if (!db) return;
      const existing = recall.find((card) => card.id === id);
      if (!existing) return;
      await putRecallCard(db, { ...existing, misses: existing.misses + 1, lastMissedAt: Date.now() });
      await refresh(db);
    },
    [db, recall, refresh],
  );

  const clearRecall = useCallback(
    async (id: string) => {
      if (!db) return;
      await deleteRecallCard(db, id);
      await refresh(db);
    },
    [db, refresh],
  );

  const continueModule: StudyModule | null = continueRef?.startsWith("module:")
    ? (byId.get(continueRef.slice(7)) ?? null)
    : null;
  const continueNote: LibraryItem | null = continueRef?.startsWith("library:")
    ? (library.find((item) => item.id === continueRef.slice(8)) ?? null)
    : null;

  return {
    modules: loaded.modules,
    errors: loaded.errors,
    byId,
    library,
    recall,
    query,
    setQuery,
    hits,
    notice,
    setNotice,
    busy,
    addFiles,
    addNote,
    removeLibrary,
    removeCollection,
    ensureCollection,
    missCheck,
    bumpRecall,
    clearRecall,
    remember,
    touchLesson,
    touchPapers,
    pinStudio,
    removeStudio,
    studios,
    collections,
    continueModule,
    continueNote,
    ready: Boolean(db),
  };
}

export type StudioApi = ReturnType<typeof useStudio>;
