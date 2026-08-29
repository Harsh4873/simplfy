import { describe, expect, it } from "vitest";
import { parseHash, toHash } from "../app/routes";
import { RING_ORDER, ringFor } from "../papers/authors";
import { lookupPapers } from "../papers/lookup";

describe("paper ranking", () => {
  it("puts Ioerger on TRANSIT before the rest of the field", () => {
    const hits = lookupPapers("TRANSIT");
    expect(hits[0]?.ring).toBe("ioerger");
    expect(hits[0]?.paper.title).toMatch(/TRANSIT/i);
    const rings = [...new Set(hits.map((hit) => hit.ring))];
    expect(rings[0]).toBe("ioerger");
  });

  it("keeps Ioerger first on rpoB when he did write on it, with Telenti still in the field ring", () => {
    const hits = lookupPapers("rpoB");
    expect(hits[0]?.ring).toBe("ioerger");
    const telenti = hits.find((hit) => hit.paper.id === "telenti-1993-rpob");
    expect(telenti?.ring).toBe("field");
  });

  it("ranks Griffin/Ioerger first on cholesterol, then Sassetti, then the encyclopedia card", () => {
    const hits = lookupPapers("cholesterol");
    expect(hits[0]?.ring).toBe("ioerger");
    expect(hits[0]?.paper.id).toBe("griffin-2011-cholesterol");
    const pandey = hits.find((hit) => hit.paper.id === "pandey-2008-cholesterol");
    expect(pandey?.ring).toBe("coauthor");
    const wiki = hits.find((hit) => hit.paper.id === "wiki-cholesterol");
    expect(wiki?.ring).toBe("explainer");
    expect(RING_ORDER.indexOf("ioerger")).toBeLessThan(RING_ORDER.indexOf("coauthor"));
    expect(RING_ORDER.indexOf("coauthor")).toBeLessThan(RING_ORDER.indexOf("explainer"));
  });

  it("omits the Ioerger ring when he did not write on the keyword", () => {
    const hits = lookupPapers("NAT2 acetylator");
    expect(hits.some((hit) => hit.ring === "ioerger")).toBe(false);
    expect(hits.some((hit) => hit.paper.id === "wiki-nat2")).toBe(true);
  });

  it("keeps explainers last", () => {
    const hits = lookupPapers("Bayes theorem");
    const last = hits[hits.length - 1];
    expect(last?.ring).toBe("explainer");
  });

  it("classifies author rings without exposing numeric levels", () => {
    expect(ringFor(["Ioerger TR"], "paper")).toBe("ioerger");
    expect(ringFor(["Sassetti CM", "Rubin EJ"], "paper")).toBe("coauthor");
    expect(ringFor(["Gagneux S"], "paper")).toBe("field");
    expect(ringFor(["Unknown"], "paper")).toBe("literature");
    expect(ringFor(["Unknown"], "explainer")).toBe("explainer");
  });
});

describe("paper routes", () => {
  it("round-trips a gene lookup hash", () => {
    expect(parseHash("#/papers/rpoB")).toEqual({ name: "papers", q: "rpoB" });
    expect(parseHash("#/sources/papers/rpoB")).toEqual({ name: "papers", q: "rpoB" });
    expect(toHash({ name: "papers", q: "rpoB" })).toBe("#/sources/papers/rpoB");
    expect(parseHash("#/desk")).toEqual({ name: "desk" });
  });
});
