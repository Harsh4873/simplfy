import type { StudyModule } from "../catalog/types";
import { bodyAfterHeading, extractHits, headingForParagraph, hitTable, inventDek, inventTitle } from "./brief";
import { figuresFromNote } from "./figures";
import { collectPlateLinks, linkifyMarkdown } from "./linkify";
import { stripNoise } from "./strip";
import { BRIEF_VERSION, type BriefBlock, type InlineSpan, type LabBrief } from "./types";

function allSpans(dek: string, blocks: BriefBlock[], modules: StudyModule[]): InlineSpan[] {
  const spans: InlineSpan[] = [...linkifyMarkdown(dek, modules)];
  for (const block of blocks) {
    if (block.kind === "heading") spans.push(...linkifyMarkdown(block.text, modules));
    if (block.kind === "paragraph") spans.push(...block.spans);
    if (block.kind === "table") {
      for (const row of block.rows) {
        for (const cell of row) spans.push(...linkifyMarkdown(cell, modules));
      }
    }
  }
  return spans;
}

export function composeBrief(raw: string, modules: StudyModule[]): LabBrief {
  const stripped = stripNoise(raw);
  const hits = extractHits(stripped);
  const title = inventTitle(stripped, hits);
  const dek = inventDek(stripped, hits);
  const figures = figuresFromNote(stripped, hits);
  const blocks: BriefBlock[] = [];

  if (hits.length) {
    const table = hitTable(hits);
    blocks.push({ kind: "heading", level: 2, text: "Named hits" });
    blocks.push({
      kind: "table",
      caption: "Contrasts, genes, and statistics parsed from the note.",
      columns: table.columns,
      rows: table.rows,
    });
    const hitFig = figures.find((figure) => figure.slot === "hits");
    if (hitFig) blocks.push({ kind: "figure", spec: hitFig.spec, kicker: hitFig.kicker });
  }

  const paras = stripped.split(/\n{2,}/).map((para) => para.trim()).filter(Boolean);
  let jointFigurePending = figures.some((figure) => figure.slot === "joint");

  for (const para of paras) {
    const heading = headingForParagraph(para);
    const body = heading && /^\*\*[^*]+\*\*/.test(para) ? bodyAfterHeading(para) : para;
    if (heading) blocks.push({ kind: "heading", level: 2, text: heading });
    if (body) blocks.push({ kind: "paragraph", spans: linkifyMarkdown(body, modules) });
    if (jointFigurePending && heading && /joint/i.test(heading)) {
      const joint = figures.find((figure) => figure.slot === "joint");
      if (joint) {
        blocks.push({ kind: "figure", spec: joint.spec, kicker: joint.kicker });
        jointFigurePending = false;
      }
    }
  }

  if (jointFigurePending) {
    const joint = figures.find((figure) => figure.slot === "joint");
    if (joint) blocks.push({ kind: "figure", spec: joint.spec, kicker: joint.kicker });
  }

  if (!blocks.some((block) => block.kind === "paragraph") && stripped) {
    blocks.push({ kind: "paragraph", spans: linkifyMarkdown(stripped, modules) });
  }

  const links = collectPlateLinks(allSpans(dek, blocks, modules));
  return { version: BRIEF_VERSION, title, dek, stripped, blocks, hits, links };
}
