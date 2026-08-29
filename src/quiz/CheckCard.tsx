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
          const state =
            !result || picked !== choice ? "" : result.ok ? "is-ok" : "is-miss";
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
