import { TopBar } from "../chrome/TopBar";
import { useRoute } from "../app/useRoute";
import { useTheme } from "../app/useTheme";
import { SourcesPage } from "../pages/SourcesPage";
import { HomePage } from "../pages/HomePage";
import { LearnPage } from "../pages/LearnPage";
import { FileLearnPage } from "../pages/FileLearnPage";
import { RecallPage } from "../pages/RecallPage";
import { ShelfPage } from "../pages/ShelfPage";
import { isSourcesRoute } from "../app/routes";
import { useStudio } from "./useStudio";

export function Studio() {
  const api = useStudio();
  const { route, navigate } = useRoute();
  const { theme, toggleTheme } = useTheme();
  const fileLesson =
    route.name === "learn" && route.kind === "file"
      ? api.library.find((item) => item.id === route.id)
      : undefined;

  return (
    <div className="shell">
      <TopBar api={api} route={route} navigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
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
      <main id="main" className="stage">
        {route.name === "home" ? <HomePage api={api} navigate={navigate} /> : null}
        {isSourcesRoute(route) ? <SourcesPage api={api} route={route} navigate={navigate} /> : null}
        {route.name === "learn" && route.kind === "file" ? (
          fileLesson ? (
            <FileLearnPage api={api} item={fileLesson} step={route.step} navigate={navigate} />
          ) : api.ready ? (
            <div className="page">
              <h1>That file is not on this desk</h1>
              <p className="lede">Open it from Sources → Classes. Catalogue lessons live under Shelf.</p>
            </div>
          ) : null
        ) : null}
        {route.name === "learn" && route.kind !== "file" ? (
          <LearnPage api={api} id={route.id} step={route.step} navigate={navigate} />
        ) : null}
        {route.name === "shelf" ? <ShelfPage api={api} id={route.id} navigate={navigate} /> : null}
        {route.name === "recall" ? (
          <RecallPage api={api} classId={route.classId} noteId={route.noteId} navigate={navigate} />
        ) : null}
      </main>
    </div>
  );
}
