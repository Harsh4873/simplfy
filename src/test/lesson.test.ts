import { describe, expect, it } from "vitest";
import { parseHash, toHash } from "../app/routes";
import { loadCatalog } from "../catalog/loadCatalog";
import { lessonFromModule } from "../lesson/fromModule";
import { LESSON_OVERLAYS } from "../lesson/overlays";

describe("hash routes", () => {
  it("parses lesson steps and round-trips", () => {
    expect(parseHash("")).toEqual({ name: "home" });
    expect(parseHash("#/learn/stats-lrt/practice")).toEqual({
      name: "learn",
      id: "stats-lrt",
      step: "practice",
    });
    expect(parseHash("#/learn/stats-lrt")).toEqual({ name: "learn", id: "stats-lrt", step: "teach" });
    expect(toHash({ name: "notes", id: "abc" })).toBe("#/notes/abc");
  });
});

describe("lessons", () => {
  it("uses authored tutor scripts for flagship plates", () => {
    const { modules } = loadCatalog();
    const lrt = modules.find((module) => module.id === "stats-lrt")!;
    const lesson = lessonFromModule(lrt);
    expect(lesson.featured).toBe(true);
    expect(lesson.overlay.analogy.title).toMatch(/pizza/i);
    expect(lesson.overlay.sayBackModel).toMatch(/nested/i);
  });

  it("derives a five-beat lesson for every other plate", () => {
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
});
