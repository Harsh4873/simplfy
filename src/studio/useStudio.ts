import { useCallback, useEffect, useMemo, useState } from "react";
import { indexModules, loadCatalog } from "../catalog/loadCatalog";
import { searchStudio, type SearchHit } from "../catalog/search";
import type { StudyModule } from "../catalog/types";
import {
  deleteLibraryItem,
  deleteRecallCard,
  getPref,
  listLibrary,
  listRecall,
  openStudioDb,
  putLibraryItem,
  putRecallCard,
  setPref,
  type LibraryItem,
  type RecallCard,
} from "../library/db";
import { withBrief } from "../library/hydrate";
import { MAX_FILE_BYTES, mimeForDroppedFile, parseDroppedFile } from "../library/parse";
import { composeBrief } from "../md/compose";
import { recallFromMiss } from "../quiz/grade";
import type { CheckItem } from "../catalog/types";
import type { ToolId } from "./tools";

export type { ToolId };
export type DrawerId = "intake" | "dock" | null;

export type Topic =
  | { source: "catalog"; module: StudyModule }
  | { source: "library"; item: LibraryItem };

export function useStudio() {
  const loaded = useMemo(() => loadCatalog(), []);
  const byId = useMemo(() => indexModules(loaded.modules), [loaded.modules]);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [recall, setRecall] = useState<RecallCard[]>([]);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [tool, setTool] = useState<ToolId>("check");
  const [drawer, setDrawer] = useState<DrawerId>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (database: IDBDatabase) => {
    const [items, cards] = await Promise.all([listLibrary(database), listRecall(database)]);
    const hydrated: LibraryItem[] = [];
    for (const item of items) {
      const next = withBrief(item, loaded.modules);
      if (next !== item) await putLibraryItem(database, next);
      hydrated.push(next);
    }
    setLibrary(hydrated);
    setRecall(cards);
  }, [loaded.modules]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const database = await openStudioDb();
      if (cancelled) return;
      await refresh(database);
      const last = await getPref(database, "lastTopic");
      if (cancelled) return;
      if (last?.startsWith("module:")) {
        const module = byId.get(last.slice(7));
        if (module) setTopic({ source: "catalog", module });
      } else if (last?.startsWith("library:")) {
        const items = await listLibrary(database);
        const item = items.find((row) => row.id === last.slice(8));
        if (item) setTopic({ source: "library", item });
      }
      if (!cancelled) setDb(database);
    })();
    return () => {
      cancelled = true;
    };
  }, [byId, refresh]);

  useEffect(() => {
    if (!db || !topic) return;
    const value =
      topic.source === "catalog" ? `module:${topic.module.id}` : `library:${topic.item.id}`;
    void setPref(db, "lastTopic", value);
  }, [db, topic]);

  const hits: SearchHit[] = useMemo(
    () =>
      searchStudio(
        query,
        loaded.modules,
        library.map((item) => ({ id: item.id, name: item.name, text: item.text })),
      ),
    [query, loaded.modules, library],
  );

  const openModule = useCallback(
    (module: StudyModule) => {
      setTopic({ source: "catalog", module });
      setTool("check");
      setDrawer(null);
    },
    [],
  );

  const openLibrary = useCallback((item: LibraryItem) => {
    setTopic({ source: "library", item });
    setTool("map");
    setDrawer(null);
  }, []);

  const openTopHit = useCallback(() => {
    const first = hits[0];
    if (!first) return;
    if (first.kind === "module") openModule(first.module);
    else {
      const item = library.find((row) => row.id === first.item.id);
      if (item) openLibrary(item);
    }
  }, [hits, library, openLibrary, openModule]);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!db) return;
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
        if (last) openLibrary(last);
        setNotice(last ? `Filed ${last.name} in the local library.` : null);
      } finally {
        setBusy(false);
      }
    },
    [db, loaded.modules, openLibrary, refresh],
  );

  const addNote = useCallback(
    async (raw: string) => {
      if (!db || !raw.trim()) return;
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
      openLibrary(item);
      setNotice("Note kept in the local library.");
    },
    [db, loaded.modules, openLibrary, refresh],
  );

  const removeLibrary = useCallback(
    async (id: string) => {
      if (!db) return;
      await deleteLibraryItem(db, id);
      await refresh(db);
      if (topic?.source === "library" && topic.item.id === id) setTopic(null);
    },
    [db, refresh, topic],
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

  const clearRecall = useCallback(
    async (id: string) => {
      if (!db) return;
      await deleteRecallCard(db, id);
      await refresh(db);
    },
    [db, refresh],
  );

  return {
    modules: loaded.modules,
    errors: loaded.errors,
    byId,
    library,
    recall,
    query,
    setQuery,
    hits,
    topic,
    openModule,
    openLibrary,
    openTopHit,
    tool,
    setTool,
    drawer,
    setDrawer,
    notice,
    setNotice,
    busy,
    addFiles,
    addNote,
    removeLibrary,
    missCheck,
    clearRecall,
    ready: Boolean(db),
  };
}

export type StudioApi = ReturnType<typeof useStudio>;
