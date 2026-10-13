import { useEffect, useRef, useState } from "react";
import { libraryNoteRoute, isSourcesRoute, resumeLearnRoute, resumeStepFromCanvas, toHash, type Route } from "../app/routes";
import { cx } from "../ui/cx";
import type { Theme } from "../app/useTheme";
import type { StudioApi } from "../studio/useStudio";

const SYNC_LABELS = {
  connecting: "Connecting",
  syncing: "Syncing",
  synced: "Synced",
  offline: "Offline",
  "signed-out": "Sign in",
  "action-needed": "Sync issue",
} as const;

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
  const searchRootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [popDismissed, setPopDismissed] = useState(false);
  const trimmed = api.query.trim();
  const hits = api.hits.slice(0, 8);
  const showPop = Boolean(trimmed) && !popDismissed;
  const rowCount = trimmed ? 1 + hits.length : 0;
  const sourceCount =
    api.library.length
    + api.collections.filter((collection) => !api.library.some((item) => item.collectionId === collection.id)).length;

  useEffect(() => {
    activeRef.current = 0;
    setActive(0);
    setPopDismissed(false);
  }, [trimmed]);

  useEffect(() => {
    if (!showPop) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = searchRootRef.current;
      if (!root || !(event.target instanceof Node) || root.contains(event.target)) return;
      setPopDismissed(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showPop]);

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

  const openRow = (index: number) => {
    if (!trimmed) return;
    if (index <= 0) {
      void api.touchPapers(trimmed);
      api.setQuery("");
      navigate({ name: "papers", q: trimmed });
      return;
    }
    const hit = hits[index - 1];
    if (!hit) return;
    api.setQuery("");
    if (hit.kind === "module") {
      void api.touchLesson(hit.module, "teach");
      navigate({ name: "learn", id: hit.module.id, step: "teach" });
      return;
    }
    void api.remember(`library:${hit.item.id}`);
    const filed = api.library.find((item) => item.id === hit.item.id);
    navigate(libraryNoteRoute(hit.item.id, filed?.collectionId));
  };

  const moveActive = (delta: number) => {
    if (!rowCount) return;
    const next = (activeRef.current + delta + rowCount) % rowCount;
    activeRef.current = next;
    setActive(next);
  };

  const optionId = (index: number) => {
    if (!rowCount) return undefined;
    if (index <= 0) return "search-opt-lookup";
    const hit = hits[index - 1];
    if (!hit) return "search-opt-lookup";
    return hit.kind === "module" ? `search-opt-m-${hit.module.id}` : `search-opt-l-${hit.item.id}`;
  };

  const shown = rowCount ? Math.min(active, rowCount - 1) : 0;
  const activeOptionId = optionId(shown);

  useEffect(() => {
    if (!activeOptionId) return;
    const el = document.getElementById(activeOptionId);
    const scroller = el?.closest(".search-pop");
    if (!el || !(scroller instanceof HTMLElement)) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < scroller.scrollTop) scroller.scrollTop = top;
    else if (bottom > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = bottom - scroller.clientHeight;
  }, [activeOptionId]);

  const resumeRoute = resumeLearnRoute(
    api.continueNote?.id,
    api.continueModule?.id,
    resumeStepFromCanvas(api.studios, api.continueNote?.id, api.continueModule?.id),
  );

  const nav: { route: Route; label: string; match: boolean }[] = [
    { route: { name: "home" }, label: "Home", match: route.name === "home" },
    { route: { name: "desk" }, label: "Sources", match: isSourcesRoute(route) },
    {
      route: resumeRoute,
      label: "Learn",
      match: route.name === "learn",
    },
    { route: { name: "shelf" }, label: "Shelf", match: route.name === "shelf" },
    { route: { name: "recall" }, label: "Recall", match: route.name === "recall" },
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
            {item.label === "Sources" && sourceCount ? (
              <span className="badge quiet" aria-hidden="true">
                {sourceCount}
              </span>
            ) : null}
            {item.label === "Recall" && api.recall.length ? (
              <span className="badge" aria-hidden="true">
                {api.recall.length}
              </span>
            ) : null}
          </a>
        ))}
      </nav>
      <div className="search-inline" ref={searchRootRef}>
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
            onFocus={() => setPopDismissed(false)}
            onKeyDown={(event) => {
              if (!trimmed) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (popDismissed) setPopDismissed(false);
                moveActive(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                if (popDismissed) setPopDismissed(false);
                moveActive(-1);
              } else if (event.key === "Escape") {
                event.preventDefault();
                if (!popDismissed) {
                  setPopDismissed(true);
                  return;
                }
                api.setQuery("");
              } else if (event.key === "Enter") {
                event.preventDefault();
                openRow(Math.min(activeRef.current, Math.max(rowCount - 1, 0)));
              }
            }}
            placeholder="TnSeq, prpD, CLT…"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showPop}
            aria-controls={showPop ? "studio-search-list" : undefined}
            aria-activedescendant={showPop ? activeOptionId : undefined}
          />
          <kbd>/</kbd>
        </div>
        {showPop ? (
          <div className="search-pop">
            <ul id="studio-search-list" role="listbox" aria-label="Search hits">
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  id="search-opt-lookup"
                  tabIndex={-1}
                  aria-selected={shown === 0}
                  className={cx("hit", shown === 0 && "is-active")}
                  onMouseEnter={() => {
                    activeRef.current = 0;
                    setActive(0);
                  }}
                  onClick={() => openRow(0)}
                >
                  <span className="domain library">Papers</span>
                  <span className="hit-title">Look up {trimmed}</span>
                </button>
              </li>
              {hits.map((hit, index) =>
                hit.kind === "module" ? (
                  <li key={`m-${hit.module.id}`} role="presentation">
                    <button
                      type="button"
                      role="option"
                      id={`search-opt-m-${hit.module.id}`}
                      tabIndex={-1}
                      aria-selected={shown === index + 1}
                      className={cx("hit", shown === index + 1 && "is-active")}
                      onMouseEnter={() => {
                        activeRef.current = index + 1;
                        setActive(index + 1);
                      }}
                      onClick={() => openRow(index + 1)}
                    >
                      <span className={cx("domain", hit.module.domain)}>{hit.module.domain === "tb" ? "TB" : "Stats"}</span>
                      <span className="hit-title">{hit.module.title}</span>
                    </button>
                  </li>
                ) : (
                  <li key={`l-${hit.item.id}`} role="presentation">
                    <button
                      type="button"
                      role="option"
                      id={`search-opt-l-${hit.item.id}`}
                      tabIndex={-1}
                      aria-selected={shown === index + 1}
                      className={cx("hit", shown === index + 1 && "is-active")}
                      onMouseEnter={() => {
                        activeRef.current = index + 1;
                        setActive(index + 1);
                      }}
                      onClick={() => openRow(index + 1)}
                    >
                      <span className="domain library">Local</span>
                      <span className="hit-title">{hit.item.name}</span>
                    </button>
                  </li>
                ),
              )}
            </ul>
            {hits.length === 0 ? <p className="hint">No plates for that term.</p> : null}
          </div>
        ) : null}
      </div>
      <div className="top-actions">
        <details className="sync-menu">
          <summary className={`ghost sync-trigger sync-${api.sync.status}`}>
            <span className="sync-dot" aria-hidden="true" />
            {SYNC_LABELS[api.sync.status]}
          </summary>
          <div className="sync-popover">
            <strong>{api.sync.user ? "Private cloud sync" : "Sync this study desk"}</strong>
            {api.sync.user ? (
              <p>{api.sync.user.displayName || api.sync.user.email || "Signed in with Google"}</p>
            ) : null}
            <p>{api.sync.message || "Sources, classes, canvases, recall cards, and your resume point are up to date."}</p>
            {api.sync.user ? (
              <button
                type="button"
                className="ghost"
                disabled={api.sync.signingOut}
                onClick={() => {
                  const confirmed = window.confirm(
                    "Sign out of Simplfy on this device? Simplfy will finish syncing, then remove the synced study desk here. Other signed-in devices keep the synced copy. Files and oversized notes that never reached the cloud stay on this device.",
                  );
                  if (confirmed) void api.sync.signOut();
                }}
              >
                {api.sync.signingOut ? "Finishing sync…" : "Sign out"}
              </button>
            ) : (
              <button type="button" className="solid" onClick={() => void api.sync.signIn()}>
                Sign in with Google
              </button>
            )}
          </div>
        </details>
        <button
          type="button"
          className="ghost theme-toggle"
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
}
