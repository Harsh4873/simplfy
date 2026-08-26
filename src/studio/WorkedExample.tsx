import { useEffect, useState } from "react";
import { relatedForLibraryItem } from "../library/fieldNote";
import type { StudioApi, Topic } from "./useStudio";

export function WorkedExample({ topic, api }: { topic: Topic | null; api: StudioApi }) {
  const [step, setStep] = useState(0);
  const module =
    topic?.source === "catalog"
      ? topic.module
      : topic
        ? relatedForLibraryItem(topic.item, api.modules)[0]
        : null;

  useEffect(() => {
    setStep(0);
  }, [module?.id]);

  if (!module) {
    return (
      <div className="dock-empty">
        <p className="kicker">Worked example</p>
        <h2>Stepper idle</h2>
        <p>Bundled plates carry a stepper. File a note and we will borrow the nearest one.</p>
      </div>
    );
  }

  const current = module.example.steps[step];
  return (
    <div className="example">
      <p className="kicker">
        Example · {step + 1} / {module.example.steps.length}
      </p>
      <h2>{module.example.title}</h2>
      <p className="dek">{module.example.setup}</p>
      <div className="step">
        <h3>{current.title}</h3>
        <p>{current.body}</p>
        {current.expression ? <div className="formula-eq">{current.expression}</div> : null}
      </div>
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
      {step === module.example.steps.length - 1 ? <p className="takeaway">{module.example.takeaway}</p> : null}
    </div>
  );
}
