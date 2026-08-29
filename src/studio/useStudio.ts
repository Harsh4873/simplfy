import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { indexModules, loadCatalog } from "../catalog/loadCatalog";
import { searchStudio, type SearchHit } from "../catalog/search";
import type { CheckItem, StudyModule } from "../catalog/types";
import {
  deleteCollectionRow,
  deleteLibraryItem,
  deleteRecallCard,
  deleteStudio,
  getCollection,
  getLibraryItem,
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
import {
  inferCollectionNameFromFiles,
  itemKey,
  looksLikeFolderDrop,
  MAX_DROP_FILES,
  pickDropFiles,
  relPathOf,
  stripGenericRoot,
  titleFromReadme,
} from "../library/ingest";
import { seedClassStudios, seedNoteDeck } from "../library/spawn";
import { MAX_FILE_BYTES, mimeForDroppedFile, parseDroppedFile } from "../library/parse";
import { composeBrief } from "../md/compose";
import { titleFromDroppedText } from "../library/noteCards";
import { libraryKindForSource, looksLikePaperText, paperToMarkdown } from "../library/paperText";
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
  const ingestLock = useRef(Promise.resolve());

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
    async (name: string, existingId?: string, silent = false) => {
      if (!db) return null;
      if (existingId) {
        const row = await getCollection(db, existingId);
        if (row) {
          const next = { ...row, name: name.trim() || row.name, updatedAt: Date.now() };
          await putCollection(db, next);
          if (!silent) await refresh(db);
          return next;
        }
      }
      const title = name.trim() || "Inbox";
      const match = collections.find((row) => row.name.toLowerCase() === title.toLowerCase());
      if (match) {
        await putCollection(db, { ...match, updatedAt: Date.now() });
        if (!silent) await refresh(db);
        return match;
      }
      const row: Collection = {
        id: crypto.randomUUID(),
        name: title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await putCollection(db, row);
      if (!silent) await refresh(db);
      return row;
    },
    [collections, db, refresh],
  );

  const addFiles = useCallback(
    async (
      files: File[],
      opts?: { collectionId?: string; collectionName?: string; replace?: boolean },
    ) => {
      if (!db) return null;
      let release = () => {};
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      const prev = ingestLock.current;
      ingestLock.current = prev.then(() => wait);
      await prev;
      setBusy(true);
      try {
        const batch = pickDropFiles(files);
        if (!batch.length) {
          setNotice("Nothing ingestible in that drop (skipped binaries, .git, node_modules).");
          return null;
        }
        const truncated = files.length > batch.length;
        const replace = opts?.replace ?? looksLikeFolderDrop(batch);
        const typed = opts?.collectionName?.trim() ?? "";
        const folderDrop = replace || looksLikeFolderDrop(batch);
        const standalone = !opts?.collectionId && !typed && !folderDrop;

        if (standalone) {
          const filed: LibraryItem[] = [];
          let noteCards = 0;
          for (const file of batch) {
            if (file.size > MAX_FILE_BYTES) {
              setNotice(`${file.name} exceeds the 12 MB studio limit.`);
              continue;
            }
            const rel = stripGenericRoot(relPathOf(file));
            const parsed = await parseDroppedFile(file);
            const mime = mimeForDroppedFile(file);
            const base = rel.split("/").pop() ?? file.name;
            const kind = libraryKindForSource({ mime, name: base, text: parsed.text });
            const name = parsed.text.trim() ? titleFromDroppedText(parsed.text, base, mime) : base;
            const composed = parsed.text.trim() ? composeBrief(parsed.text, loaded.modules) : undefined;
            const item: LibraryItem = {
              id: crypto.randomUUID(),
              kind,
              name,
              mime,
              size: file.size,
              text: parsed.text,
              parseNote: parsed.parseNote,
              createdAt: Date.now(),
              blob: file,
              brief: composed ? { ...composed, title: name } : undefined,
              relPath: rel,
            };
            await putLibraryItem(db, item);
            noteCards += await seedNoteDeck(db, item);
            filed.push(item);
          }
          await refresh(db);
          const last = filed[filed.length - 1] ?? null;
          if (last) await remember(`library:${last.id}`);
          const papers = filed.filter((row) => row.kind === "paper").length;
          const dumps = filed.length - papers;
          const bits = [
            papers && !dumps
              ? `Filed ${papers} paper deck${papers === 1 ? "" : "s"}`
              : papers
                ? `Filed ${dumps} dump${dumps === 1 ? "" : "s"} and ${papers} paper${papers === 1 ? "" : "s"}`
                : `Filed ${filed.length} deck${filed.length === 1 ? "" : "s"}`,
          ];
          if (noteCards) bits.push(`${noteCards} recall card${noteCards === 1 ? "" : "s"}`);
          bits.push("Study them under Decks");
          if (truncated) bits.push(`kept ${batch.length} of ${files.length} (skipped binaries/repo junk, cap ${MAX_DROP_FILES})`);
          setNotice(`${bits.join(". ")}.`);
          return last;
        }

        const inferred =
          typed ||
          (opts?.collectionId && !replace ? "" : await inferCollectionNameFromFiles(batch, ""));
        const folder = await ensureCollection(inferred, opts?.collectionId, true);
        if (!folder) return null;

        const filed: LibraryItem[] = [];
        const inClass = (await listLibrary(db)).filter((item) => item.collectionId === folder.id);
        for (const file of batch) {
          if (file.size > MAX_FILE_BYTES) {
            setNotice(`${file.name} exceeds the 12 MB studio limit.`);
            continue;
          }
          const rel = stripGenericRoot(relPathOf(file));
          const key = itemKey(rel);
          const parsed = await parseDroppedFile(file);
          const mime = mimeForDroppedFile(file);
          const base = rel.split("/").pop() ?? file.name;
          const heading = parsed.text.trim()
            ? titleFromReadme(parsed.text) || titleFromDroppedText(parsed.text, base, mime)
            : null;
          const composed = parsed.text.trim() ? composeBrief(parsed.text, loaded.modules) : undefined;
          const brief = composed
            ? { ...composed, title: heading || base }
            : undefined;
          const prior =
            inClass.find((item) => itemKey(item.relPath || item.name) === key) ??
            filed.find((item) => itemKey(item.relPath || item.name) === key);
          const kind = libraryKindForSource({ mime, name: base, text: parsed.text });
          const item: LibraryItem = {
            id: prior?.id ?? crypto.randomUUID(),
            kind,
            name: base,
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

        if (replace) {
          const keep = new Set(filed.map((item) => itemKey(item.relPath || item.name)));
          for (const item of [...inClass]) {
            if (keep.has(itemKey(item.relPath || item.name))) continue;
            await deleteLibraryItem(db, item.id);
            await deleteStudio(db, `note:${item.id}`);
            for (const card of await listRecall(db)) {
              if (card.noteId === item.id) await deleteRecallCard(db, card.id);
            }
            const idx = inClass.findIndex((row) => row.id === item.id);
            if (idx >= 0) inClass.splice(idx, 1);
          }
        }

        const classItems = inClass.filter((item) => item.collectionId === folder.id);
        const plan = await seedClassStudios(db, folder, classItems, loaded.modules, byId);

        await refresh(db);
        const last = filed[filed.length - 1] ?? null;
        if (last) await remember(`library:${last.id}`);
        const bits = [
          replace
            ? `Updated ${folder.name} with ${filed.length} file${filed.length === 1 ? "" : "s"}`
            : `Filed ${filed.length} note${filed.length === 1 ? "" : "s"} in ${folder.name}`,
        ];
        if (plan.noteCards) bits.push(`${plan.noteCards} recall card${plan.noteCards === 1 ? "" : "s"} from the notes`);
        if (plan.moduleIds.length) bits.push(`${plan.moduleIds.length} catalogue lesson${plan.moduleIds.length === 1 ? "" : "s"}`);
        if (plan.paperQueries.length) bits.push(`${plan.paperQueries.length} paper lookup${plan.paperQueries.length === 1 ? "" : "s"}`);
        if (truncated) bits.push(`kept ${batch.length} of ${files.length} (skipped binaries/repo junk, cap ${MAX_DROP_FILES})`);
        setNotice(`${bits.join(". ")}.`);
        return last;
      } finally {
        release();
        setBusy(false);
      }
    },
    [byId, db, ensureCollection, loaded.modules, refresh, remember],
  );

  const addNote = useCallback(
    async (raw: string, collectionId?: string) => {
      if (!db || !raw.trim()) return null;
      const incoming = raw.trim();
      const body =
        !/^#{1,3}\s+/m.test(incoming) && looksLikePaperText(incoming) ? paperToMarkdown(incoming) : incoming;
      const name = titleFromDroppedText(body, "Pasted note");
      const kind = libraryKindForSource({ text: body, pasted: true, mime: "text/markdown" });
      const composed = composeBrief(body, loaded.modules);
      const brief = { ...composed, title: name };
      const folder = collectionId ? await ensureCollection("", collectionId, true) : null;
      if (collectionId && !folder) return null;
      const item: LibraryItem = {
        id: crypto.randomUUID(),
        kind,
        name,
        mime: "text/markdown",
        size: body.length,
        text: body,
        parseNote: kind === "paper"
          ? "Pasted paper, stored only in this browser and cut into a study deck."
          : "Pasted note, stored only in this browser.",
        createdAt: Date.now(),
        brief,
        collectionId: folder?.id,
      };
      await putLibraryItem(db, item);
      await remember(`library:${item.id}`);
      const noteCards = await seedNoteDeck(db, item);
      if (folder) {
        const stored = await listLibrary(db);
        const classItems = stored.filter((row) => row.collectionId === folder.id);
        await seedClassStudios(db, folder, classItems, loaded.modules, byId);
      }
      await refresh(db);
      const bits = [
        kind === "paper"
          ? `Paper kept as its own deck${folder ? ` in ${folder.name}` : ""}`
          : `Note kept in the local library${folder ? ` (${folder.name})` : ""}`,
      ];
      if (noteCards) bits.push(`${noteCards} recall card${noteCards === 1 ? "" : "s"} — Study this deck under Decks`);
      setNotice(`${bits.join(". ")}.`);
      return item;
    },
    [byId, db, ensureCollection, loaded.modules, refresh, remember],
  );

  const removeLibrary = useCallback(
    async (id: string) => {
      if (!db) return;
      await deleteLibraryItem(db, id);
      await deleteStudio(db, `note:${id}`);
      for (const card of recall.filter((row) => row.noteId === id)) {
        await deleteRecallCard(db, card.id);
      }
      await refresh(db);
      if (continueRef === `library:${id}`) {
        await remember("");
      }
    },
    [continueRef, db, recall, refresh, remember],
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

  const renameCollection = useCallback(
    async (id: string, name: string) => {
      if (!db) return;
      const title = name.trim();
      if (!title) return;
      const row = await getCollection(db, id);
      if (!row) return;
      await putCollection(db, { ...row, name: title, updatedAt: Date.now() });
      const canvas = await getStudio(db, `class:${id}`);
      if (canvas) await putStudio(db, { ...canvas, title, updatedAt: Date.now() });
      await refresh(db);
      setNotice(`Class renamed to ${title}.`);
    },
    [db, refresh],
  );

  const moveLibrary = useCallback(
    async (id: string, collectionId: string | null) => {
      if (!db) return;
      const item = await getLibraryItem(db, id);
      if (!item) return;
      const fromId = item.collectionId;
      const nextId = collectionId || undefined;
      if (fromId === nextId) return;
      const next: LibraryItem = { ...item, collectionId: nextId };
      await putLibraryItem(db, next);
      await seedNoteDeck(db, next);
      const resync = async (folderId: string | undefined) => {
        if (!folderId) return;
        const folder = await getCollection(db, folderId);
        if (!folder) return;
        const stored = await listLibrary(db);
        const classItems = stored.filter((row) => row.collectionId === folderId);
        await seedClassStudios(db, folder, classItems, loaded.modules, byId);
      };
      if (fromId) await resync(fromId);
      if (nextId) await resync(nextId);
      await refresh(db);
      const folderName = nextId ? (await getCollection(db, nextId))?.name : undefined;
      setNotice(
        folderName
          ? `Filed in ${folderName}. Study it there or as its own deck.`
          : "Detached as its own deck under Decks.",
      );
    },
    [byId, db, loaded.modules, refresh],
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
    renameCollection,
    moveLibrary,
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
