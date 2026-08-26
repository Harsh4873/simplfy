import { useEffect, useState } from "react";
import { gradeAnswer } from "../quiz/grade";
import type { CheckItem, StudyModule } from "../catalog/types";
import { relatedFromText } from "../library/fieldNote";
import type { StudioApi, Topic } from "./useStudio";

function CheckCard({
  moduleId,
  item,
  onMiss,
}: {
  moduleId: string;
  item: CheckItem;
  onMiss: (moduleId: string, item: CheckItem) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const result = picked ? gradeAnswer(item, picked) : null;

  useEffect(() => {
    setPicked(null);
  }, [item.id]);

  return (
    <div className="check-card">
      <p className="kicker">{item.kind}</p>
      <p className="prompt">{item.prompt}</p>
      {item.figureHint ? <p className="hint">{item.figureHint}</p> : null}
      <div className="choices" role="group" aria-label="Answers">
        {item.choices.map((choice, index) => {
          const state =
            !result || picked !== choice
              ? ""
              : result.ok
                ? "is-ok"
                : "is-miss";
          return (
            <button
              key={choice}
              type="button"
              className={`choice ${state}`}
              disabled={Boolean(result)}
              onClick={() => {
                setPicked(choice);
                const graded = gradeAnswer(item, choice);
                if (!graded.ok) onMiss(moduleId, item);
              }}
            >
              <span className="idx">{index + 1}</span>
              {choice}
            </button>
          );
        })}
      </div>
      {result ? <p className={result.ok ? "why ok" : "why miss"}>{result.why}</p> : null}
    </div>
  );
}

function checksFor(topic: Topic, modules: StudyModule[]): { module: StudyModule; items: CheckItem[] } | null {
  if (topic.source === "catalog") return { module: topic.module, items: topic.module.check };
  const related = relatedFromText(`${topic.item.name} ${topic.item.text}`, modules);
  if (!related[0]) return null;
  return { module: related[0], items: related[0].check };
}

export function CheckPanel({
  topic,
  api,
}: {
  topic: Topic | null;
  api: StudioApi;
}) {
  const [index, setIndex] = useState(0);
  const pack = topic ? checksFor(topic, api.modules) : null;

  useEffect(() => {
    setIndex(0);
  }, [topic]);

  if (!topic || !pack) {
    return (
      <div className="dock-empty">
        <p className="kicker">Check</p>
        <h2>No plate on stage</h2>
        <p>Open a plate, then sit the check. Local notes borrow questions from the nearest bundled topic.</p>
      </div>
    );
  }

  const item = pack.items[index] ?? pack.items[0];
  const fromLibrary = topic.source === "library";

  return (
    <div className="check">
      <header className="dock-head">
        <p className="kicker">Check · {index + 1} / {pack.items.length}</p>
        <h2>Sit the check</h2>
        {fromLibrary ? <p className="hint">Questions drawn from a nearby plate, not generated from the paste.</p> : null}
      </header>
      <CheckCard moduleId={pack.module.id} item={item} onMiss={(id, check) => void api.missCheck(id, check)} />
      <div className="step-nav">
        <button type="button" className="ghost" disabled={index === 0} onClick={() => setIndex((n) => n - 1)}>
          Previous
        </button>
        <button
          type="button"
          className="ghost"
          disabled={index >= pack.items.length - 1}
          onClick={() => setIndex((n) => n + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
