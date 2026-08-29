import type { Route } from "../app/routes";
import { isLessonStep, libraryNoteRoute, recallNoteRoute } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import type { StudioCanvas } from "../library/db";
import { relatedForLibraryItem } from "../library/fieldNote";
import { isPaperItem } from "../library/paperText";
import { cx } from "../ui/cx";

export function openSourceCanvas(canvas: StudioCanvas, api: StudioApi, navigate: (route: Route) => void) {
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
    const cards = api.recall.filter((card) => card.noteId === canvas.noteId);
    if (cards.length) {
      navigate(recallNoteRoute(canvas.noteId));
      return;
    }
    navigate(libraryNoteRoute(canvas.noteId, canvas.collectionId));
    return;
  }
  navigate({ name: "papers", q: canvas.papersQuery || undefined });
}

export function SourceCard({
  canvas,
  api,
  navigate,
  collectionName,
}: {
  canvas: StudioCanvas;
  api: StudioApi;
  navigate: (route: Route) => void;
  collectionName?: string;
}) {
  const note = canvas.noteId ? api.library.find((row) => row.id === canvas.noteId) : undefined;
  const noteCards = canvas.noteId ? api.recall.filter((card) => card.noteId === canvas.noteId).length : 0;
  const classCards =
    canvas.kind === "class" && canvas.collectionId
      ? api.recall.filter((card) => card.collectionId === canvas.collectionId && card.noteId).length
      : 0;
  const paper = note ? isPaperItem(note) : false;
  const lesson = canvas.kind === "lesson" ? canvas : undefined;
  const related = note && !canvas.collectionId ? relatedForLibraryItem(note, api.modules)[0] : undefined;
  const learnId = lesson?.moduleId ?? related?.id;
  const learnStep = lesson?.step && isLessonStep(lesson.step) ? lesson.step : "teach";
  const kindLabel =
    canvas.kind === "lesson"
      ? "Lesson"
      : canvas.kind === "note"
        ? noteCards
          ? `${paper ? "Paper" : "Deck"} · ${noteCards} card${noteCards === 1 ? "" : "s"}`
          : paper
            ? "Paper"
            : "Note"
        : canvas.kind === "class"
          ? "Class"
          : "Catalogue lookup";
  return (
    <li className={cx("desk-card", canvas.pinned && "is-pinned")}>
      <button type="button" className="desk-open" onClick={() => openSourceCanvas(canvas, api, navigate)}>
        <span className="kicker">
          {kindLabel}
          {canvas.step ? ` · ${canvas.step}` : ""}
          {collectionName ? ` · ${collectionName}` : ""}
        </span>
        <span className="hit-title">{canvas.title}</span>
        <span className="muted">{new Date(canvas.updatedAt).toLocaleString()}</span>
      </button>
      <div className="step-nav">
        {canvas.kind === "note" && canvas.noteId && noteCards ? (
          <button type="button" className="solid" onClick={() => navigate(recallNoteRoute(canvas.noteId!))}>
            Study
          </button>
        ) : null}
        {canvas.kind === "class" && canvas.collectionId && classCards ? (
          <button type="button" className="solid" onClick={() => navigate({ name: "recall", classId: canvas.collectionId })}>
            Study
          </button>
        ) : null}
        {learnId ? (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              const module = api.byId.get(learnId);
              if (module) void api.touchLesson(module, learnStep);
              navigate({ name: "learn", id: learnId, step: learnStep });
            }}
          >
            Open in Learn
          </button>
        ) : null}
        {canvas.kind === "note" && canvas.noteId ? (
          <button
            type="button"
            className="ghost"
            onClick={() => navigate(libraryNoteRoute(canvas.noteId!, canvas.collectionId))}
          >
            Open source
          </button>
        ) : null}
        {canvas.kind === "class" && canvas.collectionId ? (
          <button type="button" className="ghost" onClick={() => navigate({ name: "notes", classId: canvas.collectionId })}>
            Open source
          </button>
        ) : null}
        <button type="button" className="ghost" onClick={() => void api.pinStudio(canvas.id, !canvas.pinned)}>
          {canvas.pinned ? "Unpin" : "Pin to Home"}
        </button>
        <button type="button" className="ghost danger" onClick={() => void api.removeStudio(canvas.id)}>
          Remove
        </button>
      </div>
    </li>
  );
}
