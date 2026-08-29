import { useRef, type FormEvent } from "react";
import { FieldNoteDoc } from "../studio/FieldNoteDoc";
import { relatedForLibraryItem } from "../library/fieldNote";
import type { Route } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import { cx } from "../ui/cx";

export function NotesPage({
  api,
  id,
  navigate,
}: {
  api: StudioApi;
  id?: string;
  navigate: (route: Route) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = id ? api.library.find((item) => item.id === id) : api.library[0];
  const related = selected ? relatedForLibraryItem(selected, api.modules) : [];

  const onPaste = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = String(data.get("note") ?? "");
    const item = await api.addNote(body);
    form.reset();
    if (item) navigate({ name: "notes", id: item.id });
  };

  return (
    <div className="page notes-page">
      <aside className="notes-rail">
        <p className="kicker">File</p>
        <div
          className={cx("drop", api.busy && "is-busy")}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void (async () => {
              const last = await api.addFiles([...event.dataTransfer.files]);
              if (last) navigate({ name: "notes", id: last.id });
            })();
          }}
        >
          <p>Drop PDFs, notes, tables.</p>
          <p className="hint">Text is extracted in-browser when the file allows it. Blobs stay in IndexedDB.</p>
          <button type="button" className="text-btn" onClick={() => fileRef.current?.click()} disabled={!api.ready}>
            Choose files
          </button>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            multiple
            onChange={(event) => {
              void (async () => {
                const last = await api.addFiles([...(event.target.files ?? [])]);
                if (last) navigate({ name: "notes", id: last.id });
              })();
              event.currentTarget.value = "";
            }}
          />
        </div>
        <form className="paste" onSubmit={(event) => void onPaste(event)}>
          <label htmlFor="note">Paste a paragraph</label>
          <textarea id="note" name="note" rows={5} placeholder="Methods, a confusing paragraph, a gene list…" />
          <button type="submit" className="solid" disabled={!api.ready}>
            File in the studio
          </button>
        </form>
        <p className="kicker">Library</p>
        {api.library.length === 0 ? (
          <p className="hint">Nothing filed yet. Notes survive refresh on this device only.</p>
        ) : (
          <ul className="lib-list">
            {api.library.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cx("lib-item", selected?.id === item.id && "is-active")}
                  onClick={() => navigate({ name: "notes", id: item.id })}
                >
                  <span>{item.name}</span>
                  <span className="muted">{item.kind === "note" ? "note" : item.mime || "file"}</span>
                </button>
                <button type="button" className="ghost danger" onClick={() => void api.removeLibrary(item.id)} aria-label={`Remove ${item.name}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <div className="notes-stage">
        {selected ? (
          <>
            <FieldNoteDoc
              item={selected}
              modules={api.modules}
              onOpen={(module) => {
                void api.touchLesson(module, "teach");
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
                          void api.touchLesson(module, "teach");
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
          </>
        ) : (
          <div className="stage-empty">
            <p className="kicker">Field notes</p>
            <h1>Nothing on the desk</h1>
            <p className="dek">
              Paste a paragraph or drop a file. The studio will strip paths, highlight genes and
              tests, and point you at the nearest lesson.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
