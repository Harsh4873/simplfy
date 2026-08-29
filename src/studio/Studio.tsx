import { TopBar } from "../chrome/TopBar";
import { useRoute } from "../app/useRoute";
import { useTheme } from "../app/useTheme";
import { SourcesPage } from "../pages/SourcesPage";
import { HomePage } from "../pages/HomePage";
import { LearnPage } from "../pages/LearnPage";
import { RecallPage } from "../pages/RecallPage";
import { ShelfPage } from "../pages/ShelfPage";
import { isSourcesRoute } from "../app/routes";
import { useStudio } from "./useStudio";

export function Studio() {
  const api = useStudio();
  const { route, navigate } = useRoute();
  const { theme, toggleTheme } = useTheme();

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
        {route.name === "learn" ? (
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
