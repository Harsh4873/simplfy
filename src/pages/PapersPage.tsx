import { useEffect, useState, type FormEvent } from "react";
import { PapersBoard } from "../papers/PapersBoard";
import type { Route } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";

export function PapersPage({
  api,
  q,
  navigate,
}: {
  api: StudioApi;
  q?: string;
  navigate: (route: Route) => void;
}) {
  const [draft, setDraft] = useState(q ?? "");

  useEffect(() => {
    setDraft(q ?? "");
  }, [q]);

  useEffect(() => {
    if (!api.ready) return;
    void api.touchPapers(q ?? "", q ? `Lookup · ${q}` : "Papers lookup");
  }, [api.ready, api.touchPapers, q]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    navigate({ name: "papers", q: next || undefined });
  };

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Gene / topic lookup</p>
        <h1>Papers</h1>
        <p className="lede">
          Type a gene, a drug, a method. Matches from the local shelf come out in lab order: Ioerger,
          then people he writes with, then the TB field, then other papers, then explainers. Empty
          rings stay hidden. Nothing here is a live PubMed crawl — Look further still opens PubMed
          and Scholar with that same preference baked into the query.
        </p>
        <form className="paste lookup-form" onSubmit={onSubmit}>
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
      </header>
      <PapersBoard query={q ?? ""} />
    </div>
  );
}
