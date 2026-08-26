import { useEffect, useRef, type FormEvent } from "react";
import { cx } from "../ui/cx";
import type { StudioApi } from "./useStudio";

const SUGGESTIONS = [
  "likelihood ratio test",
  "rifampin",
  "granuloma",
  "hierarchical models",
  "bedaquiline",
  "OLS",
];

export function IntakeRail({ api }: { api: StudioApi }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        searchRef.current?.focus();
        api.setDrawer("intake");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  const onPaste = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = String(data.get("note") ?? "");
    await api.addNote(body);
    form.reset();
  };

  const filtering = Boolean(api.query.trim());
  const shown = filtering ? api.hits.slice(0, 14) : api.hits.slice(0, 8);
  const resultLabel = filtering
    ? `${api.hits.length} match${api.hits.length === 1 ? "" : "es"}`
    : `Cabinet · ${api.modules.length} plates`;

  return (
    <aside className={cx("rail", api.drawer === "intake" && "is-open")} aria-label="Intake">
      <div className="rail-block">
        <p className="kicker">Intake</p>
        <label className="search-label" htmlFor="studio-search">
          Name a term
        </label>
        <div className="search-row">
          <input
            ref={searchRef}
            id="studio-search"
            type="search"
            value={api.query}
            onChange={(event) => api.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") api.openTopHit();
            }}
            placeholder="LRT, rpoB, PZA…"
            autoComplete="off"
          />
          <kbd>/</kbd>
        </div>
        <p className="hint">Hits bundled plates and whatever you have filed locally.</p>
        {!api.query ? (
          <div className="chips" aria-label="Suggested plates">
            {SUGGESTIONS.map((term) => (
              <button
                key={term}
                type="button"
                className="chip"
                onClick={() => {
                  api.setQuery(term);
                }}
              >
                {term}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rail-block">
        <p className="kicker" aria-live="polite">
          {resultLabel}
        </p>
        {filtering && api.hits.length === 0 ? (
          <div className="rail-empty">
            <p>No plates for “{api.query.trim()}”.</p>
            <p className="hint">Try a gene, a drug, a test, or a model.</p>
          </div>
        ) : (
          <ul className="hit-list">
            {shown.map((hit, index) =>
              hit.kind === "module" ? (
                <li key={`m-${hit.module.id}`}>
                  <button
                    type="button"
                    className={cx(
                      "hit",
                      api.topic?.source === "catalog" && api.topic.module.id === hit.module.id && "is-active",
                    )}
                    onClick={() => api.openModule(hit.module)}
                  >
                    <span className="hit-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className={cx("domain", hit.module.domain)}>{hit.module.domain === "tb" ? "TB" : "Stats"}</span>
                    <span className="hit-title">{hit.module.title}</span>
                    <span className="hit-dek">{hit.module.dek}</span>
                    <span className="hit-meta">{hit.module.visual.kind.replaceAll("-", " ")}</span>
                  </button>
                </li>
              ) : (
                <li key={`l-${hit.item.id}`}>
                  <button
                    type="button"
                    className={cx(
                      "hit",
                      api.topic?.source === "library" && api.topic.item.id === hit.item.id && "is-active",
                    )}
                    onClick={() => {
                      const item = api.library.find((row) => row.id === hit.item.id);
                      if (item) api.openLibrary(item);
                    }}
                  >
                    <span className="hit-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="domain library">Local</span>
                    <span className="hit-title">{hit.item.name}</span>
                    <span className="hit-dek">{hit.item.text.slice(0, 140) || "Filed without extractable text."}</span>
                    <span className="hit-meta">field note</span>
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
        {!filtering ? <p className="hint">Type to filter the cabinet.</p> : null}
      </div>

      <div className="rail-block">
        <p className="kicker">File</p>
        <div
          className={cx("drop", api.busy && "is-busy")}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void api.addFiles([...event.dataTransfer.files]);
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
              void api.addFiles([...(event.target.files ?? [])]);
              event.currentTarget.value = "";
            }}
          />
        </div>
        <form className="paste" onSubmit={(event) => void onPaste(event)}>
          <label htmlFor="note">Paste a paragraph</label>
          <textarea id="note" name="note" rows={4} placeholder="Methods, a confusing paragraph, a gene list…" />
          <button type="submit" className="solid" disabled={!api.ready}>
            File in the studio
          </button>
        </form>
      </div>

      <div className="rail-block">
        <p className="kicker">Library</p>
        {api.library.length === 0 ? (
          <div className="rail-empty">
            <p className="empty-line">Nothing filed yet.</p>
            <p className="hint">Notes and drops survive refresh on this device only.</p>
          </div>
        ) : (
          <ul className="lib-list">
            {api.library.map((item) => (
              <li key={item.id}>
                <button type="button" className="lib-item" onClick={() => api.openLibrary(item)}>
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
      </div>
    </aside>
  );
}
