import type { Route } from "../app/routes";
import { isLessonStep } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import type { StudioCanvas } from "../library/db";
import { cx } from "../ui/cx";

function openCanvas(canvas: StudioCanvas, navigate: (route: Route) => void) {
  if (canvas.kind === "lesson" && canvas.moduleId) {
    const step = canvas.step && isLessonStep(canvas.step) ? canvas.step : "teach";
    navigate({ name: "learn", id: canvas.moduleId, step });
    return;
  }
  if (canvas.kind === "note" && canvas.noteId) {
    navigate({ name: "notes", id: canvas.noteId });
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
  const pinned = api.studios.filter((row) => row.pinned);
  const recent = api.studios.filter((row) => !row.pinned);

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">This device</p>
        <h1>Desk</h1>
        <p className="lede">
          Every lesson, note, and papers lookup you open stays here as a canvas. Come back and you
          drop into the same tab you left. Pinned canvases sit on top. Nothing syncs to another
          machine.
        </p>
      </header>
      {api.studios.length === 0 ? (
        <p className="lede">Desk is empty. Search a term or start a guided lesson and it will land here.</p>
      ) : null}
      {pinned.length ? (
        <section>
          <h2 className="section-title">Pinned</h2>
          <ul className="desk-grid">
            {pinned.map((canvas) => (
              <CanvasCard key={canvas.id} canvas={canvas} api={api} navigate={navigate} />
            ))}
          </ul>
        </section>
      ) : null}
      {recent.length ? (
        <section>
          <h2 className="section-title">Recent canvases</h2>
          <ul className="desk-grid">
            {recent.map((canvas) => (
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
}: {
  canvas: StudioCanvas;
  api: StudioApi;
  navigate: (route: Route) => void;
}) {
  const kindLabel = canvas.kind === "lesson" ? "Lesson" : canvas.kind === "note" ? "Note" : "Papers";
  return (
    <li className={cx("desk-card", canvas.pinned && "is-pinned")}>
      <button type="button" className="desk-open" onClick={() => openCanvas(canvas, navigate)}>
        <span className="kicker">{kindLabel}{canvas.step ? ` · ${canvas.step}` : ""}</span>
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
