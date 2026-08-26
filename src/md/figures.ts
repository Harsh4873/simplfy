import type { NestedModelsVisual, SmallMultiplesVisual, VisualSpec } from "../catalog/types";
import type { NamedHit } from "./types";

export type BriefFigureDraft = {
  spec: VisualSpec;
  kicker: string;
  slot: "hits" | "joint";
};

function groupByContrast(hits: NamedHit[]): Map<string, NamedHit[]> {
  const groups = new Map<string, NamedHit[]>();
  for (const hit of hits) {
    const key = hit.contrast || "named";
    const list = groups.get(key) ?? [];
    list.push(hit);
    groups.set(key, list);
  }
  return groups;
}

export function figuresFromNote(stripped: string, hits: NamedHit[]): BriefFigureDraft[] {
  const figures: BriefFigureDraft[] = [];
  const numeric = hits.filter((hit) => hit.ll != null && hit.note !== "does not rank as this interaction");
  if (numeric.length) {
    const groups = groupByContrast(numeric);
    const spec: SmallMultiplesVisual = {
      kind: "small-multiples",
      caption: "2ΔLL for named genes parsed from the note. Bar height is the statistic, not a word count.",
      yLabel: "2ΔLL",
      panels: [...groups.entries()].map(([title, rows]) => ({
        title,
        bars: rows.map((row) => ({ label: row.gene, value: row.ll ?? 0 })),
      })),
    };
    figures.push({ spec, kicker: "Fig. L1  ·  small multiples", slot: "hits" });
  } else if (hits.length) {
    figures.push({
      spec: {
        kind: "constellation",
        caption: "Named genes from the note, weighted by inverse rank. Not a bag-of-words cloud.",
        terms: hits.slice(0, 12).map((hit) => ({
          label: hit.gene,
          weight: hit.rank != null ? 1 / hit.rank : 1,
        })),
      },
      kicker: "Fig. L1  ·  named genes",
      slot: "hits",
    });
  }

  if (/joint tests/i.test(stripped) || /χ²\s*df\s*=\s*2/i.test(stripped) || /drop two mains/i.test(stripped)) {
    const spec: NestedModelsVisual = {
      kind: "nested-models",
      caption:
        "A joint test drops two mains and refers 2ΔLL to χ² with df=2. It asks whether at least one additive term matters; it is not a third kind of biology.",
      full: { label: "Full (two mains)", params: ["main A", "main B"] },
      reduced: { label: "Both mains dropped", params: ["intercept"] },
      statistic: "2ΔLL → χ²₂",
      reference: "df = 2 when two mains drop",
    };
    figures.push({ spec, kicker: "Fig. L2  ·  nested models", slot: "joint" });
  }

  return figures;
}
