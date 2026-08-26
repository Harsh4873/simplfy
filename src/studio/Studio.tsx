import { CheckPanel } from "./CheckPanel";
import { ConceptMap } from "./ConceptMap";
import { IntakeRail } from "./IntakeRail";
import { Masthead } from "./Masthead";
import { RecallDeck } from "./RecallDeck";
import { WorkedExample } from "./WorkedExample";
import { Canvas } from "./Canvas";
import { useStudio } from "./useStudio";
import { cx } from "../ui/cx";

export function Studio() {
  const api = useStudio();

  return (
    <div className="shell">
      <Masthead api={api} />
      {api.notice ? (
        <p className="banner" role="status">
          {api.notice}
          <button type="button" className="text-btn" onClick={() => api.setNotice(null)}>
            Dismiss
          </button>
        </p>
      ) : null}
      {api.errors.length ? (
        <p className="banner miss" role="alert">
          {api.errors.length} catalogue file{api.errors.length === 1 ? "" : "s"} failed validation. See the console.
        </p>
      ) : null}
      <div className="workspace">
        {api.drawer ? (
          <button type="button" className="scrim tablet-only" aria-label="Close panel" onClick={() => api.setDrawer(null)} />
        ) : null}
        <IntakeRail api={api} />
        <main id="canvas" className="stage">
          <Canvas topic={api.topic} api={api} />
        </main>
        <aside className={cx("dock", api.drawer === "dock" && "is-open")} aria-label="Check and tools">
          {api.tool === "check" ? <CheckPanel topic={api.topic} api={api} /> : null}
          {api.tool === "map" ? <ConceptMap topic={api.topic} api={api} /> : null}
          {api.tool === "example" ? <WorkedExample topic={api.topic} api={api} /> : null}
          {api.tool === "recall" ? <RecallDeck api={api} /> : null}
        </aside>
      </div>
    </div>
  );
}
