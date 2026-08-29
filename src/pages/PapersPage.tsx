import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { PapersBoard } from "../papers/PapersBoard";
import { libraryNoteRoute, type Route } from "../app/routes";
import { filesFromDataTransfer } from "../library/drop";
import { isPaperItem } from "../library/paperText";
import type { StudioApi } from "../studio/useStudio";
import { cx } from "../ui/cx";
import { SourceCard } from "./SourceCard";

export function PapersPage({
  api,
  q,
  navigate,
}: {
  api: StudioApi;
  q?: string;
  navigate: (route: Route) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(q ?? "");

  useEffect(() => {
    setDraft(q ?? "");
  }, [q]);

  useEffect(() => {
    if (!api.ready || !q?.trim()) return;
    void api.touchPapers(q, `Lookup · ${q}`);
  }, [api.ready, api.touchPapers, q]);

  const filed = api.studios.filter((canvas) => {
    if (canvas.kind !== "note" || !canvas.noteId || canvas.collectionId) return false;
    const item = api.library.find((row) => row.id === canvas.noteId);
    return item ? isPaperItem(item) : false;
  });
  const lookups = api.studios.filter((canvas) => canvas.kind === "papers" && Boolean(canvas.papersQuery));

  const ingest = async (files: File[]) => {
    const last = await api.addFiles(files, { intent: "paper" });
    if (last) navigate(libraryNoteRoute(last.id, last.collectionId));
  };

  const onPaste = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("note") ?? "");
    const item = await api.addNote(body, undefined, "paper");
    form.reset();
    if (item) navigate(libraryNoteRoute(item.id, item.collectionId));
  };

  const onLookup = (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    navigate({ name: "papers", q: next || undefined });
  };

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Sources</p>
        <h1>Papers</h1>
        <p className="lede">
          Drop a PDF with a text layer, or paste markdown of a paper. Filed papers live in this
          list. The gene/drug lookup below is the bundled catalogue, not your files, and a folder
          pack belongs on Classes.
        </p>
      </header>
      <form className="paste" onSubmit={(event) => void onPaste(event)}>
        <label htmlFor="paper-note">Paste markdown text of a paper</label>
        <textarea
          id="paper-note"
          name="note"
          rows={5}
          placeholder="Title, Abstract, Introduction…"
        />
        <button type="submit" className="solid" disabled={!api.ready}>
          File in the studio
        </button>
      </form>
      <div
        className={cx("drop drop-large", api.busy && "is-busy")}
        onDragOver={(event: DragEvent) => event.preventDefault()}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          void filesFromDataTransfer(event.dataTransfer).then((files) => ingest(files));
        }}
      >
        <p>Drop a PDF or a markdown file of a paper.</p>
        <p className="hint">Image-only scans store the blob but cannot cut cards. Folder packs go under Classes.</p>
        <button type="button" className="solid" onClick={() => fileRef.current?.click()} disabled={!api.ready}>
          Choose files
        </button>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          multiple
          accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
          aria-label="Choose paper files"
          onChange={(event) => {
            void ingest([...(event.target.files ?? [])]);
            event.currentTarget.value = "";
          }}
        />
      </div>
      {filed.length ? (
        <ul className="desk-grid">
          {filed.map((canvas) => (
            <SourceCard key={canvas.id} canvas={canvas} api={api} navigate={navigate} />
          ))}
        </ul>
      ) : (
        <p className="hint">No filed papers yet. A PDF or Abstract/Introduction paste shows up here.</p>
      )}
      <section>
        <h2 className="section-title">Catalogue lookup</h2>
        <p className="lede">
          Type a gene, a drug, a method. Matches from the local shelf come out in lab order: Ioerger,
          then people he writes with, then the TB field, then explainers. Not a live PubMed crawl.
        </p>
        {lookups.length ? (
          <ul className="desk-grid">
            {lookups.map((canvas) => (
              <SourceCard key={canvas.id} canvas={canvas} api={api} navigate={navigate} />
            ))}
          </ul>
        ) : null}
        <form className="paste lookup-form" onSubmit={onLookup}>
          <label htmlFor="paper-q">Look up a gene, drug, or idea</label>
          <div className="search-row">
            <input
              id="paper-q"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="rpoB, prpD, TnSeq, TRANSIT, granuloma…"
              autoComplete="off"
            />
            <button type="submit" className="solid">
              Look up
            </button>
          </div>
        </form>
        <PapersBoard query={q ?? ""} />
      </section>
    </div>
  );
}
