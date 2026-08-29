import type { Route, SourceTab } from "../app/routes";
import { isSourcesRoute, sourcesRoute } from "../app/routes";
import { isPaperItem } from "../library/paperText";
import type { StudioApi } from "../studio/useStudio";
import { cx } from "../ui/cx";
import { DeskPage } from "./DeskPage";
import { NotesPage } from "./NotesPage";
import { PapersPage } from "./PapersPage";

function activeTab(route: Route, api: StudioApi): SourceTab {
  if (route.name === "desk") return "decks";
  if (route.name === "papers") return "papers";
  if (route.name === "notes" && route.classId) return "classes";
  if (route.name === "notes" && route.id) {
    const item = api.library.find((row) => row.id === route.id);
    if (item?.collectionId) return "classes";
    if (item && isPaperItem(item)) return "papers";
    return "decks";
  }
  return "classes";
}

export function SourcesPage({
  api,
  route,
  navigate,
}: {
  api: StudioApi;
  route: Route;
  navigate: (next: Route) => void;
}) {
  if (!isSourcesRoute(route)) return null;
  const tab = activeTab(route, api);

  return (
    <div className="sources-shell">
      <div className="source-tabs-wrap">
        <div className="chips source-tabs" role="tablist" aria-label="Source type">
          {(["decks", "classes", "papers"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={cx("chip", tab === name && "is-active")}
              onClick={() => navigate(sourcesRoute(name))}
            >
              {name[0]?.toUpperCase()}
              {name.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {route.name === "desk" ? <DeskPage api={api} navigate={navigate} /> : null}
      {route.name === "notes" ? <NotesPage api={api} id={route.id} classId={route.classId} navigate={navigate} /> : null}
      {route.name === "papers" ? <PapersPage api={api} q={route.q} navigate={navigate} /> : null}
    </div>
  );
}
