import { cx } from "../ui/cx";
import type { StudioApi, ToolId } from "./useStudio";

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "check", label: "Check" },
  { id: "map", label: "Map" },
  { id: "example", label: "Example" },
  { id: "recall", label: "Recall" },
];

export function Masthead({ api }: { api: StudioApi }) {
  const title =
    api.topic?.source === "catalog"
      ? api.topic.module.title
      : api.topic?.source === "library"
        ? api.topic.item.name
        : "Untitled plate";

  return (
    <header className="mast">
      <a className="skip" href="#canvas">
        Skip to canvas
      </a>
      <div className="brand">
        <p className="wordmark">Simplfy</p>
        <p className="edition">visual study studio</p>
      </div>
      <p className="now" title={title}>
        {title}
      </p>
      <div className="mast-actions">
        <button type="button" className="ghost tablet-only" onClick={() => api.setDrawer(api.drawer === "intake" ? null : "intake")}>
          Intake
        </button>
        <button type="button" className="ghost tablet-only" onClick={() => api.setDrawer(api.drawer === "dock" ? null : "dock")}>
          Tools
        </button>
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
      </div>
    </header>
  );
}
