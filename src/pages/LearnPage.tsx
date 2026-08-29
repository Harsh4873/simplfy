import { useEffect, useState } from "react";
import { VisualPlate } from "../visuals/VisualPlate";
import { lessonFromModule } from "../lesson/fromModule";
import type { StudyModule } from "../catalog/types";
import type { Route, LessonStep } from "../app/routes";
import { LESSON_STEPS, STEP_META, toHash } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import { CheckCard } from "../quiz/CheckCard";
import { ConceptMap } from "../studio/ConceptMap";
import { sayBackItem } from "../lesson/fromModule";
import { PapersBoard } from "../papers/PapersBoard";
import { cx } from "../ui/cx";

function StepNav({
  id,
  step,
  navigate,
}: {
  id: string;
  step: LessonStep;
  navigate: (route: Route) => void;
}) {
  return (
    <div className="step-track" role="tablist" aria-label="Lesson steps">
      {LESSON_STEPS.map((item) => (
        <a
          key={item}
          role="tab"
          aria-selected={item === step}
          className={cx("step-tab", item === step && "is-active")}
          href={toHash({ name: "learn", id, step: item })}
          onClick={(event) => {
            event.preventDefault();
            navigate({ name: "learn", id, step: item });
          }}
        >
          <span className="step-n">{STEP_META[item].n}</span>
          {STEP_META[item].label}
        </a>
      ))}
    </div>
  );
}

function TeachStep({ module, onNext }: { module: StudyModule; onNext: () => void }) {
  const { overlay } = lessonFromModule(module);
  return (
    <div className="lesson-body">
      <aside className="callout analogy">
        <p className="kicker">Analogy</p>
        <h2>{overlay.analogy.title}</h2>
        <p>{overlay.analogy.body}</p>
      </aside>
      <section>
        <p className="kicker">In plain speech</p>
        {overlay.plain.map((para) => (
          <p key={para.slice(0, 48)} className="prose">
            {para}
          </p>
        ))}
      </section>
      <VisualPlate spec={module.visual} kicker={`Fig · ${module.visual.kind.replaceAll("-", " ")}`} />
      <section>
        <p className="kicker">Why this matters</p>
        <p className="prose">{overlay.whyItMatters}</p>
      </section>
      <section>
        <p className="kicker">Watch for</p>
        <ul className="watch-list">
          {overlay.watchFor.map((item) => (
            <li key={item.slice(0, 64)}>{item}</li>
          ))}
        </ul>
      </section>
      <p className="also">
        Also called: {module.aliases.slice(0, 8).join(" · ")}
      </p>
      <button type="button" className="solid" onClick={onNext}>
        Next: we work one problem
      </button>
    </div>
  );
}

function ExampleStep({ module, onNext }: { module: StudyModule; onNext: () => void }) {
  const [step, setStep] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setStep(0);
    setShowAll(false);
  }, [module.id]);

  const current = module.example.steps[step];
  return (
    <div className="lesson-body">
      <p className="kicker">Worked example</p>
      <h2>{module.example.title}</h2>
      <p className="prose">{module.example.setup}</p>
      <div className="step-nav">
        <button type="button" className="ghost" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Step through" : "Show all steps"}
        </button>
      </div>
      {showAll ? (
        <ol className="worked-all">
          {module.example.steps.map((row) => (
            <li key={row.title} className="step">
              <h3>{row.title}</h3>
              <p>{row.body}</p>
              {row.expression ? <div className="formula-eq">{row.expression}</div> : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="step">
          <p className="kicker">
            Step {step + 1} / {module.example.steps.length}
          </p>
          <h3>{current.title}</h3>
          <p>{current.body}</p>
          {current.expression ? <div className="formula-eq">{current.expression}</div> : null}
        </div>
      )}
      {!showAll ? (
        <div className="step-nav">
          <button type="button" className="ghost" disabled={step === 0} onClick={() => setStep((n) => n - 1)}>
            Back
          </button>
          <button
            type="button"
            className="ghost"
            disabled={step >= module.example.steps.length - 1}
            onClick={() => setStep((n) => n + 1)}
          >
            Next step
          </button>
        </div>
      ) : null}
      {showAll || step >= module.example.steps.length - 1 ? (
        <p className="takeaway">{module.example.takeaway}</p>
      ) : null}
      <button type="button" className="solid" onClick={onNext}>
        Your turn — practice
      </button>
    </div>
  );
}

function PracticeStep({
  module,
  api,
  onNext,
}: {
  module: StudyModule;
  api: StudioApi;
  onNext: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [scratch, setScratch] = useState("");

  useEffect(() => {
    setIndex(0);
    setScratch("");
  }, [module.id]);

  const item = module.check[index] ?? module.check[0];
  return (
    <div className="lesson-body">
      <p className="kicker">
        Practice · {index + 1} / {module.check.length}
      </p>
      <h2>You try</h2>
      <p className="section-dek">
        Work it on scratch paper or in the box. Then pick an answer. Misses land on the recall deck.
      </p>
      <label className="scratch">
        Scratch work (not graded)
        <textarea
          rows={4}
          value={scratch}
          onChange={(event) => setScratch(event.target.value)}
          placeholder="Arithmetic, a sentence, a guess at the nested pair…"
        />
      </label>
      <CheckCard moduleId={module.id} item={item} onMiss={(id, check) => void api.missCheck(id, check)} />
      <div className="step-nav">
        <button
          type="button"
          className="ghost"
          disabled={index === 0}
          onClick={() => {
            setIndex((n) => n - 1);
            setScratch("");
          }}
        >
          Previous
        </button>
        <button
          type="button"
          className="ghost"
          disabled={index >= module.check.length - 1}
          onClick={() => {
            setIndex((n) => n + 1);
            setScratch("");
          }}
        >
          Next problem
        </button>
      </div>
      <button type="button" className="solid" onClick={onNext}>
        Say it back in your own words
      </button>
    </div>
  );
}

function SayBackStep({
  module,
  api,
  onNext,
}: {
  module: StudyModule;
  api: StudioApi;
  onNext: () => void;
}) {
  const lesson = lessonFromModule(module);
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setDraft("");
    setRevealed(false);
  }, [module.id]);

  return (
    <div className="lesson-body">
      <p className="kicker">Rhetorical check</p>
      <h2>Now you explain it</h2>
      <p className="prompt">{lesson.overlay.sayBackPrompt}</p>
      <label className="scratch">
        Your words
        <textarea
          rows={7}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Pretend you are teaching a tired labmate. Analogy first is allowed."
        />
      </label>
      <div className="step-nav">
        <button type="button" className="ghost" onClick={() => setRevealed(true)} disabled={revealed}>
          Reveal a model answer
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => void api.missCheck(module.id, sayBackItem(module))}
        >
          Park this on my deck
        </button>
        <button
          type="button"
          className="solid quiet"
          onClick={() => {
            const card = api.recall.find((row) => row.moduleId === module.id && row.checkId === "say-back");
            if (card) void api.clearRecall(card.id);
          }}
        >
          I can say this
        </button>
      </div>
      {revealed ? (
        <aside className="callout model">
          <p className="kicker">A solid answer</p>
          <p>{lesson.overlay.sayBackModel}</p>
        </aside>
      ) : null}
      <button type="button" className="solid" onClick={onNext}>
        Open the dense shelf
      </button>
    </div>
  );
}

function formulas(module: StudyModule) {
  return module.formulas ?? [];
}

function ShelfStep({
  module,
  api,
  onOpen,
  onPapers,
}: {
  module: StudyModule;
  api: StudioApi;
  onOpen: (module: StudyModule) => void;
  onPapers: () => void;
}) {
  return (
    <div className="lesson-body shelf-step">
      <p className="kicker">Reference shelf</p>
      <h2>{module.deepTitle}</h2>
      <div className="story">
        {module.story.map((para) => (
          <p key={para.slice(0, 48)}>{para}</p>
        ))}
      </div>
      <div className="deep">
        {module.deep.map((para) => (
          <p key={para.slice(0, 48)}>{para}</p>
        ))}
      </div>
      {formulas(module).map((formula) => (
        <figure className="formula" key={formula.id}>
          <figcaption>{formula.label}</figcaption>
          <div className="formula-eq">{formula.expression}</div>
          <p>{formula.note}</p>
        </figure>
      ))}
      <ConceptMap module={module} byId={api.byId} onOpen={onOpen} />
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
      <button type="button" className="solid" onClick={onPapers}>
        Papers for this topic
      </button>
    </div>
  );
}

function PapersStep({
  module,
  onLookup,
}: {
  module: StudyModule;
  onLookup: (q: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const gene = module.visual.kind === "gene-track" ? module.visual.gene : "";
  return (
    <div className="lesson-body">
      <p className="kicker">Papers for this plate</p>
      <h2>What to read</h2>
      <p className="section-dek">
        Ranked for this topic: Ioerger first if he wrote on it, then people he writes with, then the
        TB field, then other papers, then explainers. A ring with nothing in it stays hidden.
      </p>
      <form
        className="paste lookup-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) onLookup(draft.trim());
        }}
      >
        <label htmlFor="lesson-paper-q">Narrow or jump to a gene lookup</label>
        <div className="search-row">
          <input
            id="lesson-paper-q"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={gene ? `${gene}, or another locus…` : "gene, drug, method…"}
          />
          <button type="submit" className="ghost">
            Open lookup
          </button>
        </div>
      </form>
      <PapersBoard query="" module={module} />
    </div>
  );
}

export function LearnPage({
  api,
  id,
  step,
  navigate,
}: {
  api: StudioApi;
  id: string;
  step: LessonStep;
  navigate: (route: Route) => void;
}) {
  const module = api.byId.get(id);

  useEffect(() => {
    if (module) void api.touchLesson(module, step);
  }, [api.touchLesson, module, step]);

  if (!module) {
    return (
      <div className="page">
        <h1>No lesson for that id</h1>
        <p className="lede">It is not in the catalogue. Search a term, or go back to the shelf.</p>
        <button type="button" className="solid" onClick={() => navigate({ name: "shelf" })}>
          Browse the shelf
        </button>
      </div>
    );
  }

  const go = (next: LessonStep) => navigate({ name: "learn", id: module.id, step: next });
  const openRelated = (related: StudyModule) => {
    void api.remember(`module:${related.id}`);
    navigate({ name: "learn", id: related.id, step: "teach" });
  };

  return (
    <article className="page learn-page">
      <header className="lesson-head">
        <p className="kicker">
          <span className={cx("domain", module.domain)}>{module.domain === "tb" ? "TB" : "Stats"}</span>
          {lessonFromModule(module).featured ? <span className="pill">Guided script</span> : <span className="pill quiet">Derived lesson</span>}
        </p>
        <h1>{module.title}</h1>
        <p className="dek">{module.dek}</p>
      </header>
      <StepNav id={module.id} step={step} navigate={navigate} />
      {step === "teach" ? <TeachStep module={module} onNext={() => go("example")} /> : null}
      {step === "example" ? <ExampleStep module={module} onNext={() => go("practice")} /> : null}
      {step === "practice" ? <PracticeStep module={module} api={api} onNext={() => go("say-back")} /> : null}
      {step === "say-back" ? <SayBackStep module={module} api={api} onNext={() => go("shelf")} /> : null}
      {step === "shelf" ? (
        <ShelfStep module={module} api={api} onOpen={openRelated} onPapers={() => go("papers")} />
      ) : null}
      {step === "papers" ? (
        <PapersStep
          module={module}
          onLookup={(q) => {
            void api.touchPapers(q);
            navigate({ name: "papers", q });
          }}
        />
      ) : null}
    </article>
  );
}
