import { useEffect, useState } from "react";
import { gradeAnswer } from "./grade";
import type { CheckItem } from "../catalog/types";

export function CheckCard({
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
          const state = !result
            ? ""
            : choice === item.answer
              ? "is-ok"
              : picked === choice
                ? "is-miss"
                : "";
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
              <span>
                {choice}
                {state === "is-ok" ? <span className="choice-tag">Correct</span> : null}
                {state === "is-miss" ? <span className="choice-tag">Incorrect</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className={result ? (result.ok ? "why ok" : "why miss") : "why"} role="status">
        {result?.why ?? ""}
      </p>
    </div>
  );
}
