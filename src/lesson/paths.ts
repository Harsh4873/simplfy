export type StudyPath = {
  id: string;
  title: string;
  dek: string;
  domain: "stats" | "tb";
  ids: string[];
};

export const STUDY_PATHS: StudyPath[] = [
  {
    id: "stats-basics",
    title: "Stats from zero",
    dek: "Probability, expectation, the Normal law, then tests and p-values — Wikipedia-style essentials before likelihood.",
    domain: "stats",
    ids: [
      "stats-probability-axioms",
      "stats-expectation-variance",
      "stats-conditional-probability",
      "stats-bernoulli-binomial",
      "stats-normal-clt",
      "stats-sd-versus-se",
      "stats-hypothesis-testing",
      "stats-pvalue-versus-posterior",
      "stats-chi-square",
    ],
  },
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
  {
    id: "tb-methods",
    title: "TB methods",
    dek: "TnSeq / TRANSIT, essentiality, cholesterol as a condition, CRISPRi, pDST vs gDST, lineages.",
    domain: "tb",
    ids: [
      "tb-tnseq-transit",
      "tb-essentiality",
      "tb-cholesterol-catabolism",
      "tb-crispri-hypomorphs",
      "tb-pdst-versus-gdst",
      "tb-lineages-barcode",
      "tb-snp-thresholds",
    ],
  },
  {
    id: "tb-host",
    title: "Host and lesion",
    dek: "Innate versus adaptive, the PRR cartoon, primary versus post-primary, then the walled city.",
    domain: "tb",
    ids: ["tb-innate-adaptive", "tb-tlr-nod", "tb-primary-postprimary", "tb-granuloma"],
  },
];

export const FEATURED_IDS = [
  "tb-tnseq-transit",
  "tb-cholesterol-catabolism",
  "stats-bayesian",
  "tb-granuloma",
  "stats-hierarchical",
  "stats-normal-clt",
  "tb-essentiality",
  "stats-lrt",
  "tb-rifampin",
] as const;
