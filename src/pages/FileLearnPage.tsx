import { useEffect, useState } from "react";
import { VisualPlate } from "../visuals/VisualPlate";
import { FILE_LESSON_STEPS, STEP_META, learnFileRoute, libraryNoteRoute, recallNoteRoute, toHash, type LessonStep, type Route } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import type { LibraryItem } from "../library/db";
import { lessonFromNote } from "../lesson/fromNote";
import { cx } from "../ui/cx";

function FileStepNav({
  id,
  step,
  navigate,
}: {
  id: string;
  step: LessonStep;
  navigate: (route: Route) => void;
}) {
  return (
    <div className="step-track" role="tablist" aria-label="File lesson steps">
      {FILE_LESSON_STEPS.map((item) => (
        <a
          key={item}
          role="tab"
          aria-selected={item === step}
          className={cx("step-tab", item === step && "is-active")}
          href={toHash(learnFileRoute(id, item))}
          onClick={(event) => {
            event.preventDefault();
            navigate(learnFileRoute(id, item));
          }}
        >
          <span className="step-n">{STEP_META[item].n}</span>
          {STEP_META[item].label}
        </a>
      ))}
    </div>
  );
}

export function FileLearnPage({
  api,
  item,
  step,
  navigate,
}: {
  api: StudioApi;
  item: LibraryItem;
  step: LessonStep;
  navigate: (route: Route) => void;
}) {
  const lesson = lessonFromNote(item);
  const cards = api.recall.filter((card) => card.noteId === item.id);
  const className = item.collectionId
    ? api.collections.find((row) => row.id === item.collectionId)?.name
    : undefined;

  useEffect(() => {
    if (!api.ready) return;
    void api.remember(`library:${item.id}`);
  }, [api.ready, api.remember, item.id]);

  const go = (next: LessonStep) => navigate(learnFileRoute(item.id, next));

  return (
    <article className="page learn-page">
      <header className="lesson-head">
        <p className="kicker">
          <span className="domain library">Local</span>
          <span className="pill">{className ? `Class file · ${className}` : "Your file"}</span>
        </p>
        <h1>{lesson.title}</h1>
        <p className="dek">{lesson.dek}</p>
      </header>
      <FileStepNav id={item.id} step={step} navigate={navigate} />
      {step === "teach" ? (
        <div className="lesson-body">
          <section>
            <p className="kicker">In plain speech</p>
            {lesson.plain.map((para) => (
              <p key={para.slice(0, 48)} className="prose">
                {para}
              </p>
            ))}
          </section>
          {lesson.figure ? <VisualPlate spec={lesson.figure.spec} kicker={lesson.figure.kicker} /> : null}
          <section>
            <p className="kicker">Watch for</p>
            <ul className="watch-list">
              {lesson.watchFor.map((row) => (
                <li key={row.slice(0, 64)}>{row}</li>
              ))}
            </ul>
          </section>
          <button type="button" className="solid" onClick={() => go("example")}>
            Next: walk this file
          </button>
        </div>
      ) : null}
      {step === "example" ? <FileExample lesson={lesson} onNext={() => go("practice")} /> : null}
      {step === "practice" ? (
        <FilePractice
          item={item}
          cards={cards}
          onNext={() => go("say-back")}
          onStudy={() => navigate(recallNoteRoute(item.id))}
        />
      ) : null}
      {step === "say-back" ? (
        <FileSayBack
          lesson={lesson}
          onSource={() => navigate(libraryNoteRoute(item.id, item.collectionId))}
        />
      ) : null}
    </article>
  );
}

function FileExample({
  lesson,
  onNext,
}: {
  lesson: ReturnType<typeof lessonFromNote>;
  onNext: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    setIndex(0);
    setShowAll(false);
  }, [lesson.title]);
  const current = lesson.steps[Math.min(index, lesson.steps.length - 1)];
  return (
    <div className="lesson-body">
      <p className="kicker">Walk the file</p>
      <h2>{lesson.title}</h2>
      <p className="prose">These steps are the headings in this file — not a catalogue plate.</p>
      <div className="step-nav">
        <button type="button" className="ghost" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Step through" : "Show all sections"}
        </button>
      </div>
      {showAll ? (
        <ol className="worked-all">
          {lesson.steps.map((row) => (
            <li key={row.title} className="step">
              <h3>{row.title}</h3>
              <p>{row.body}</p>
            </li>
          ))}
        </ol>
      ) : current ? (
        <div className="step">
          <p className="kicker">
            Step {index + 1} / {lesson.steps.length}
          </p>
          <h3>{current.title}</h3>
          <p>{current.body}</p>
        </div>
      ) : null}
      {!showAll && lesson.steps.length > 1 ? (
        <div className="step-nav">
          <button type="button" className="ghost" disabled={index === 0} onClick={() => setIndex((n) => n - 1)}>
            Back
          </button>
          <button
            type="button"
            className="ghost"
            disabled={index >= lesson.steps.length - 1}
            onClick={() => setIndex((n) => n + 1)}
          >
            Next section
          </button>
        </div>
      ) : null}
      {showAll || index >= lesson.steps.length - 1 ? <p className="takeaway">{lesson.takeaway}</p> : null}
      <button type="button" className="solid" onClick={onNext}>
        Your turn — practice
      </button>
    </div>
  );
}

function FilePractice({
  item,
  cards,
  onNext,
  onStudy,
}: {
  item: LibraryItem;
  cards: StudioApi["recall"];
  onNext: () => void;
  onStudy: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [item.id]);
  const card = cards[Math.min(index, Math.max(cards.length - 1, 0))];
  if (!card) {
    return (
      <div className="lesson-body">
        <p className="kicker">Practice</p>
        <h2>No flip cards yet</h2>
        <p className="lede">
          Add ## headings or longer paragraphs in this file and we will cut practice from those notes.
        </p>
        <button type="button" className="solid" onClick={onNext}>
          Say it back in your own words
        </button>
      </div>
    );
  }
  return (
    <div className="lesson-body">
      <p className="kicker">
        Practice · {index + 1} / {cards.length}
      </p>
      <h2>From this file</h2>
      <p className="prompt">{card.prompt}</p>
      {flipped ? <p className="prose">{card.answer}</p> : <p className="hint">Say it, then reveal.</p>}
      <div className="step-nav">
        <button type="button" className="ghost" onClick={() => setFlipped((value) => !value)}>
          {flipped ? "Hide answer" : "Reveal"}
        </button>
        <button
          type="button"
          className="ghost"
          disabled={index === 0}
          onClick={() => {
            setIndex((n) => n - 1);
            setFlipped(false);
          }}
        >
          Previous
        </button>
        <button
          type="button"
          className="ghost"
          disabled={index >= cards.length - 1}
          onClick={() => {
            setIndex((n) => n + 1);
            setFlipped(false);
          }}
        >
          Next card
        </button>
        <button type="button" className="ghost" onClick={onStudy}>
          Flip the whole deck
        </button>
      </div>
      <button type="button" className="solid" onClick={onNext}>
        Say it back in your own words
      </button>
    </div>
  );
}

function FileSayBack({
  lesson,
  onSource,
}: {
  lesson: ReturnType<typeof lessonFromNote>;
  onSource: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setDraft("");
    setRevealed(false);
  }, [lesson.title]);
  return (
    <div className="lesson-body">
      <p className="kicker">Rhetorical check</p>
      <h2>Now you explain this file</h2>
      <p className="prompt">{lesson.sayBackPrompt}</p>
      <label className="scratch">
        Your words
        <textarea
          rows={7}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Teach a tired classmate from this file only."
        />
      </label>
      <div className="step-nav">
        <button type="button" className="ghost" onClick={() => setRevealed(true)} disabled={revealed}>
          Reveal a model answer
        </button>
        <button type="button" className="solid" onClick={onSource}>
          Back to the file
        </button>
      </div>
      {revealed ? <p className="prose">{lesson.sayBackModel}</p> : null}
    </div>
  );
}
