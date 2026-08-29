import { useRef, type DragEvent, type FormEvent } from "react";
import { FieldNoteDoc } from "../studio/FieldNoteDoc";
import { folderOf, looksLikeFolderDrop, packFileRank } from "../library/ingest";
import { filesFromDataTransfer } from "../library/drop";
import { relatedForLibraryItem } from "../library/fieldNote";
import { isLessonStep, libraryNoteRoute, type Route } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import type { LibraryItem } from "../library/db";
import { cx } from "../ui/cx";

function sortPackFiles(items: LibraryItem[]) {
  return [...items].sort((a, b) => {
    const relA = a.relPath ?? a.name;
    const relB = b.relPath ?? b.name;
    return packFileRank(relA) - packFileRank(relB) || relA.localeCompare(relB);
  });
}

function groupFiles(items: LibraryItem[]) {
  const groups = new Map<string, LibraryItem[]>();
  for (const item of sortPackFiles(items)) {
    const folder = folderOf(item.relPath ?? item.name);
    const list = groups.get(folder) ?? [];
    list.push(item);
    groups.set(folder, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function fileLabel(item: LibraryItem) {
  return item.relPath?.split("/").pop() || item.name;
}

export function NotesPage({
  api,
  id,
  classId,
  navigate,
}: {
  api: StudioApi;
  id?: string;
  classId?: string;
  navigate: (route: Route) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const collection = classId ? api.collections.find((row) => row.id === classId) : undefined;
  const file =
    id && collection
      ? api.library.find((item) => item.id === id)
      : id
        ? api.library.find((item) => item.id === id)
        : undefined;
  const classItems = collection ? api.library.filter((item) => item.collectionId === collection.id) : [];
  const related = file ? relatedForLibraryItem(file, api.modules) : [];

  const typedName = () => nameRef.current?.value ?? "";

  const ingest = async (files: File[], replace?: boolean) => {
    const last = await api.addFiles(files, {
      collectionId: collection?.id,
      collectionName: typedName(),
      replace: replace ?? looksLikeFolderDrop(files),
    });
    if (last?.collectionId) {
      navigate({ name: "notes", classId: last.collectionId });
      return;
    }
    if (collection) navigate({ name: "notes", classId: collection.id });
  };

  const onPaste = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = String(data.get("note") ?? "");
    const item = await api.addNote(body, collection?.id);
    form.reset();
    if (item) navigate(libraryNoteRoute(item.id, item.collectionId));
  };

  const dropProps = {
    onDragOver: (event: DragEvent) => event.preventDefault(),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      void (async () => {
        const files = await filesFromDataTransfer(event.dataTransfer);
        await ingest(files);
      })();
    },
  };

  if (file) {
    return (
      <div className="page notes-page">
        <aside className="notes-rail">
          <p className="kicker">
            <button
              type="button"
              className="text-btn"
              onClick={() =>
                navigate(file.collectionId ? { name: "notes", classId: file.collectionId } : { name: "notes" })
              }
            >
              ← {collection?.name ?? "Classes"}
            </button>
          </p>
          <p className="muted">{file.relPath || file.name}</p>
        </aside>
        <div className="notes-stage">
          <FieldNoteDoc
            item={file}
            modules={api.modules}
            onOpen={(module) => {
              void api.touchLesson(module, "teach", file.collectionId);
              navigate({ name: "learn", id: module.id, step: "teach" });
            }}
          />
          {related.length ? (
            <section className="related">
              <p className="kicker">Nearby lessons</p>
              <ul className="map-list">
                {related.map((module) => (
                  <li key={module.id}>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => {
                        void api.touchLesson(module, "teach", file.collectionId);
                        navigate({ name: "learn", id: module.id, step: "teach" });
                      }}
                    >
                      Start {module.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    );
  }

  if (collection) {
    const lessons = api.studios.filter((row) => row.collectionId === collection.id && row.kind === "lesson");
    const papers = api.studios.filter((row) => row.collectionId === collection.id && row.kind === "papers");
    const noteDeck = api.recall.filter((card) => card.collectionId === collection.id && card.noteId);
    const folders = groupFiles(classItems);
    return (
      <div className="page notes-page">
        <aside className="notes-rail">
          <p className="kicker">
            <button type="button" className="text-btn" onClick={() => navigate({ name: "notes" })}>
              ← All classes
            </button>
          </p>
          <h2 className="section-title">{collection.name}</h2>
          <form
            className="paste"
            onSubmit={(event) => {
              event.preventDefault();
              const name = String(new FormData(event.currentTarget).get("name") ?? "");
              void api.renameCollection(collection.id, name);
            }}
          >
            <label htmlFor="rename-class">Rename class</label>
            <div className="search-row">
              <input id="rename-class" name="name" defaultValue={collection.name} key={collection.name} autoComplete="off" />
              <button type="submit" className="ghost" disabled={!api.ready}>
                Save name
              </button>
            </div>
          </form>
          <div className={cx("drop", api.busy && "is-busy")} {...dropProps}>
            <p>Drop an update folder to replace these files and rebuild the deck.</p>
            <p className="hint">Add files merges. Add folder / drop a directory replaces this class with that pack.</p>
            <div className="step-nav">
              <button type="button" className="text-btn" onClick={() => fileRef.current?.click()} disabled={!api.ready}>
                Add files
              </button>
              <button type="button" className="text-btn" onClick={() => folderRef.current?.click()} disabled={!api.ready}>
                Add folder
              </button>
            </div>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              multiple
              aria-label="Choose files"
              onChange={(event) => {
                void ingest([...(event.target.files ?? [])], false);
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={folderRef}
              className="sr-only"
              type="file"
              multiple
              aria-label="Choose folder"
              // @ts-expect-error webkitdirectory is the folder picker
              webkitdirectory=""
              onChange={(event) => {
                void ingest([...(event.target.files ?? [])], true);
                event.currentTarget.value = "";
              }}
            />
          </div>
          <form className="paste" onSubmit={(event) => void onPaste(event)}>
            <label htmlFor="note">Paste a paragraph into this class</label>
            <textarea id="note" name="note" rows={4} placeholder="A confusing paragraph from lecture…" />
            <button type="submit" className="solid" disabled={!api.ready}>
              File in the studio
            </button>
          </form>
          <p className="kicker">Files in this pack</p>
          {classItems.length === 0 ? (
            <p className="hint">Empty class. Drop a folder of notes.</p>
          ) : (
            folders.map(([folder, items]) => (
              <div key={folder || "(root)"} className="class-folder">
                {folder ? <p className="muted">{folder}/</p> : null}
                <ul className="lib-list">
                  {items.map((item) => {
                    const label = fileLabel(item);
                    const subtitle =
                      item.brief?.title && item.brief.title.toLowerCase() !== label.toLowerCase()
                        ? item.brief.title
                        : item.mime;
                    return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="lib-item"
                        onClick={() => navigate(libraryNoteRoute(item.id, collection.id))}
                      >
                        <span>{label}</span>
                        <span className="muted">{subtitle}</span>
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => void api.removeLibrary(item.id)}
                        aria-label={`Remove ${label}`}
                      >
                        Remove
                      </button>
                    </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </aside>
        <div className="notes-stage">
          <p className="kicker">Class</p>
          <h1>{collection.name}</h1>
          <p className="lede">
            This class is the files you dropped. An update folder replaces the previous pack
            (leftovers and snapshots are dropped) and rebuilds the recall deck from those notes —
            last-class, deadlines, todos — not a pile of unrelated catalogue plates.
          </p>
          <div className="step-nav">
            <button type="button" className="solid" onClick={() => navigate({ name: "desk" })}>
              Open desk
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => navigate({ name: "recall", classId: collection.id })}
            >
              Recall this class
            </button>
            <button
              type="button"
              className="ghost danger"
              onClick={() => {
                void (async () => {
                  await api.removeCollection(collection.id);
                  navigate({ name: "notes" });
                })();
              }}
            >
              Remove class
            </button>
          </div>
          <section>
            <h2 className="section-title">This pack</h2>
            {classItems.length === 0 ? (
              <p className="hint">No files yet. Drop the update folder for this class.</p>
            ) : (
              <ul className="map-list">
                {sortPackFiles(classItems).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => navigate(libraryNoteRoute(item.id, collection.id))}
                    >
                      {fileLabel(item)}
                    </button>
                    {item.brief?.title && item.brief.title !== fileLabel(item) ? (
                      <span className="muted"> — {item.brief.title}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="section-title">Deck from these notes</h2>
            {noteDeck.length === 0 ? (
              <p className="hint">Drop a markdown pack and we cut recall cards from headings, tables, and todos in those files.</p>
            ) : (
              <p className="lede">
                {noteDeck.length} card{noteDeck.length === 1 ? "" : "s"} built from this class’s files.{" "}
                <button type="button" className="text-btn" onClick={() => navigate({ name: "recall", classId: collection.id })}>
                  Recall this class
                </button>
              </p>
            )}
          </section>
          {lessons.length || papers.length ? (
          <section>
            <h2 className="section-title">Catalogue plates these notes name</h2>
              <ul className="desk-grid">
                {lessons.map((canvas) => (
                  <li key={canvas.id} className="desk-card">
                    <button
                      type="button"
                      className="desk-open"
                      onClick={() => {
                        if (canvas.moduleId) {
                          const step = canvas.step && isLessonStep(canvas.step) ? canvas.step : "teach";
                          navigate({ name: "learn", id: canvas.moduleId, step });
                        }
                      }}
                    >
                      <span className="kicker">Lesson</span>
                      <span className="hit-title">{canvas.title}</span>
                    </button>
                  </li>
                ))}
                {papers.map((canvas) => (
                  <li key={canvas.id} className="desk-card">
                    <button
                      type="button"
                      className="desk-open"
                      onClick={() => navigate({ name: "papers", q: canvas.papersQuery })}
                    >
                      <span className="kicker">Papers</span>
                      <span className="hit-title">{canvas.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
          </section>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page notes-page">
      <aside className="notes-rail">
        <p className="kicker">Classes</p>
        {api.collections.length === 0 ? (
          <p className="hint">No classes yet. Name one, or drop an update folder — README title or folder name becomes the class.</p>
        ) : (
          <ul className="lib-list">
            {api.collections.map((row) => {
              const count = api.library.filter((item) => item.collectionId === row.id).length;
              return (
                <li key={row.id}>
                  <button type="button" className="lib-item" onClick={() => navigate({ name: "notes", classId: row.id })}>
                    <span>{row.name}</span>
                    <span className="muted">
                      {count} file{count === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      <div className="notes-stage">
        <p className="kicker">Topic / class folders</p>
        <h1>Drop a pile, not one file</h1>
        <p className="lede">
          Name the class, or drop an update folder. A folder named “update” still becomes the course
          on the README title (CSCE 627, STAT 651). That drop <em>is</em> the class: we replace the
          previous pack, keep those files, and cut a recall deck from the notes — not a pile of
          unrelated catalogue plates.
        </p>
        <form
          className="paste"
          onSubmit={(event) => {
            event.preventDefault();
            const name = typedName().trim();
            if (!name) return;
            void (async () => {
              const row = await api.ensureCollection(name);
              if (row) navigate({ name: "notes", classId: row.id });
            })();
          }}
        >
          <label htmlFor="class-name">Name this class</label>
          <div className="search-row">
            <input ref={nameRef} id="class-name" placeholder="STAT 651, TB methods, …" autoComplete="off" />
            <button type="submit" className="ghost" disabled={!api.ready}>
              Open empty class
            </button>
          </div>
        </form>
        <div className={cx("drop drop-large", api.busy && "is-busy")} {...dropProps}>
          <p>Drop a folder of lecture notes or an update pack.</p>
          <p className="hint">
            Skips .git, node_modules, images. First 80 files. Generic folder names like “update”
            use the README heading. Dropping a folder replaces that class’s files.
          </p>
          <div className="step-nav">
            <button type="button" className="solid" onClick={() => folderRef.current?.click()} disabled={!api.ready}>
              Choose folder
            </button>
            <button type="button" className="ghost" onClick={() => fileRef.current?.click()} disabled={!api.ready}>
              Choose files
            </button>
          </div>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            multiple
            aria-label="Choose files"
            onChange={(event) => {
              void ingest([...(event.target.files ?? [])], false);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={folderRef}
            className="sr-only"
            type="file"
            multiple
            aria-label="Choose folder"
            // @ts-expect-error webkitdirectory is the folder picker
            webkitdirectory=""
            onChange={(event) => {
              void ingest([...(event.target.files ?? [])], true);
              event.currentTarget.value = "";
            }}
          />
        </div>
        <form className="paste" onSubmit={(event) => void onPaste(event)}>
          <label htmlFor="note">Paste a paragraph into Inbox</label>
          <textarea id="note" name="note" rows={5} placeholder="Methods, a confusing paragraph, a gene list…" />
          <button type="submit" className="solid" disabled={!api.ready}>
            File in the studio
          </button>
        </form>
      </div>
    </div>
  );
}
