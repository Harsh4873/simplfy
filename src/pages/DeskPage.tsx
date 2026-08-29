import { useRef, type DragEvent, type FormEvent } from "react";
import type { Route } from "../app/routes";
import { libraryNoteRoute } from "../app/routes";
import { filesFromDataTransfer } from "../library/drop";
import { isPaperItem } from "../library/paperText";
import type { StudioApi } from "../studio/useStudio";
import { cx } from "../ui/cx";
import { SourceCard } from "./SourceCard";

export function DeskPage({
  api,
  navigate,
}: {
  api: StudioApi;
  navigate: (route: Route) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const dumps = api.studios.filter((canvas) => {
    if (canvas.kind !== "note" || !canvas.noteId || canvas.collectionId) return false;
    const item = api.library.find((row) => row.id === canvas.noteId);
    return item ? !isPaperItem(item) : true;
  });

  const ingest = async (files: File[]) => {
    const last = await api.addFiles(files, { intent: "deck" });
    if (last) navigate(libraryNoteRoute(last.id, last.collectionId));
  };

  const onPaste = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("note") ?? "");
    const item = await api.addNote(body, undefined, "deck");
    form.reset();
    if (item) navigate(libraryNoteRoute(item.id, item.collectionId));
  };

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Sources</p>
        <h1>Decks</h1>
        <p className="lede">
          Paste a lecture dump or drop markdown / txt. Headings and bold names become flip cards.
          Study opens Learn’s quizlet. Pin to Home. A PDF belongs on Papers; a folder pack belongs
          on Classes.
        </p>
      </header>
      <form className="paste" onSubmit={(event) => void onPaste(event)}>
        <label htmlFor="note">Paste markdown to make a deck</label>
        <textarea id="note" name="note" rows={5} placeholder="Headings and **bold names** become flip cards…" />
        <button type="submit" className="solid" disabled={!api.ready}>
          File in the studio
        </button>
      </form>
      <div
        className={cx("drop", api.busy && "is-busy")}
        onDragOver={(event: DragEvent) => event.preventDefault()}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          void filesFromDataTransfer(event.dataTransfer).then((files) => ingest(files));
        }}
      >
        <p>Drop markdown or text files.</p>
        <p className="hint">Each file is its own deck. Folder packs go under Classes.</p>
        <button type="button" className="ghost" onClick={() => fileRef.current?.click()} disabled={!api.ready}>
          Choose files
        </button>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          multiple
          accept=".md,.markdown,.txt,.tex,text/markdown,text/plain"
          aria-label="Choose files"
          onChange={(event) => {
            void ingest([...(event.target.files ?? [])]);
            event.currentTarget.value = "";
          }}
        />
      </div>
      {dumps.length === 0 ? (
        <p className="lede">No decks yet. Paste above, then Study or pin to Home.</p>
      ) : (
        <ul className="desk-grid">
          {dumps.map((canvas) => (
            <SourceCard key={canvas.id} canvas={canvas} api={api} navigate={navigate} />
          ))}
        </ul>
      )}
    </div>
  );
}
