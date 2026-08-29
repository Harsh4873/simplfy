import { useMemo, useState } from "react";
import { lessonFromModule } from "../lesson/fromModule";
import { libraryNoteRoute, recallNoteRoute, type Route } from "../app/routes";
import type { StudioApi } from "../studio/useStudio";
import type { RecallCard } from "../library/db";
import { cx } from "../ui/cx";

function cardAnswer(api: StudioApi, card: RecallCard): { title: string; answer: string; why: string } {
  if (card.answer) {
    const note = card.noteId ? api.library.find((item) => item.id === card.noteId) : undefined;
    const label = note?.relPath?.split("/").pop() || note?.name || "From notes";
    return { title: label, answer: card.answer, why: "" };
  }
  const module = api.byId.get(card.moduleId);
  if (!module) return { title: "Unknown plate", answer: "This plate is no longer in the catalogue.", why: "" };
  if (card.checkId === "say-back") {
    const overlay = lessonFromModule(module).overlay;
    return { title: module.title, answer: overlay.sayBackModel, why: overlay.sayBackPrompt };
  }
  const item = module.check.find((row) => row.id === card.checkId);
  return {
    title: module.title,
    answer: item?.answer ?? "Answer missing.",
    why: item?.why ?? "",
  };
}

export function RecallPage({
  api,
  classId,
  noteId,
  navigate,
}: {
  api: StudioApi;
  classId?: string;
  noteId?: string;
  navigate: (route: Route) => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = noteId
    ? api.recall.filter((card) => card.noteId === noteId)
    : classId
      ? api.recall.filter((card) => card.collectionId === classId)
      : api.recall;
  const card = cards[Math.min(index, Math.max(cards.length - 1, 0))];
  const currentClass = classId ? api.collections.find((row) => row.id === classId) : undefined;
  const currentNote = noteId ? api.library.find((item) => item.id === noteId) : undefined;
  const noteDecks = api.library.filter((item) => api.recall.some((card) => card.noteId === item.id));

  const face = useMemo(() => (card ? cardAnswer(api, card) : null), [api, card]);
  const scopeLabel = currentNote?.name ?? currentClass?.name;

  if (!card || !face) {
    return (
      <div className="page">
        <p className="kicker">Quizlet-style deck{scopeLabel ? ` · ${scopeLabel}` : ""}</p>
        <h1>{scopeLabel ? `${scopeLabel} is empty` : "Deck empty"}</h1>
        <p className="lede">
          {currentNote
            ? "This dump needs headings or longer paragraphs before we can cut flip cards. Open the source and add ## sections."
            : currentClass
              ? "Drop an update folder into this class, or paste markdown. We cut recall cards from those notes."
              : "Paste a markdown dump under Classes, drop a class pack, or miss a catalogue check. Then flip here."}
        </p>
        <button
          type="button"
          className="solid"
          onClick={() => navigate(currentNote ? libraryNoteRoute(currentNote.id, currentNote.collectionId) : { name: "notes" })}
        >
          {currentNote ? "Open source" : "Paste a dump"}
        </button>
      </div>
    );
  }

  const next = () => {
    setFlipped(false);
    setIndex((n) => (n + 1) % cards.length);
  };

  return (
    <div className="page recall-page">
      <p className="kicker">
        Recall{scopeLabel ? ` · ${scopeLabel}` : ""} · {Math.min(index, cards.length - 1) + 1} / {cards.length}
      </p>
      <h1>Flip until it sticks</h1>
      {api.collections.length || noteDecks.length ? (
        <div className="chips" role="tablist" aria-label="Recall by deck">
          <button
            type="button"
            className={cx("chip", !classId && !noteId && "is-active")}
            onClick={() => navigate({ name: "recall" })}
          >
            All
          </button>
          {noteDecks.slice(0, 8).map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx("chip", noteId === item.id && "is-active")}
              onClick={() => navigate(recallNoteRoute(item.id))}
            >
              {item.name}
            </button>
          ))}
          {api.collections.map((row) => (
            <button
              key={row.id}
              type="button"
              className={cx("chip", classId === row.id && !noteId && "is-active")}
              onClick={() => navigate({ name: "recall", classId: row.id })}
            >
              {row.name}
            </button>
          ))}
        </div>
      ) : null}
      <p className="lede">
        Front is the prompt. Back is the answer you should be able to say. “Still shaky” keeps the
        card and bumps the miss count. “Knew it” takes it off the deck.
      </p>
      <button
        type="button"
        className={flipped ? "flip-card is-flipped" : "flip-card"}
        onClick={() => setFlipped((value) => !value)}
        aria-pressed={flipped}
      >
        <p className="kicker">
          {card.kind} · {face.title} · missed {card.misses}×
        </p>
        {flipped ? (
          <>
            <p className="prompt">{face.answer}</p>
            {face.why ? <p className="hint">{face.why}</p> : null}
            <p className="muted">Click to hide</p>
          </>
        ) : (
          <>
            <p className="prompt">{card.prompt}</p>
            <p className="muted">Click to flip</p>
          </>
        )}
      </button>
      <div className="step-nav">
        <button
          type="button"
          className="solid quiet"
          onClick={() => {
            void api.clearRecall(card.id);
            setFlipped(false);
          }}
        >
          Knew it
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            void api.bumpRecall(card.id);
            next();
          }}
        >
          Still shaky
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            if (card.noteId) {
              const note = api.library.find((item) => item.id === card.noteId);
              navigate(note ? libraryNoteRoute(note.id, note.collectionId) : { name: "notes", id: card.noteId });
              return;
            }
            const module = api.byId.get(card.moduleId);
            if (module) navigate({ name: "learn", id: module.id, step: "teach" });
          }}
        >
          {card.noteId ? "Open source" : "Open lesson"}
        </button>
      </div>
    </div>
  );
}
