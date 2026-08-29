import { describe, expect, it } from "vitest";
import { cardsFromMarkdown, cardsFromClassNotes } from "../library/noteCards";
import type { LibraryItem } from "../library/db";

describe("note cards", () => {
  it("cuts recall cards from lecture headings", () => {
    const cards = cardsFromMarkdown(
      `# Last class

Intro paragraph that is long enough to keep.

## DFA 5-tuple

A DFA is the 5-tuple (Q, Sigma, delta, q0, F). F may be empty or have several accept states.

## Substring 001

Track the prefix of 001; after accept, stay forever.
`,
      "file-1",
      "last-class.md",
    );
    const prompts = cards.map((card) => card.prompt);
    expect(prompts.some((prompt) => /5-tuple/i.test(prompt))).toBe(true);
    expect(cards.every((card) => card.noteId === "file-1" && card.answer)).toBe(true);
  });

  it("skips snapshots when living notes exist", () => {
    const living: LibraryItem = {
      id: "live",
      kind: "file",
      name: "Last class",
      mime: "text/markdown",
      size: 10,
      text: "## Current topic\n\nRegular languages and DFAs, including the product construction for union.",
      createdAt: 1,
      relPath: "last-class.md",
    };
    const snap: LibraryItem = {
      id: "snap",
      kind: "file",
      name: "Snapshot",
      mime: "text/markdown",
      size: 10,
      text: "## Old topic\n\nThis snapshot should not become a card when living files exist in the pack.",
      createdAt: 1,
      relPath: "snapshots/2026-08-25.md",
    };
    const cards = cardsFromClassNotes([living, snap]);
    expect(cards.some((card) => /Old topic/i.test(card.prompt))).toBe(false);
    expect(cards.some((card) => /Current topic/i.test(card.prompt))).toBe(true);
  });
});
