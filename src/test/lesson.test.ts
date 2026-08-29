import { describe, expect, it } from "vitest";
import { parseHash, toHash } from "../app/routes";
import { loadCatalog } from "../catalog/loadCatalog";
import { lessonFromModule } from "../lesson/fromModule";
import { lessonFromNote } from "../lesson/fromNote";
import { LESSON_OVERLAYS } from "../lesson/overlays";

describe("hash routes", () => {
  it("parses lesson steps and round-trips", () => {
    expect(parseHash("")).toEqual({ name: "home" });
    expect(parseHash("#/learn/file/note-9/teach")).toEqual({
      name: "learn",
      id: "note-9",
      step: "teach",
      kind: "file",
    });
    expect(toHash({ name: "learn", id: "note-9", step: "teach", kind: "file" })).toBe("#/learn/file/note-9/teach");
    expect(parseHash("#/learn")).toEqual({ name: "shelf" });
    expect(parseHash("#/learn/stats-lrt/practice")).toEqual({
      name: "learn",
      id: "stats-lrt",
      step: "practice",
    });
    expect(parseHash("#/learn/stats-lrt")).toEqual({ name: "learn", id: "stats-lrt", step: "teach" });
    expect(parseHash("#/learn/file/note-9/teach")).toEqual({
      name: "learn",
      id: "note-9",
      step: "teach",
      kind: "file",
    });
    expect(toHash({ name: "learn", id: "note-9", step: "teach", kind: "file" })).toBe("#/learn/file/note-9/teach");
    expect(toHash({ name: "notes", id: "abc" })).toBe("#/notes/abc");
    expect(toHash({ name: "desk" })).toBe("#/sources/decks");
    expect(parseHash("#/desk")).toEqual({ name: "desk" });
    expect(parseHash("#/sources")).toEqual({ name: "desk" });
    expect(parseHash("#/sources/classes")).toEqual({ name: "notes" });
    expect(parseHash("#/notes/c/class-1")).toEqual({ name: "notes", classId: "class-1" });
    expect(toHash({ name: "notes" })).toBe("#/sources/classes");
    expect(toHash({ name: "notes", classId: "class-1" })).toBe("#/sources/classes/c/class-1");
    expect(toHash({ name: "notes", classId: "class-1", id: "file-9" })).toBe("#/sources/classes/c/class-1/file-9");
    expect(parseHash("#/notes/c/class-1/file-9")).toEqual({ name: "notes", classId: "class-1", id: "file-9" });
    expect(parseHash("#/sources/classes/c/class-1/file-9")).toEqual({ name: "notes", classId: "class-1", id: "file-9" });
    expect(parseHash("#/recall/c/class-1")).toEqual({ name: "recall", classId: "class-1" });
    expect(parseHash("#/recall/n/note-9")).toEqual({ name: "recall", noteId: "note-9" });
    expect(toHash({ name: "recall", noteId: "note-9" })).toBe("#/recall/n/note-9");
    expect(parseHash("#/decks")).toEqual({ name: "desk" });
  });
});

describe("lessons", () => {
  it("uses authored tutor scripts for flagship plates", () => {
    const { modules } = loadCatalog();
    const lrt = modules.find((module) => module.id === "stats-lrt")!;
    const tnseq = modules.find((module) => module.id === "tb-tnseq-transit")!;
    const clt = modules.find((module) => module.id === "stats-normal-clt")!;
    expect(lessonFromModule(lrt).overlay.analogy.title).toMatch(/pizza/i);
    expect(lessonFromModule(tnseq).overlay.analogy.title).toMatch(/broken keys/i);
    expect(lessonFromModule(clt).overlay.analogy.title).toMatch(/dice/i);
  });

  it("derives a lesson spine for every other plate", () => {
    const { modules } = loadCatalog();
    for (const module of modules) {
      const lesson = lessonFromModule(module);
      expect(lesson.overlay.plain.length).toBeGreaterThan(0);
      expect(lesson.overlay.analogy.title.length).toBeGreaterThan(4);
      expect(lesson.overlay.sayBackPrompt.length).toBeGreaterThan(20);
      expect(lesson.overlay.watchFor.length).toBeGreaterThan(0);
      if (LESSON_OVERLAYS[module.id]) {
        expect(lesson.overlay.analogy.body).toBe(LESSON_OVERLAYS[module.id].analogy.body);
      }
    }
  });

  it("builds a lesson from a class file instead of a catalogue plate", () => {
    const lesson = lessonFromNote({
      id: "note-dfa",
      kind: "note",
      name: "last-class.md",
      mime: "text/markdown",
      size: 40,
      text: "# Last class\n\n## DFA 5-tuple\n\nA DFA is the 5-tuple (Q, Sigma, delta, q0, F). Accept states may be empty or many.\n",
      createdAt: 1,
      collectionId: "class-1",
    });
    expect(lesson.title).toMatch(/last class|dfa/i);
    expect(lesson.steps.some((step) => /dfa/i.test(step.title) || /5-tuple/i.test(step.body))).toBe(true);
    expect(lesson.plain.join(" ")).not.toMatch(/tnseq|transit|ioerger/i);
  });
});
