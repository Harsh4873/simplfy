import { useRef, type DragEvent, type FormEvent } from "react";
import { FieldNoteDoc } from "../studio/FieldNoteDoc";
import { folderOf } from "../library/ingest";
import { filesFromDataTransfer } from "../library/drop";
import { relatedForLibraryItem } from "../library/fieldNote";
import { isLessonStep, libraryNoteRoute, type Route } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import type { LibraryItem } from "../library/db";
import { cx } from "../ui/cx";

function groupFiles(items: LibraryItem[]) {
  const groups = new Map<string, LibraryItem[]>();
  for (const item of items) {
    const folder = folderOf(item.relPath ?? item.name);
    const list = groups.get(folder) ?? [];
    list.push(item);
    groups.set(folder, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
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

  const ingest = async (files: File[]) => {
    const last = await api.addFiles(files, {
      collectionId: collection?.id,
      collectionName: typedName() || collection?.name,
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
    const spawned = api.studios.filter((row) => row.collectionId === collection.id && row.kind !== "class");
    const lessons = spawned.filter((row) => row.kind === "lesson");
    const papers = spawned.filter((row) => row.kind === "papers");
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
          <div className={cx("drop", api.busy && "is-busy")} {...dropProps}>
            <p>Drop more lecture notes into this class.</p>
            <p className="hint">Folders keep their subpaths (week1/tnseq.md).</p>
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
                void ingest([...(event.target.files ?? [])]);
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
                void ingest([...(event.target.files ?? [])]);
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
          <p className="kicker">Files</p>
          {classItems.length === 0 ? (
            <p className="hint">Empty class. Drop a folder of notes.</p>
          ) : (
            folders.map(([folder, items]) => (
              <div key={folder || "(root)"} className="class-folder">
                {folder ? <p className="muted">{folder}/</p> : null}
                <ul className="lib-list">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="lib-item"
                        onClick={() => navigate(libraryNoteRoute(item.id, collection.id))}
                      >
                        <span>{item.name}</span>
                        <span className="muted">{item.relPath?.split("/").pop() || item.mime}</span>
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => void api.removeLibrary(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </aside>
        <div className="notes-stage">
          <p className="kicker">Class</p>
          <h1>{collection.name}</h1>
          <p className="lede">
            A class is a folder: lecture markdown, a repo slice, PDFs. We keep the files, open a note
            canvas for each, then spin lesson and papers canvases from genes and plates those notes
            mention. That is how a pile of notes becomes a desk instead of one lonely markdown file.
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
            <h2 className="section-title">Studios from these notes</h2>
            {spawned.length === 0 ? (
              <p className="hint">Drop files with genes, tests, or catalogue terms and canvases will appear.</p>
            ) : (
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
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page notes-page">
      <aside className="notes-rail">
        <p className="kicker">Classes</p>
        {api.collections.length === 0 ? (
          <p className="hint">No classes yet. Name one, or drop a folder and the folder name becomes the class.</p>
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
          Name the class (STAT 651, Ioerger lab, host immunology). Drop the whole lecture folder or a
          slice of a repo. Each markdown/PDF becomes a note canvas; matching catalogue plates and
          genes become lessons and paper lookups on the desk, grouped under that class — not one
          global deck.
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
          <p>Drop a folder of lecture notes, a repo directory, or a bunch of markdown files.</p>
          <p className="hint">
            Skips .git, node_modules, images. First 80 files. Folder name is the class if you left the
            name blank.
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
              void ingest([...(event.target.files ?? [])]);
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
              void ingest([...(event.target.files ?? [])]);
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
