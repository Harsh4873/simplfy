import { useEffect, useRef } from "react";
import { toHash, type Route } from "../app/routes";
import { cx } from "../ui/cx";
import type { Theme } from "../app/useTheme";
import type { StudioApi } from "../studio/useStudio";

export function TopBar({
  api,
  route,
  navigate,
  theme,
  onToggleTheme,
}: {
  api: StudioApi;
  route: Route;
  navigate: (next: Route) => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLInputElement)
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openTopHit = () => {
    const first = api.hits[0];
    if (!first) return;
    api.setQuery("");
    if (first.kind === "module") {
      void api.remember(`module:${first.module.id}`);
      navigate({ name: "learn", id: first.module.id, step: "teach" });
    } else {
      void api.remember(`library:${first.item.id}`);
      navigate({ name: "notes", id: first.item.id });
    }
  };

  const nav: { route: Route; label: string; match: boolean }[] = [
    { route: { name: "home" }, label: "Home", match: route.name === "home" },
    {
      route: api.continueModule
        ? { name: "learn", id: api.continueModule.id, step: "teach" }
        : { name: "shelf" },
      label: "Learn",
      match: route.name === "learn",
    },
    { route: { name: "shelf" }, label: "Shelf", match: route.name === "shelf" },
    { route: { name: "recall" }, label: "Recall", match: route.name === "recall" },
    { route: { name: "notes" }, label: "Notes", match: route.name === "notes" },
  ];

  return (
    <header className="topbar">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <button type="button" className="brand" onClick={() => navigate({ name: "home" })}>
        <svg className="mast-mark" viewBox="0 0 64 64" aria-hidden="true">
          <rect width="64" height="64" fill="currentColor" className="mark-bg" />
          <rect x="12" y="14" width="40" height="36" className="mark-paper" />
          <path
            d="M18 20h8M18 20v8M46 20h-8M46 20v8M18 44h8M18 44v-8M46 44h-8M46 44v-8"
            fill="none"
            className="mark-ink"
            strokeWidth="1.4"
          />
          <path d="M20 40h24" fill="none" className="mark-accent" strokeWidth="1.6" />
        </svg>
        <span>
          <span className="wordmark">Simplfy</span>
          <span className="edition">study buddy</span>
        </span>
      </button>
      <nav className="nav" aria-label="Primary">
        {nav.map((item) => (
          <a
            key={item.label}
            className={cx("nav-link", item.match && "is-active")}
            href={toHash(item.route)}
            onClick={(event) => {
              event.preventDefault();
              navigate(item.route);
            }}
          >
            {item.label}
            {item.label === "Recall" && api.recall.length ? (
              <span className="badge">{api.recall.length}</span>
            ) : null}
          </a>
        ))}
      </nav>
      <div className="search-inline">
        <label className="search-label" htmlFor="studio-search">
          Name a term
        </label>
        <div className="search-row">
          <input
            ref={searchRef}
            id="studio-search"
            type="search"
            value={api.query}
            onChange={(event) => api.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") openTopHit();
            }}
            placeholder="LRT, rpoB, PZA…"
            autoComplete="off"
            aria-autocomplete="list"
          />
          <kbd>/</kbd>
        </div>
        {api.query.trim() ? (
          <ul className="search-pop" role="listbox" aria-label="Search hits">
            {api.hits.slice(0, 8).map((hit) =>
              hit.kind === "module" ? (
                <li key={`m-${hit.module.id}`}>
                  <button
                    type="button"
                    className="hit"
                    onClick={() => {
                      void api.remember(`module:${hit.module.id}`);
                      api.setQuery("");
                      navigate({ name: "learn", id: hit.module.id, step: "teach" });
                    }}
                  >
                    <span className={cx("domain", hit.module.domain)}>{hit.module.domain === "tb" ? "TB" : "Stats"}</span>
                    <span className="hit-title">{hit.module.title}</span>
                  </button>
                </li>
              ) : (
                <li key={`l-${hit.item.id}`}>
                  <button
                    type="button"
                    className="hit"
                    onClick={() => {
                      void api.remember(`library:${hit.item.id}`);
                      api.setQuery("");
                      navigate({ name: "notes", id: hit.item.id });
                    }}
                  >
                    <span className="domain library">Local</span>
                    <span className="hit-title">{hit.item.name}</span>
                  </button>
                </li>
              ),
            )}
            {api.hits.length === 0 ? <li className="hint">No plates for that term.</li> : null}
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        className="ghost theme-toggle"
        onClick={onToggleTheme}
        aria-pressed={theme === "dark"}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>
    </header>
  );
}
