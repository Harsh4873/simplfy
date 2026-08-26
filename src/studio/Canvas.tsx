import { useState } from "react";
import { relatedFromText, extractTerms } from "../library/fieldNote";
import type { StudyModule, VisualSpec } from "../catalog/types";
import { VisualPlate } from "../visuals/VisualPlate";
import type { StudioApi, Topic } from "./useStudio";

function formulas(module: StudyModule) {
  return module.formulas ?? [];
}

function FieldNoteCanvas({
  item,
  modules,
  onOpen,
}: {
  item: StudioApi["library"][number];
  modules: StudyModule[];
  onOpen: (module: StudyModule) => void;
}) {
  const related = relatedFromText(`${item.name} ${item.text}`, modules);
  const terms = extractTerms(item.text);
  const spec: VisualSpec = {
    kind: "constellation",
    caption:
      item.parseNote ??
      "Terms pulled from the filed text. This is a local plate — the studio will not invent a textbook chapter from a paste.",
    terms: terms.length ? terms : [{ label: item.name, weight: 2 }],
  };
  return (
    <>
      <header className="stage-head">
        <p className="kicker">
          <span className="domain library">Local</span> Field note
        </p>
        <h1>{item.name}</h1>
        <p className="dek">
          Stored in this browser only. Related bundled plates are suggestions from the words on the page, not a claim that the note is those topics.
        </p>
      </header>
      <VisualPlate spec={spec} kicker="Plate · extracted terms" />
      {item.text ? (
        <div className="story">
          {item.text
            .split(/\n{2,}/)
            .filter(Boolean)
            .slice(0, 6)
            .map((para) => (
              <p key={para.slice(0, 40)}>{para.slice(0, 1200)}</p>
            ))}
        </div>
      ) : (
        <p className="dek">No extractable text. The blob is still in the library.</p>
      )}
      {related.length ? (
        <div className="related">
          <p className="kicker">Nearby plates</p>
          <div className="chips">
            {related.map((module) => (
              <button key={module.id} type="button" className="chip" onClick={() => onOpen(module)}>
                {module.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function ModuleCanvas({ module }: { module: StudyModule }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="stage-head">
        <p className="kicker">
          <span className={`domain ${module.domain}`}>{module.domain === "tb" ? "TB" : "Stats"}</span>
          Bundled plate
        </p>
        <h1>{module.title}</h1>
        <p className="dek">{module.dek}</p>
      </header>
      <VisualPlate spec={module.visual} kicker={`Plate · ${module.visual.kind.replace("-", " ")}`} />
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
        <p className="kicker">Canvas</p>
        <h1>
          The plate is blank.
          <em> Name a mechanism, a model, a drug.</em>
        </h1>
        <p className="dek">
          Simplfy is a studio for research-grade clarity — not a chatbot, not a high-school explainer. Search the catalogue, or file a PDF and keep working from the local library.
        </p>
      </div>
    );
  }
  return (
    <article className="stage-doc">
      {topic.source === "catalog" ? (
        <ModuleCanvas module={topic.module} />
      ) : (
        <FieldNoteCanvas item={topic.item} modules={api.modules} onOpen={api.openModule} />
      )}
    </article>
  );
}
