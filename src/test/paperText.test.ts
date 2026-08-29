import { describe, expect, it } from "vitest";
import {
  explodeInlineSections,
  headingOfPaperLine,
  looksLikePaperText,
  paperToMarkdown,
  titleFromPaperText,
} from "../library/paperText";
import { cardsFromNoteText } from "../library/noteCards";
import { linesFromPdfItems } from "../library/parse";
import { TOY_PAPER_MASHED, TOY_PAPER_TEXT } from "./toyPaper";

describe("paper text", () => {
  it("spots a paper from Abstract plus Introduction", () => {
    expect(looksLikePaperText(TOY_PAPER_TEXT)).toBe(true);
    expect(looksLikePaperText(TOY_PAPER_MASHED)).toBe(true);
    expect(looksLikePaperText("## Picture\n\nXu asks if a knockout gets sicker.")).toBe(false);
  });

  it("reads a title from the first substantial line", () => {
    expect(titleFromPaperText(TOY_PAPER_TEXT, "fallback")).toMatch(/toy assay for counting colonies/i);
    expect(headingOfPaperLine("Abstract")).toBe("Abstract");
    expect(headingOfPaperLine("1 Introduction")).toBe("1 Introduction");
  });

  it("splits mashed PDF prose onto section headings", () => {
    const exploded = explodeInlineSections(TOY_PAPER_MASHED);
    expect(exploded).toMatch(/Abstract\s+We count/i);
    expect(exploded).toMatch(/1 Introduction\s+Tuberculosis/i);
    expect(exploded).toMatch(/what the abstract claimed/i);
  });

  it("turns a paper into markdown sections and recall cards", () => {
    const md = paperToMarkdown(TOY_PAPER_TEXT);
    expect(md).toMatch(/^# A toy assay/m);
    expect(md).toMatch(/^## Abstract/m);
    expect(md).toMatch(/^## 1 Introduction/m);
    const cards = cardsFromNoteText(TOY_PAPER_TEXT, "paper-1", "toy-assay.pdf");
    const prompts = cards.map((card) => card.prompt);
    expect(prompts.some((prompt) => /abstract/i.test(prompt))).toBe(true);
    expect(prompts.some((prompt) => /introduction/i.test(prompt))).toBe(true);
    expect(prompts.some((prompt) => /methods/i.test(prompt))).toBe(true);
    expect(prompts.some((prompt) => /results/i.test(prompt))).toBe(true);
    expect(prompts.some((prompt) => /^references$/i.test(prompt))).toBe(false);
    expect(cards.every((card) => card.noteId === "paper-1" && (card.answer?.length ?? 0) >= 24)).toBe(true);
  });

  it("cuts cards from mashed page text the same way", () => {
    const cards = cardsFromNoteText(TOY_PAPER_MASHED, "paper-2", "scan.pdf");
    expect(cards.some((card) => /abstract/i.test(card.prompt))).toBe(true);
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("rebuilds PDF lines from x/y glyphs", () => {
    const items = [
      { str: "A toy", transform: [1, 0, 0, 1, 72, 720] },
      { str: " assay", transform: [1, 0, 0, 1, 110, 720] },
      { str: "Abstract", transform: [1, 0, 0, 1, 72, 700] },
    ];
    expect(linesFromPdfItems(items)).toEqual(["A toy assay", "Abstract"]);
  });
});
