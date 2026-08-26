import { useEffect } from "react";
import { CheckPanel } from "./CheckPanel";
import { ConceptMap } from "./ConceptMap";
import { IntakeRail } from "./IntakeRail";
import { Masthead } from "./Masthead";
import { RecallDeck } from "./RecallDeck";
import { WorkedExample } from "./WorkedExample";
import { Canvas } from "./Canvas";
import { TOOLS } from "./tools";
import { useStudio } from "./useStudio";
import { cx } from "../ui/cx";

export function Studio() {
  const api = useStudio();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === "Escape") {
        api.setDrawer(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

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
          <div className="tool-switch" role="tablist" aria-label="Studio tools">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                role="tab"
                aria-selected={api.tool === tool.id}
                className={cx(api.tool === tool.id && "is-active")}
                onClick={() => {
                  api.setTool(tool.id);
                  api.setDrawer("dock");
                }}
              >
                {tool.label}
              </button>
            ))}
          </div>
          <div className="dock-body">
            {api.tool === "check" ? <CheckPanel topic={api.topic} api={api} /> : null}
            {api.tool === "map" ? <ConceptMap topic={api.topic} api={api} /> : null}
            {api.tool === "example" ? <WorkedExample topic={api.topic} api={api} /> : null}
            {api.tool === "recall" ? <RecallDeck api={api} /> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
