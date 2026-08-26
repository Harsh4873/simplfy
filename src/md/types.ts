import type { VisualSpec } from "../catalog/types";

export const BRIEF_VERSION = 1;

export type InlineSpan =
  | { kind: "text"; text: string; strong?: boolean }
  | { kind: "plate"; text: string; moduleId: string; strong?: boolean };

export type PlateLink = {
  text: string;
  moduleId: string;
};

export type NamedHit = {
  contrast: string;
  gene: string;
  ll?: number;
  rank?: number;
  direction?: string;
  note?: string;
};

export type BriefHeading = {
  kind: "heading";
  level: 2 | 3;
  text: string;
};

export type BriefParagraph = {
  kind: "paragraph";
  spans: InlineSpan[];
};

export type BriefTable = {
  kind: "table";
  caption?: string;
  columns: string[];
  rows: string[][];
};

export type BriefFigure = {
  kind: "figure";
  spec: VisualSpec;
  kicker: string;
};

export type BriefBlock = BriefHeading | BriefParagraph | BriefTable | BriefFigure;

export type LabBrief = {
  version: number;
  title: string;
  dek: string;
  stripped: string;
  blocks: BriefBlock[];
  hits: NamedHit[];
  links: PlateLink[];
};
