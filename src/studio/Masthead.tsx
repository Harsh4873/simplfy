import type { StudioApi } from "./useStudio";

export function Masthead({ api }: { api: StudioApi }) {
  const title =
    api.topic?.source === "catalog"
      ? api.topic.module.title
      : api.topic?.source === "library"
        ? api.topic.item.name
        : "No plate";

  return (
    <header className="mast">
      <a className="skip" href="#canvas">
        Skip to canvas
      </a>
      <div className="brand">
        <svg className="mast-mark" viewBox="0 0 64 64" aria-hidden="true">
          <rect width="64" height="64" fill="#0c0d0f" />
          <rect x="12" y="14" width="40" height="36" fill="#fbfaf7" />
          <path
            d="M18 20h8M18 20v8M46 20h-8M46 20v8M18 44h8M18 44v-8M46 44h-8M46 44v-8"
            fill="none"
            stroke="#141414"
            strokeWidth="1.4"
          />
          <path d="M20 40h24" fill="none" stroke="#c23a4a" strokeWidth="1.6" />
        </svg>
        <div>
          <p className="wordmark">Simplfy</p>
          <p className="edition">visual study studio</p>
        </div>
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
      </div>
    </header>
  );
}
