import type { StudyModule } from "../catalog/types";
import { FEATURED_IDS } from "./paths";
import { LESSON_OVERLAYS } from "./overlays";
import type { Analogy, Lesson, LessonOverlay } from "./types";

const KIND_ANALOGY: Record<StudyModule["visual"]["kind"], Analogy> = {
  "nested-models": {
    title: "A smaller box inside a bigger box",
    body: "The fancy model is a bigger box of knobs. The simple model is what you get if you freeze some of those knobs. A nested comparison is legal only when scraping those knobs off really does give you the simple model back — not a different box that merely looks similar.",
  },
  "gene-track": {
    title: "A highlighted sentence in a long document",
    body: "Picture a gene as a sentence. The figure highlights one clause — the stretch assays actually read, or the codon people fight about. Mutations outside the highlight can still wreck the meaning, which is why ‘the assay said fine’ is not the same as ‘the sentence is fine.’",
  },
  "density-shift": {
    title: "Two piles of dirt",
    body: "Each curve is a pile of probability dirt. The question is usually: did the pile move, widen, or overlap in a way that matters for a cutoff you actually use? Eyes lie; the labelled means and spreads are the claim.",
  },
  hierarchy: {
    title: "Boxes inside boxes",
    body: "Each layer is a container: reads in isolates, isolates in patients, patients in places. Treating the innermost ticks as independent is how you get confident about a nested fact you did not actually measure that many times.",
  },
  "flow-map": {
    title: "A recipe with forks",
    body: "Follow the arrows like a recipe. Diamonds are decisions; the interesting science is usually sitting on one fork that people skip when they quote only the happy path.",
  },
  "layered-section": {
    title: "A cake you can cut",
    body: "Each band is a layer with a job — wall, membrane, core. Drugs and stains care which layer they can actually reach. Reading top to bottom is the point of the figure, not a decoration.",
  },
  "model-plate": {
    title: "A comic panel of who causes whom",
    body: "Plates in the figure are ‘repeat this block.’ Circles are things we observe or invent. Arrows are the story you are allowed to tell. If an arrow is missing, that independence is a claim, not a simplification for the artist.",
  },
  "small-multiples": {
    title: "The same chart, several conditions",
    body: "Do not read one panel as the whole truth. The move is to compare the pattern across panels: what stayed put, what flipped, what only happens in one condition.",
  },
  "mechanism-map": {
    title: "Billiard balls with labels",
    body: "Each node is a player (drug, gene, cell). Each edge is a shove. If two nodes are not connected, the plate is claiming they do not shove each other — at least not in this cartoon.",
  },
  "mutation-grid": {
    title: "A cheat-sheet of swaps",
    body: "Rows are ‘this gene change, that drug.’ Canonical letters are the catalogue’s current mood, not a law of physics. Read the note column; that is where the exceptions live.",
  },
  constellation: {
    title: "A word-cloud of the idea",
    body: "Bigger words are the ones this plate wants in your working memory. They are not ranked by importance to the universe — they are ranked by how often this topic leans on them.",
  },
};

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^.+?[.](?=\s|$)/);
  return (match ? match[0] : trimmed).trim();
}

function deriveOverlay(module: StudyModule): LessonOverlay {
  const analogy = KIND_ANALOGY[module.visual.kind];
  const watchFor = module.deep.slice(0, 3).map((para) => firstSentence(para));
  return {
    analogy,
    plain: [
      module.dek,
      `Look at the figure. ${module.visual.caption}`,
      module.story[0] ?? module.dek,
    ],
    whyItMatters: module.story[module.story.length - 1] ?? module.dek,
    watchFor: watchFor.length ? watchFor : ["Stay honest about what the figure is actually claiming."],
    sayBackPrompt: `In your own words, explain ${module.title}: what is the idea, and what would a careful person refuse to confuse it with?`,
    sayBackModel: module.story.join(" "),
  };
}

export function lessonFromModule(module: StudyModule): Lesson {
  const authored = LESSON_OVERLAYS[module.id];
  return {
    module,
    overlay: authored ?? deriveOverlay(module),
    featured: FEATURED_IDS.includes(module.id as (typeof FEATURED_IDS)[number]),
  };
}

export function sayBackItem(module: StudyModule) {
  const lesson = lessonFromModule(module);
  return {
    id: "say-back",
    kind: "conceptual" as const,
    prompt: lesson.overlay.sayBackPrompt,
    choices: ["(say-back)"],
    answer: lesson.overlay.sayBackModel,
    why: lesson.overlay.sayBackModel,
  };
}
