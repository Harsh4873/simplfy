import { useCallback, useEffect, useMemo, useState } from "react";
import { indexModules, loadCatalog } from "../catalog/loadCatalog";
import { searchStudio, type SearchHit } from "../catalog/search";
import type { CheckItem, StudyModule } from "../catalog/types";
import {
  deleteLibraryItem,
  deleteRecallCard,
  deleteStudio,
  getPref,
  getStudio,
  listLibrary,
  listRecall,
  listStudios,
  openStudioDb,
  putLibraryItem,
  putRecallCard,
  putStudio,
  setPref,
  type LibraryItem,
  type RecallCard,
  type StudioCanvas,
} from "../library/db";
import { withBrief } from "../library/hydrate";
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
  const [query, setQuery] = useState("");
  const [continueRef, setContinueRef] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    async (database: IDBDatabase) => {
      const [items, cards, canvases] = await Promise.all([
        listLibrary(database),
        listRecall(database),
        listStudios(database),
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
    async (module: StudyModule, step?: string) => {
      await remember(`module:${module.id}`);
      await upsertCanvas({
        id: `lesson:${module.id}`,
        kind: "lesson",
        title: module.title,
        moduleId: module.id,
        step,
      });
    },
    [remember, upsertCanvas],
  );

  const touchPapers = useCallback(
    async (query: string, title?: string) => {
      const q = query.trim();
      const id = q ? `papers:${q.toLowerCase()}` : "papers:";
      await upsertCanvas({
        id,
        kind: "papers",
        title: title ?? (q ? `Lookup · ${q}` : "Papers lookup"),
        papersQuery: q,
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

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!db) return null;
      setBusy(true);
      try {
        let last: LibraryItem | null = null;
        for (const file of files) {
          if (file.size > MAX_FILE_BYTES) {
            setNotice(`${file.name} exceeds the 12 MB studio limit.`);
            continue;
          }
          const parsed = await parseDroppedFile(file);
          const mime = mimeForDroppedFile(file);
          const brief = parsed.text.trim() ? composeBrief(parsed.text, loaded.modules) : undefined;
          const item: LibraryItem = {
            id: crypto.randomUUID(),
            kind: "file",
            name: brief?.title ?? file.name,
            mime,
            size: file.size,
            text: parsed.text,
            parseNote: parsed.parseNote,
            createdAt: Date.now(),
            blob: file,
            brief,
          };
          await putLibraryItem(db, item);
          last = item;
        }
        await refresh(db);
        if (last) {
          await remember(`library:${last.id}`);
          await upsertCanvas({
            id: `note:${last.id}`,
            kind: "note",
            title: last.name,
            noteId: last.id,
          });
          setNotice(`Filed ${last.name} in the local library.`);
        }
        return last;
      } finally {
        setBusy(false);
      }
    },
    [db, loaded.modules, refresh, remember, upsertCanvas],
  );

  const addNote = useCallback(
    async (raw: string) => {
      if (!db || !raw.trim()) return null;
      const body = raw.trim();
      const brief = composeBrief(body, loaded.modules);
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
      };
      await putLibraryItem(db, item);
      await refresh(db);
      await remember(`library:${item.id}`);
      await upsertCanvas({
        id: `note:${item.id}`,
        kind: "note",
        title: item.name,
        noteId: item.id,
      });
      setNotice("Note kept in the local library.");
      return item;
    },
    [db, loaded.modules, refresh, remember, upsertCanvas],
  );

  const removeLibrary = useCallback(
    async (id: string) => {
      if (!db) return;
      await deleteLibraryItem(db, id);
      await refresh(db);
      if (continueRef === `library:${id}`) {
        await remember("");
      }
    },
    [continueRef, db, refresh, remember],
  );

  const missCheck = useCallback(
    async (moduleId: string, item: CheckItem) => {
      if (!db) return;
      const seed = recallFromMiss(moduleId, item);
      const existing = recall.find((card) => card.moduleId === moduleId && card.checkId === item.id);
      const card: RecallCard = existing
        ? { ...existing, misses: existing.misses + 1, lastMissedAt: Date.now(), prompt: item.prompt }
        : {
            id: crypto.randomUUID(),
            ...seed,
            createdAt: Date.now(),
            misses: 1,
            lastMissedAt: Date.now(),
          };
      await putRecallCard(db, card);
      await refresh(db);
    },
    [db, recall, refresh],
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
    missCheck,
    bumpRecall,
    clearRecall,
    remember,
    touchLesson,
    touchPapers,
    pinStudio,
    removeStudio,
    studios,
    continueModule,
    continueNote,
    ready: Boolean(db),
  };
}

export type StudioApi = ReturnType<typeof useStudio>;
