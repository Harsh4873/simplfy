import type { Route } from "../app/routes";
import { isLessonStep, libraryNoteRoute } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import type { StudioCanvas } from "../library/db";
import { cx } from "../ui/cx";

function openCanvas(canvas: StudioCanvas, navigate: (route: Route) => void) {
  if (canvas.kind === "class" && canvas.collectionId) {
    navigate({ name: "notes", classId: canvas.collectionId });
    return;
  }
  if (canvas.kind === "lesson" && canvas.moduleId) {
    const step = canvas.step && isLessonStep(canvas.step) ? canvas.step : "teach";
    navigate({ name: "learn", id: canvas.moduleId, step });
    return;
  }
  if (canvas.kind === "note" && canvas.noteId) {
    navigate(libraryNoteRoute(canvas.noteId, canvas.collectionId));
    return;
  }
  navigate({ name: "papers", q: canvas.papersQuery || undefined });
}

export function DeskPage({
  api,
  navigate,
}: {
  api: StudioApi;
  navigate: (route: Route) => void;
}) {
  const collectionName = (id: string | undefined) =>
    id ? api.collections.find((row) => row.id === id)?.name : undefined;

  const grouped = (() => {
    const pinned = api.studios.filter((row) => row.pinned);
    const buckets = new Map<string, StudioCanvas[]>();
    const loose: StudioCanvas[] = [];
    for (const canvas of api.studios) {
      if (canvas.pinned || canvas.kind === "class") continue;
      if (canvas.collectionId) {
        const list = buckets.get(canvas.collectionId) ?? [];
        list.push(canvas);
        buckets.set(canvas.collectionId, list);
      } else {
        loose.push(canvas);
      }
    }
    const classes = api.collections
      .filter((row) => buckets.has(row.id))
      .map((row) => ({ collection: row, canvases: buckets.get(row.id) ?? [] }));
    for (const [id, canvases] of buckets) {
      if (!classes.some((row) => row.collection.id === id)) {
        classes.push({ collection: { id, name: "Class", createdAt: 0, updatedAt: 0 }, canvases });
      }
    }
    return { classes, loose, pinned };
  })();

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">This device</p>
        <h1>Desk</h1>
        <p className="lede">
          Canvases are grouped by class — the folder you dropped lecture notes into. Pinned cards
          stay on top. Nothing syncs off this machine.
        </p>
      </header>
      {api.studios.length === 0 ? (
        <p className="lede">Desk is empty. Drop a class folder under Classes, or start a guided lesson.</p>
      ) : null}
      {grouped.pinned.length ? (
        <section>
          <h2 className="section-title">Pinned</h2>
          <ul className="desk-grid">
            {grouped.pinned.map((canvas) => (
              <CanvasCard key={canvas.id} canvas={canvas} api={api} navigate={navigate} className={collectionName(canvas.collectionId)} />
            ))}
          </ul>
        </section>
      ) : null}
      {grouped.classes.map(({ collection, canvases }) => (
        <section key={collection.id}>
          <h2 className="section-title">
            <button type="button" className="text-btn" onClick={() => navigate({ name: "notes", classId: collection.id })}>
              {collection.name}
            </button>
          </h2>
          <ul className="desk-grid">
            {canvases.map((canvas) => (
              <CanvasCard key={canvas.id} canvas={canvas} api={api} navigate={navigate} />
            ))}
          </ul>
        </section>
      ))}
      {grouped.loose.length ? (
        <section>
          <h2 className="section-title">Ungrouped</h2>
          <ul className="desk-grid">
            {grouped.loose.map((canvas) => (
              <CanvasCard key={canvas.id} canvas={canvas} api={api} navigate={navigate} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function CanvasCard({
  canvas,
  api,
  navigate,
  className,
}: {
  canvas: StudioCanvas;
  api: StudioApi;
  navigate: (route: Route) => void;
  className?: string;
}) {
  const kindLabel =
    canvas.kind === "lesson" ? "Lesson" : canvas.kind === "note" ? "Note" : canvas.kind === "class" ? "Class" : "Papers";
  return (
    <li className={cx("desk-card", canvas.pinned && "is-pinned")}>
      <button type="button" className="desk-open" onClick={() => openCanvas(canvas, navigate)}>
        <span className="kicker">
          {kindLabel}
          {canvas.step ? ` · ${canvas.step}` : ""}
          {className ? ` · ${className}` : ""}
        </span>
        <span className="hit-title">{canvas.title}</span>
        <span className="muted">{new Date(canvas.updatedAt).toLocaleString()}</span>
      </button>
      <div className="step-nav">
        <button type="button" className="ghost" onClick={() => void api.pinStudio(canvas.id, !canvas.pinned)}>
          {canvas.pinned ? "Unpin" : "Pin"}
        </button>
        <button type="button" className="ghost danger" onClick={() => void api.removeStudio(canvas.id)}>
          Remove
        </button>
      </div>
    </li>
  );
}
