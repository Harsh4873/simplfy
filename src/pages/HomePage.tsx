import { FEATURED_IDS, STUDY_PATHS } from "../lesson/paths";
import { lessonFromModule } from "../lesson/fromModule";
import type { StudyModule } from "../catalog/types";
import { LESSON_STEPS, libraryNoteRoute, STEP_META, type Route } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import { ModuleCard } from "./ModuleCard";

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

  return (
    <div className="page home-page">
      <section className="hero">
        <p className="kicker">A textbook that talks like a tutor</p>
        <h1>
          Simple words. One worked problem. Then it is your turn.
        </h1>
        <p className="lede">
          Pick a topic. The lesson walks you the way a good study buddy does: analogy first, a demo,
          two or three problems, then “say it back in your own words.” The dense notes stay on the
          shelf until you ask for them. Search is always up top — press <kbd>/</kbd>. Or dump a
          whole lecture folder under Classes. Paste a markdown dump or drop a research PDF and it
          becomes its own flip deck — study it from Decks. A folder pack is a class; a single paper
          stays a paper unless you file it into a class.
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
          <button type="button" className="solid" onClick={() => navigate({ name: "notes" })}>
            Drop a class folder
          </button>
        </div>
      </section>

      {api.continueModule || api.continueNote || api.studios.length ? (
        <section className="continue-strip" aria-label="Continue">
          <p className="kicker">This device</p>
          {api.continueModule ? (
            <button type="button" className="solid" onClick={() => open(api.continueModule!)}>
              Resume {api.continueModule.title}
            </button>
          ) : null}
          {api.continueNote ? (
            <button
              type="button"
              className="ghost"
              onClick={() => navigate(libraryNoteRoute(api.continueNote!.id, api.continueNote!.collectionId))}
            >
              Open note: {api.continueNote.name}
            </button>
          ) : null}
          {api.studios.length ? (
            <button type="button" className="ghost" onClick={() => navigate({ name: "desk" })}>
              Open decks · {api.studios.length} canvas{api.studios.length === 1 ? "" : "es"}
            </button>
          ) : null}
        </section>
      ) : null}

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
