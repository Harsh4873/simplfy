import { useState } from "react";
import type { StudyModule } from "../catalog/types";
import { VisualPlate } from "../visuals/VisualPlate";
import { vis } from "../visuals/theme";
import { FieldNoteDoc } from "./FieldNoteDoc";
import type { StudioApi, Topic } from "./useStudio";

function formulas(module: StudyModule) {
  return module.formulas ?? [];
}

function figNo(modules: StudyModule[], id: string): string {
  const index = modules.findIndex((module) => module.id === id);
  return String(Math.max(index, 0) + 1).padStart(2, "0");
}

function WaitingPlate() {
  return (
    <svg className="viz empty-viz waiting-plate" viewBox="0 0 640 300" role="img" aria-hidden="true">
      <rect x="0.5" y="0.5" width="639" height="299" fill={vis.paper} stroke={vis.rule} />
      <g stroke={vis.rule} strokeWidth="0.6">
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={40 + i * 46.6} y1="28" x2={40 + i * 46.6} y2="272" />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1="40" y1={28 + i * 35} x2="600" y2={28 + i * 35} />
        ))}
      </g>
      <g stroke={vis.ink} strokeWidth={vis.sw} fill="none">
        <path d="M14 26h14M14 26v14" />
        <path d="M626 26h-14M626 26v14" />
        <path d="M14 274h14M14 274v-14" />
        <path d="M626 274h-14M626 274v-14" />
      </g>
      <text
        x="320"
        y="156"
        textAnchor="middle"
        fontFamily={vis.sans}
        fontSize="12"
        letterSpacing="0.28em"
        fill={vis.mute}
      >
        NO PLATE
      </text>
    </svg>
  );
}

function ModuleCanvas({ module, fig }: { module: StudyModule; fig: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="stage-head">
        <p className="kicker">
          <span className={`domain ${module.domain}`}>{module.domain === "tb" ? "TB" : "Stats"}</span>
          Bundled plate · Fig. {fig}
        </p>
        <h1>{module.title}</h1>
        <p className="dek">{module.dek}</p>
      </header>
      <VisualPlate spec={module.visual} kicker={`Fig. ${fig}  ·  ${module.visual.kind.replaceAll("-", " ")}`} />
      <div className="story">
        {module.story.map((para) => (
          <p key={para.slice(0, 48)}>{para}</p>
        ))}
      </div>
      <div className="disclosure">
        <button type="button" className="solid quiet" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Hold the deep cut" : module.deepTitle}
        </button>
        {open ? (
          <div className="deep">
            {module.deep.map((para) => (
              <p key={para.slice(0, 48)}>{para}</p>
            ))}
            {formulas(module).map((formula) => (
              <figure className="formula" key={formula.id}>
                <figcaption>{formula.label}</figcaption>
                <div className="formula-eq">{formula.expression}</div>
                <p>{formula.note}</p>
              </figure>
            ))}
          </div>
        ) : null}
      </div>
      <footer className="sources">
        <p className="kicker">Sources</p>
        <ul>
          {module.sources.map((source) => (
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
    </>
  );
}

export function Canvas({ topic, api }: { topic: Topic | null; api: StudioApi }) {
  if (!topic) {
    return (
      <div className="stage-empty">
        <p className="kicker">Fig. — · stage</p>
        <WaitingPlate />
        <h1>Stage is clear.</h1>
        <p className="dek">
          <em>Name a mechanism, a model, a drug.</em> Search the cabinet, or file a note and keep working from this browser.
        </p>
        <p className="hint">
          Press <kbd>/</kbd> to focus intake. Check, map, example, and recall sit in the dock.
        </p>
      </div>
    );
  }
  return (
    <article className="stage-doc">
      {topic.source === "catalog" ? (
        <ModuleCanvas module={topic.module} fig={figNo(api.modules, topic.module.id)} />
      ) : (
        <FieldNoteDoc item={topic.item} modules={api.modules} onOpen={api.openModule} />
      )}
    </article>
  );
}
