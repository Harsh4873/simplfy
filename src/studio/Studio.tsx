import { Component, useEffect, useRef, type ReactNode } from "react";
import { TopBar } from "../chrome/TopBar";
import { useRoute } from "../app/useRoute";
import { isSourcesRoute, routeDocumentTitle, toHash, type Route } from "../app/routes";
import { useTheme } from "../app/useTheme";
import { SourcesPage } from "../pages/SourcesPage";
import { HomePage } from "../pages/HomePage";
import { LearnPage } from "../pages/LearnPage";
import { FileLearnPage } from "../pages/FileLearnPage";
import { RecallPage } from "../pages/RecallPage";
import { ShelfPage } from "../pages/ShelfPage";
import { useStudio } from "./useStudio";

function routeDetail(
  route: Route,
  api: ReturnType<typeof useStudio>,
  fileName?: string,
): string | undefined {
  if (route.name === "learn" && route.kind === "file") return fileName;
  if (route.name === "learn") return api.byId.get(route.id)?.title;
  if (route.name === "shelf") return route.id ? api.byId.get(route.id)?.title : undefined;
  if (route.name === "papers") return route.q;
  if (route.name === "notes") {
    if (route.id) return api.library.find((item) => item.id === route.id)?.name;
    if (route.classId) return api.collections.find((row) => row.id === route.classId)?.name;
  }
  return undefined;
}

function scrollRouteToTop() {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
}

function focusRouteHeading() {
  const heading = document.getElementById("main")?.querySelector("h1");
  if (!(heading instanceof HTMLElement)) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  scrollRouteToTop();
}

class StageBoundary extends Component<{ resetKey: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main id="main" className="stage" tabIndex={-1}>
          <div className="page">
            <h1>This page hit a problem</h1>
            <p className="lede">The header is still available. Open another section, or reload if this page stays stuck.</p>
            <p className="hint">{this.state.error.message}</p>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export function Studio() {
  const api = useStudio();
  const { route, navigate } = useRoute();
  const { theme, toggleTheme } = useTheme();
  const fileLesson =
    route.name === "learn" && route.kind === "file"
      ? api.library.find((item) => item.id === route.id)
      : undefined;
  const title = routeDocumentTitle(route, routeDetail(route, api, fileLesson?.name));
  const routeKey = toHash(route);
  const titleRef = useRef(title);
  titleRef.current = title;

  useEffect(() => {
    document.title = titleRef.current;
  }, [title]);

  useEffect(() => {
    document.title = titleRef.current;
    scrollRouteToTop();
    focusRouteHeading();
  }, [routeKey]);

  useEffect(() => {
    const active = document.activeElement;
    const main = document.getElementById("main");
    const idle = !active || active === document.body || active === document.documentElement || active === main;
    if (!idle) return;
    focusRouteHeading();
  }, [routeKey, title, api.ready]);

  useEffect(() => {
    const bar = document.querySelector(".topbar");
    if (!(bar instanceof HTMLElement)) return;
    const apply = () => {
      document.documentElement.style.setProperty(
        "--topbar-height",
        `${Math.ceil(bar.getBoundingClientRect().height)}px`,
      );
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

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
          {api.errors.length} catalogue file{api.errors.length === 1 ? "" : "s"} failed validation.{" "}
          {api.errors
            .slice(0, 4)
            .map((entry) => `${entry.file}: ${entry.issues.map((issue) => issue.message).slice(0, 2).join("; ")}`)
            .join(" ")}
        </p>
      ) : null}
      <StageBoundary resetKey={routeKey}>
        <main id="main" className="stage" tabIndex={-1}>
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
      </StageBoundary>
    </div>
  );
}
