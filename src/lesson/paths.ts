export type StudyPath = {
  id: string;
  title: string;
  dek: string;
  domain: "stats" | "tb";
  ids: string[];
};

export const STUDY_PATHS: StudyPath[] = [
  {
    id: "stats-spine",
    title: "Stats, in order",
    dek: "From “what is a likelihood” through nested tests, regression, Bayes, and shrinkage.",
    domain: "stats",
    ids: [
      "stats-foundations",
      "stats-likelihood",
      "stats-lrt",
      "stats-ols-glm",
      "stats-bayesian",
      "stats-hierarchical",
    ],
  },
  {
    id: "tb-spine",
    title: "TB, in order",
    dek: "The bug, the lesion, how we see it, rifampin / rpoB, first-line drugs, then WGS as DST.",
    domain: "tb",
    ids: ["tb-organism", "tb-granuloma", "tb-diagnosis", "tb-rifampin", "tb-first-line", "tb-wgs-dst"],
  },
];

export const FEATURED_IDS = [
  "stats-lrt",
  "stats-likelihood",
  "tb-rifampin",
  "tb-granuloma",
  "stats-bayesian",
  "stats-ols-glm",
  "stats-hierarchical",
  "stats-foundations",
  "tb-wgs-dst",
] as const;
