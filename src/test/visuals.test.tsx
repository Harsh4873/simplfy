import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog/loadCatalog";
import type { VisualSpec } from "../catalog/types";
import { VisualPlate } from "../visuals/VisualPlate";

const fixtures: VisualSpec[] = [
  {
    kind: "layered-section",
    caption: "layers",
    layers: [
      { id: "a", label: "Outer", detail: "lipid", tone: "lipid" },
      { id: "b", label: "Core", detail: "wall", tone: "core" },
    ],
    annotation: "note",
  },
  {
    kind: "flow-map",
    caption: "flow",
    nodes: [
      { id: "s", label: "Start", x: 10, y: 40, tone: "start" },
      { id: "e", label: "End", x: 70, y: 40, tone: "end" },
    ],
    edges: [{ from: "s", to: "e", label: "go" }],
  },
  {
    kind: "gene-track",
    caption: "gene",
    gene: "rpoB",
    start: 400,
    end: 520,
    unit: "codon",
    regions: [{ start: 426, end: 452, label: "RRDR" }],
    marks: [{ pos: 450, label: "S450L", note: "dominant" }],
  },
  {
    kind: "nested-models",
    caption: "nested",
    full: { label: "Full", params: ["a", "b"] },
    reduced: { label: "Reduced", params: ["a"] },
    statistic: "Λ",
    reference: "χ²",
  },
  {
    kind: "model-plate",
    caption: "plate",
    plates: [{ id: "n", label: "i", x: 20, y: 20, w: 50, h: 50 }],
    nodes: [
      { id: "p", label: "β", x: 20, y: 40, shape: "param" },
      { id: "y", label: "y", x: 50, y: 40, shape: "obs" },
    ],
    edges: [{ from: "p", to: "y" }],
  },
  {
    kind: "small-multiples",
    caption: "bars",
    yLabel: "value",
    panels: [{ title: "A", bars: [{ label: "x", value: 2 }, { label: "y", value: 5 }] }],
  },
  {
    kind: "mechanism-map",
    caption: "mech",
    nodes: [
      { id: "d", label: "INH", group: "drug", x: 20, y: 40, sub: "prodrug" },
      { id: "t", label: "InhA", group: "target", x: 70, y: 40 },
    ],
    edges: [{ from: "d", to: "t", label: "hits" }],
  },
  {
    kind: "density-shift",
    caption: "dens",
    xLabel: "θ",
    curves: [
      { id: "a", label: "null", mean: 0, sd: 1 },
      { id: "b", label: "alt", mean: 1.2, sd: 1 },
    ],
  },
  {
    kind: "hierarchy",
    caption: "tree",
    layers: [
      { title: "Top", nodes: ["A", "B"] },
      { title: "Bottom", nodes: ["A1", "A2", "B1"] },
    ],
  },
  {
    kind: "mutation-grid",
    caption: "grid",
    rows: [{ gene: "rpoB S450L", drug: "RIF", canonical: "R", note: "high" }],
  },
  {
    kind: "constellation",
    caption: "terms",
    terms: [
      { label: "caseum", weight: 3 },
      { label: "PZA", weight: 1 },
    ],
  },
];

describe("visual plates", () => {
  it("renders each figure kind as a plate", () => {
    for (const spec of fixtures) {
      const view = render(<VisualPlate spec={spec} kicker={`Fig · ${spec.kind}`} />);
      expect(view.container.querySelector(".plate")).toBeTruthy();
      expect(view.getByText(spec.caption)).toBeInTheDocument();
      view.unmount();
    }
  });

  it("renders every bundled catalogue plate", () => {
    const { modules } = loadCatalog();
    expect(modules.length).toBeGreaterThan(12);
    for (const module of modules) {
      const view = render(<VisualPlate spec={module.visual} kicker={module.id} />);
      expect(view.container.querySelector(".plate")).toBeTruthy();
      view.unmount();
    }
  });
});
