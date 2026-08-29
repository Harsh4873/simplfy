import type { Paper } from "./corpus";
import { PAPERS } from "./corpus";
import { RING_ORDER, ringFor, type AuthorRing } from "./authors";
import type { StudyModule } from "../catalog/types";

export type PaperHit = {
  paper: Paper;
  ring: AuthorRing;
  score: number;
};

export type LookLink = {
  label: string;
  href: string;
  hint: string;
};

function tokens(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/[^a-z0-9+]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

function paperBlob(paper: Paper): string {
  return [paper.title, paper.venue, paper.summary, paper.topics.join(" "), (paper.genes ?? []).join(" "), paper.authors.join(" ")].join(" ").toLowerCase();
}

function scorePaper(paper: Paper, words: string[]): number {
  if (words.length === 0) return 1;
  const blob = paperBlob(paper);
  const geneSet = new Set((paper.genes ?? []).map((gene) => gene.toLowerCase()));
  const topicSet = new Set(paper.topics.map((topic) => topic.toLowerCase()));
  let score = 0;
  for (const word of words) {
    if (geneSet.has(word) || geneSet.has(word.toLowerCase())) score += 22;
    if (topicSet.has(word) || [...topicSet].some((topic) => topic.includes(word))) score += 12;
    if (paper.title.toLowerCase().includes(word)) score += 8;
    if (blob.includes(word)) score += 3;
  }
  if (words.every((word) => blob.includes(word))) score += 6;
  return score;
}

export function contextQuery(module?: StudyModule, extra = ""): string {
  if (!module) return extra;
  const bits = [extra, module.id, module.title, module.aliases.join(" "), module.tags.join(" ")];
  if (module.visual.kind === "gene-track") bits.push(module.visual.gene);
  return bits.filter(Boolean).join(" ");
}

export function lookupPapers(query: string, module?: StudyModule): PaperHit[] {
  const words = tokens(contextQuery(module, query));
  return PAPERS.map((paper) => ({
    paper,
    ring: ringFor(paper.authors, paper.kind),
    score: scorePaper(paper, words),
  }))
    .filter((hit) => (words.length === 0 ? true : hit.score > 0))
    .sort((a, b) => {
      const ring = RING_ORDER.indexOf(a.ring) - RING_ORDER.indexOf(b.ring);
      if (ring !== 0) return ring;
      return b.score - a.score || b.paper.year - a.paper.year;
    });
}

export function groupHits(hits: PaperHit[]): { ring: AuthorRing; hits: PaperHit[] }[] {
  return RING_ORDER.map((ring) => ({ ring, hits: hits.filter((hit) => hit.ring === ring).slice(0, 8) })).filter(
    (group) => group.hits.length > 0,
  );
}

function encodeTerm(term: string): string {
  return encodeURIComponent(term.trim());
}

export function furtherLinks(query: string, module?: StudyModule): LookLink[] {
  const q = (query.trim() || module?.title || module?.id || "Mycobacterium tuberculosis").replace(/\s+/g, " ");
  const pubmed = (term: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeTerm(term)}`;
  const scholar = (term: string) => `https://scholar.google.com/scholar?q=${encodeTerm(term)}`;
  return [
    {
      label: "PubMed · Ioerger",
      href: pubmed(`Ioerger[Author] AND (${q})`),
      hint: "Only if he wrote on this keyword.",
    },
    {
      label: "PubMed · that circle",
      href: pubmed(`(${q}) AND (Sassetti[Author] OR Rubin[Author] OR DeJesus[Author] OR Fortune[Author] OR Sacchettini[Author])`),
      hint: "Co-authors when the lab paper is missing.",
    },
    {
      label: "PubMed · TB field",
      href: pubmed(`(${q}) AND (tuberculosis OR Mycobacterium)`),
      hint: "The wider literature.",
    },
    {
      label: "Google Scholar",
      href: scholar(q),
      hint: "Preprints and PDFs the catalogue does not carry.",
    },
    {
      label: "Wikipedia",
      href: `https://en.wikipedia.org/w/index.php?search=${encodeTerm(q)}`,
      hint: "The encyclopedia card when you need a definition first.",
    },
    {
      label: "NCBI Gene",
      href: `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeTerm(`${q} Mycobacterium tuberculosis`)}`,
      hint: "Gene lookup for locus tags and synonyms.",
    },
  ];
}
