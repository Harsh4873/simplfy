export type Domain = "tb" | "stats";

export type Source = {
  title: string;
  url?: string;
  attribution: string;
  license: string;
};

export type Formula = {
  id: string;
  label: string;
  expression: string;
  note: string;
};

export type WorkedStep = {
  title: string;
  body: string;
  expression?: string;
};

export type CheckKind = "conceptual" | "calculation" | "figure";

export type CheckItem = {
  id: string;
  kind: CheckKind;
  prompt: string;
  figureHint?: string;
  choices: string[];
  answer: string;
  why: string;
  whyWrong?: Record<string, string>;
};

export type LayeredSectionVisual = {
  kind: "layered-section";
  caption: string;
  layers: { id: string; label: string; detail: string; tone: "wall" | "membrane" | "core" | "lipid" | "space" }[];
  annotation?: string;
};

export type FlowMapVisual = {
  kind: "flow-map";
  caption: string;
  nodes: { id: string; label: string; x: number; y: number; tone?: "start" | "process" | "decision" | "end"; detail?: string }[];
  edges: { from: string; to: string; label?: string }[];
};

export type GeneTrackVisual = {
  kind: "gene-track";
  caption: string;
  gene: string;
  start: number;
  end: number;
  unit: string;
  regions: { start: number; end: number; label: string }[];
  marks: { pos: number; label: string; note: string }[];
};

export type NestedModelsVisual = {
  kind: "nested-models";
  caption: string;
  reduced: { label: string; params: string[] };
  full: { label: string; params: string[] };
  statistic: string;
  reference: string;
};

export type ModelPlateVisual = {
  kind: "model-plate";
  caption: string;
  plates: { id: string; label: string; x: number; y: number; w: number; h: number }[];
  nodes: { id: string; label: string; x: number; y: number; shape: "obs" | "param" | "det" }[];
  edges: { from: string; to: string }[];
};

export type SmallMultiplesVisual = {
  kind: "small-multiples";
  caption: string;
  yLabel?: string;
  panels: { title: string; bars: { label: string; value: number }[] }[];
};

export type MechanismMapVisual = {
  kind: "mechanism-map";
  caption: string;
  nodes: { id: string; label: string; group: string; x: number; y: number; sub?: string }[];
  edges: { from: string; to: string; label?: string }[];
};

export type DensityShiftVisual = {
  kind: "density-shift";
  caption: string;
  xLabel: string;
  curves: { id: string; label: string; mean: number; sd: number }[];
};

export type HierarchyVisual = {
  kind: "hierarchy";
  caption: string;
  layers: { title: string; nodes: string[] }[];
};

export type MutationGridVisual = {
  kind: "mutation-grid";
  caption: string;
  rows: { gene: string; drug: string; canonical: string; note: string }[];
};

export type ConstellationVisual = {
  kind: "constellation";
  caption: string;
  terms: { label: string; weight: number }[];
};

export type VisualSpec =
  | LayeredSectionVisual
  | FlowMapVisual
  | GeneTrackVisual
  | NestedModelsVisual
  | ModelPlateVisual
  | SmallMultiplesVisual
  | MechanismMapVisual
  | DensityShiftVisual
  | HierarchyVisual
  | MutationGridVisual
  | ConstellationVisual;

export type StudyModule = {
  id: string;
  title: string;
  dek: string;
  domain: Domain;
  aliases: string[];
  tags: string[];
  story: string[];
  deepTitle: string;
  deep: string[];
  formulas?: Formula[];
  visual: VisualSpec;
  sources: Source[];
  related: string[];
  example: {
    title: string;
    setup: string;
    steps: WorkedStep[];
    takeaway: string;
  };
  check: CheckItem[];
};

export const VISUAL_KINDS = [
  "layered-section",
  "flow-map",
  "gene-track",
  "nested-models",
  "model-plate",
  "small-multiples",
  "mechanism-map",
  "density-shift",
  "hierarchy",
  "mutation-grid",
  "constellation",
] as const;
