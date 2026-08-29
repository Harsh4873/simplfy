export const LESSON_STEPS = ["teach", "example", "practice", "say-back", "shelf"] as const;

export type LessonStep = (typeof LESSON_STEPS)[number];

export type Route =
  | { name: "home" }
  | { name: "learn"; id: string; step: LessonStep }
  | { name: "shelf"; id?: string }
  | { name: "recall" }
  | { name: "notes"; id?: string };

export const STEP_META: Record<LessonStep, { n: number; label: string; hint: string }> = {
  teach: { n: 1, label: "Teach", hint: "Simple words, an analogy, the figure" },
  example: { n: 2, label: "Example", hint: "We work one problem" },
  practice: { n: 3, label: "Practice", hint: "You try two or three" },
  "say-back": { n: 4, label: "Say it back", hint: "Explain it in your own words" },
  shelf: { n: 5, label: "Shelf", hint: "The dense notes when you are ready" },
};

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "").replace(/^\/+/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  const [head, id, step] = parts;
  if (head === "learn" && id) {
    const next = LESSON_STEPS.includes(step as LessonStep) ? (step as LessonStep) : "teach";
    return { name: "learn", id, step: next };
  }
  if (head === "shelf") return { name: "shelf", id };
  if (head === "recall") return { name: "recall" };
  if (head === "notes") return { name: "notes", id };
  return { name: "home" };
}

export function toHash(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "learn":
      return `#/learn/${route.id}/${route.step}`;
    case "shelf":
      return route.id ? `#/shelf/${route.id}` : "#/shelf";
    case "recall":
      return "#/recall";
    case "notes":
      return route.id ? `#/notes/${route.id}` : "#/notes";
  }
}

export function isLessonStep(value: string): value is LessonStep {
  return LESSON_STEPS.includes(value as LessonStep);
}
