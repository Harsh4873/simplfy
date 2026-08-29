export type AuthorRing = "ioerger" | "coauthor" | "field" | "literature" | "explainer";

export const RING_ORDER: AuthorRing[] = ["ioerger", "coauthor", "field", "literature", "explainer"];

/** Labels shown in the UI. Ranking is Ioerger → coauthors → field → papers → explainers; the numbers stay off-screen. */
export const RING_COPY: Record<AuthorRing, { kicker: string; dek: string }> = {
  ioerger: {
    kicker: "Ioerger lab",
    dek: "Thomas R. Ioerger is on the author list.",
  },
  coauthor: {
    kicker: "People he writes with",
    dek: "Sassetti, Rubin, DeJesus, Sacchettini, Schnappinger, Ehrt, Fortune, and that circle.",
  },
  field: {
    kicker: "TB field",
    dek: "Cole, Gagneux, Walker, CRyPTIC, Farhat, and other names the field already quotes.",
  },
  literature: {
    kicker: "Papers & reviews",
    dek: "Peer-reviewed work outside the circles above.",
  },
  explainer: {
    kicker: "Explainers",
    dek: "Wikipedia, NCBI Bookshelf, WHO, OpenStax, GeeksforGeeks, TRANSIT docs.",
  },
};

const IOERGER = /\bioerger\b/i;

const COAUTHORS = [
  "sassetti",
  "dejesus",
  "de jesus",
  "rubin",
  "sacchettini",
  "schnappinger",
  "ehrt",
  "fortune",
  "jacobs",
  "parish",
  "rhee",
  "alland",
  "philips",
  "mizrahi",
  "warner",
  "sherman",
  "mckinney",
  "nathan",
  "niederweis",
  "boshoff",
  "dick",
  "barry",
  "ambadipudi",
];

const FIELD = [
  "gagneux",
  "cole",
  "niemann",
  "walker",
  "crook",
  "comas",
  "supply",
  "cryptic",
  "iqbal",
  "farhat",
  "ramakrishnan",
  "bishai",
  "wilkinson",
  "raviglione",
  "dheda",
  "cirillo",
  "telenti",
  "young d",
  "heym",
  "cohen t",
  "murray",
  "gao q",
  "van soolingen",
  "takiff",
  "andries",
  "diacon",
];

function hay(authors: string[]): string {
  return authors.join(" ").toLowerCase();
}

export function ringFor(authors: string[], kind: "paper" | "explainer"): AuthorRing {
  const blob = hay(authors);
  if (IOERGER.test(blob)) return "ioerger";
  if (COAUTHORS.some((name) => blob.includes(name))) return "coauthor";
  if (FIELD.some((name) => blob.includes(name))) return "field";
  if (kind === "explainer") return "explainer";
  return "literature";
}
