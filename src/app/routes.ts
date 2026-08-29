export const LESSON_STEPS = ["teach", "example", "practice", "say-back", "shelf", "papers"] as const;
export const FILE_LESSON_STEPS = ["teach", "example", "practice", "say-back"] as const;

export type LessonStep = (typeof LESSON_STEPS)[number];

export type SourceTab = "decks" | "classes" | "papers";

export type Route =
  | { name: "home" }
  | { name: "desk" }
  | { name: "learn"; id: string; step: LessonStep; kind?: "file" }
  | { name: "shelf"; id?: string }
  | { name: "papers"; q?: string }
  | { name: "recall"; classId?: string; noteId?: string }
  | { name: "notes"; id?: string; classId?: string };

export const STEP_META: Record<LessonStep, { n: number; label: string; hint: string }> = {
  teach: { n: 1, label: "Teach", hint: "Simple words, an analogy, the figure" },
  example: { n: 2, label: "Example", hint: "We work one problem" },
  practice: { n: 3, label: "Practice", hint: "You try two or three" },
  "say-back": { n: 4, label: "Say it back", hint: "Explain it in your own words" },
  shelf: { n: 5, label: "Shelf", hint: "The dense notes when you are ready" },
  papers: { n: 6, label: "Papers", hint: "Ioerger first, then the field, then explainers" },
};

export function isSourcesRoute(route: Route): boolean {
  return route.name === "desk" || route.name === "notes" || route.name === "papers";
}

export function sourcesRoute(tab: SourceTab): Route {
  if (tab === "decks") return { name: "desk" };
  if (tab === "papers") return { name: "papers" };
  return { name: "notes" };
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "").replace(/^\/+/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  const [head, id, step] = parts;
  if (head === "learn") {
    if (id === "file" && parts[2]) {
      const fileId = decodeURIComponent(parts[2] ?? "");
      const next = LESSON_STEPS.includes(parts[3] as LessonStep) ? (parts[3] as LessonStep) : "teach";
      return { name: "learn", id: fileId, step: next, kind: "file" };
    }
    if (id) {
      const next = LESSON_STEPS.includes(step as LessonStep) ? (step as LessonStep) : "teach";
      return { name: "learn", id, step: next };
    }
    return { name: "shelf" };
  }
  if (head === "shelf") return { name: "shelf", id };
  if (head === "sources") {
    const tab = id || "decks";
    if (tab === "classes" || tab === "notes") {
      if (step === "c" && parts[3]) {
        const rest = parts.slice(4).map((part) => decodeURIComponent(part)).join("/");
        return { name: "notes", classId: decodeURIComponent(parts[3] ?? ""), id: rest || undefined };
      }
      return { name: "notes" };
    }
    if (tab === "papers") {
      const q = parts.slice(2).map((part) => decodeURIComponent(part)).join("/").trim();
      return { name: "papers", q: q || undefined };
    }
    return { name: "desk" };
  }
  if (head === "papers") {
    const q = parts.slice(1).map((part) => decodeURIComponent(part)).join("/").trim();
    return { name: "papers", q: q || undefined };
  }
  if (head === "desk" || head === "decks") return { name: "desk" };
  if (head === "recall") {
    if (id === "c" && step) return { name: "recall", classId: decodeURIComponent(step) };
    if (id === "n" && step) return { name: "recall", noteId: decodeURIComponent(step) };
    return { name: "recall" };
  }
  if (head === "notes" || head === "classes") {
    if (id === "c" && step) {
      const rest = parts.slice(3).map((part) => decodeURIComponent(part)).join("/");
      return { name: "notes", classId: decodeURIComponent(step), id: rest || undefined };
    }
    return { name: "notes", id };
  }
  return { name: "home" };
}

export function toHash(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "desk":
      return "#/sources/decks";
    case "learn":
      return route.kind === "file"
        ? `#/learn/file/${encodeURIComponent(route.id)}/${route.step}`
        : `#/learn/${route.id}/${route.step}`;
    case "shelf":
      return route.id ? `#/shelf/${route.id}` : "#/shelf";
    case "papers":
      return route.q ? `#/sources/papers/${encodeURIComponent(route.q)}` : "#/sources/papers";
    case "recall":
      if (route.noteId) return `#/recall/n/${encodeURIComponent(route.noteId)}`;
      return route.classId ? `#/recall/c/${encodeURIComponent(route.classId)}` : "#/recall";
    case "notes":
      if (route.classId) {
        return route.id
          ? `#/sources/classes/c/${encodeURIComponent(route.classId)}/${encodeURIComponent(route.id)}`
          : `#/sources/classes/c/${encodeURIComponent(route.classId)}`;
      }
      return route.id ? `#/notes/${route.id}` : "#/sources/classes";
  }
}

export function isLessonStep(value: string): value is LessonStep {
  return LESSON_STEPS.includes(value as LessonStep);
}

export function libraryNoteRoute(id: string, collectionId?: string): Route {
  return collectionId ? { name: "notes", classId: collectionId, id } : { name: "notes", id };
}

export function recallNoteRoute(noteId: string): Route {
  return { name: "recall", noteId };
}

export function learnFileRoute(noteId: string, step: LessonStep = "teach"): Route {
  return { name: "learn", id: noteId, step, kind: "file" };
}

export function resumeLearnRoute(continueNoteId?: string, continueModuleId?: string): Route {
  if (continueNoteId) return learnFileRoute(continueNoteId);
  if (continueModuleId) return { name: "learn", id: continueModuleId, step: "teach" };
  return { name: "shelf" };
}
