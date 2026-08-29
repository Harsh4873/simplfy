import { useMemo, useState } from "react";
import type { Domain, StudyModule } from "../catalog/types";
import type { Route } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import { ModuleCard } from "./ModuleCard";
import { VisualPlate } from "../visuals/VisualPlate";
import { lessonFromModule } from "../lesson/fromModule";
import { cx } from "../ui/cx";

export function ShelfPage({
  api,
  id,
  navigate,
}: {
  api: StudioApi;
  id?: string;
  navigate: (route: Route) => void;
}) {
  const [domain, setDomain] = useState<Domain | "all">("all");
  const selected = id ? api.byId.get(id) : null;

  const list = useMemo(() => {
    const base = domain === "all" ? api.modules : api.modules.filter((module) => module.domain === domain);
    const q = api.query.trim().toLowerCase();
    if (!q) return base;
    return api.hits
      .flatMap((hit) => (hit.kind === "module" ? [hit.module] : []))
      .filter((row) => domain === "all" || row.domain === domain);
  }, [api.hits, api.modules, api.query, domain]);

  const open = (module: StudyModule) => {
    void api.touchLesson(module, "teach");
    navigate({ name: "shelf", id: module.id });
  };

  const start = (module: StudyModule) => {
    void api.touchLesson(module, "teach");
    navigate({ name: "learn", id: module.id, step: "teach" });
  };

  if (selected) {
    const lesson = lessonFromModule(selected);
    return (
      <div className="page shelf-detail">
        <p className="kicker">
          <button type="button" className="text-btn" onClick={() => navigate({ name: "shelf" })}>
            ← All plates
          </button>
        </p>
        <header className="lesson-head">
          <p className="kicker">
            <span className={cx("domain", selected.domain)}>{selected.domain === "tb" ? "TB" : "Stats"}</span>
            Reference
          </p>
          <h1>{selected.title}</h1>
          <p className="dek">{selected.dek}</p>
          <div className="step-nav">
            <button type="button" className="solid" onClick={() => start(selected)}>
              Start the lesson
            </button>
          </div>
        </header>
        <aside className="callout analogy">
          <p className="kicker">Analogy</p>
          <h2>{lesson.overlay.analogy.title}</h2>
          <p>{lesson.overlay.analogy.body}</p>
        </aside>
        <VisualPlate spec={selected.visual} kicker={`Fig · ${selected.visual.kind.replaceAll("-", " ")}`} />
        <div className="story">
          {selected.story.map((para) => (
            <p key={para.slice(0, 48)}>{para}</p>
          ))}
        </div>
        <h2 className="section-title">{selected.deepTitle}</h2>
        <div className="deep">
          {selected.deep.map((para) => (
            <p key={para.slice(0, 48)}>{para}</p>
          ))}
        </div>
        {(selected.formulas ?? []).map((formula) => (
          <figure className="formula" key={formula.id}>
            <figcaption>{formula.label}</figcaption>
            <div className="formula-eq">{formula.expression}</div>
            <p>{formula.note}</p>
          </figure>
        ))}
        <footer className="sources">
          <p className="kicker">Sources</p>
          <ul>
            {selected.sources.map((source) => (
              <li key={source.title}>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                ) : (
                  <span>{source.title}</span>
                )}
                <span className="muted">
                  {" "}
                  — {source.attribution} ({source.license})
                </span>
              </li>
            ))}
          </ul>
        </footer>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Reference cabinet</p>
        <h1>Shelf</h1>
        <p className="lede">
          Every bundled plate, as an encyclopedia. Open one to read the dense notes, or start the
          five-step lesson from there. Type in the header to filter.
        </p>
        <div className="chips" role="group" aria-label="Domain">
          {(["all", "stats", "tb"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={cx("chip", domain === item && "is-active")}
              onClick={() => setDomain(item)}
            >
              {item === "all" ? `All · ${api.modules.length}` : item === "stats" ? "Stats" : "TB"}
            </button>
          ))}
        </div>
      </header>
      <p className="hint">{list.length} plate{list.length === 1 ? "" : "s"}</p>
      <div className="card-grid dense">
        {list.map((module) => (
          <ModuleCard key={module.id} module={module} onOpen={open} kicker={module.visual.kind.replaceAll("-", " ")} />
        ))}
      </div>
    </div>
  );
}
