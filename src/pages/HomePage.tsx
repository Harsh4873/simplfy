import { FEATURED_IDS, STUDY_PATHS } from "../lesson/paths";
import { lessonFromModule } from "../lesson/fromModule";
import type { StudyModule } from "../catalog/types";
import { LESSON_STEPS, STEP_META, type Route } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import { ModuleCard } from "./ModuleCard";
import { SourceCard } from "./SourceCard";

export function HomePage({
  api,
  navigate,
}: {
  api: StudioApi;
  navigate: (route: Route) => void;
}) {
  const open = (module: StudyModule) => {
    void api.touchLesson(module, "teach");
    navigate({ name: "learn", id: module.id, step: "teach" });
  };

  const featured = FEATURED_IDS.map((id) => api.byId.get(id)).filter((row): row is StudyModule => Boolean(row));
  const statsCount = api.modules.filter((module) => module.domain === "stats").length;
  const tbCount = api.modules.filter((module) => module.domain === "tb").length;
  const pinned = api.studios.filter(
    (row) => row.pinned && (row.kind === "note" || row.kind === "class" || row.kind === "papers"),
  );
  const collectionName = (id: string | undefined) =>
    id ? api.collections.find((row) => row.id === id)?.name : undefined;

  return (
    <div className="page home-page">
      <section className="hero">
        <p className="kicker">A textbook that talks like a tutor</p>
        <h1>
          Simple words. One worked problem. Then it is your turn.
        </h1>
        <p className="lede">
          Pick a topic in Learn, or file material under Sources — decks, classes, and papers — then
          pin only what you want here. Search is always up top — press <kbd>/</kbd>.
        </p>
        <div className="hero-stats">
          <span>
            <strong>{api.modules.length}</strong> plates
          </span>
          <span>
            <strong>{statsCount}</strong> stats
          </span>
          <span>
            <strong>{tbCount}</strong> TB
          </span>
          <span>
            <strong>{api.recall.length}</strong> on the recall deck
          </span>
        </div>
        <div className="step-nav">
          <button type="button" className="solid" onClick={() => navigate({ name: "desk" })}>
            Open Sources
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              if (api.continueModule) {
                open(api.continueModule);
                return;
              }
              const first = featured[0];
              if (first) open(first);
              else navigate({ name: "shelf" });
            }}
          >
            Open Learn
          </button>
        </div>
      </section>

      {pinned.length || api.continueModule ? (
        <section className="continue-strip" aria-label="Pinned">
          <p className="kicker">On Home</p>
          {api.continueModule ? (
            <button type="button" className="solid" onClick={() => open(api.continueModule!)}>
              Resume {api.continueModule.title}
            </button>
          ) : null}
          {pinned.length ? (
            <ul className="desk-grid">
              {pinned.map((canvas) => (
                <SourceCard
                  key={canvas.id}
                  canvas={canvas}
                  api={api}
                  navigate={navigate}
                  collectionName={collectionName(canvas.collectionId)}
                />
              ))}
            </ul>
          ) : (
            <p className="hint">Pin a deck, class, or paper from Sources and it shows up here.</p>
          )}
        </section>
      ) : (
        <p className="hint">Pin a deck, class, or paper from Sources so Home stays quiet.</p>
      )}

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="section-title">
          How a session works
        </h2>
        <ol className="session-guide">
          {LESSON_STEPS.map((step) => (
            <li key={step}>
              <span className="step-n">{STEP_META[step].n}</span>
              <strong>{STEP_META[step].label}</strong>
              <span>{STEP_META[step].hint}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="section-title">
          Start with a guided lesson
        </h2>
        <p className="section-dek">
          Flagship topics have a full tutor script: a real analogy, plain speech, traps, and a model
          answer for “say it back.” Everything else on the shelf still runs the same six steps —
          the tutor layer is derived from the plate so you are never dropped into a wall of jargon
          first. Papers sit last: Ioerger first when he wrote on it.
        </p>
        <div className="card-grid">
          {featured.map((module) => (
            <ModuleCard key={module.id} module={module} onOpen={open} />
          ))}
        </div>
      </section>

      <section aria-labelledby="paths-heading">
        <h2 id="paths-heading" className="section-title">
          Paths
        </h2>
        <div className="path-grid">
          {STUDY_PATHS.map((path) => {
            const modules = path.ids.map((id) => api.byId.get(id)).filter((row): row is StudyModule => Boolean(row));
            return (
              <article key={path.id} className="path-card">
                <p className={path.domain === "tb" ? "domain tb" : "domain stats"}>
                  {path.domain === "tb" ? "TB" : "Stats"}
                </p>
                <h3>{path.title}</h3>
                <p className="hit-dek">{path.dek}</p>
                <ol className="path-rail">
                  {modules.map((module, index) => (
                    <li key={module.id}>
                      <button type="button" className="text-btn" onClick={() => open(module)}>
                        {index + 1}. {module.title}
                      </button>
                      <span className="muted">{lessonFromModule(module).overlay.analogy.title}</span>
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
