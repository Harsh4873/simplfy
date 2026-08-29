import { describe, expect, it } from "vitest";
import {
  listLibrary,
  listStudios,
  openStudioDb,
  putLibraryItem,
  putStudio,
  type LibraryItem,
  type StudioCanvas,
} from "../library/db";
import { parseDroppedFile, mimeForDroppedFile } from "../library/parse";
import { extractTerms, firstLineTitle } from "../library/fieldNote";

describe("local library", () => {
  it("round-trips a desk canvas through IndexedDB", async () => {
    const db = await openStudioDb();
    const canvas: StudioCanvas = {
      id: "lesson:tb-tnseq-transit",
      kind: "lesson",
      title: "TnSeq and TRANSIT",
      moduleId: "tb-tnseq-transit",
      step: "papers",
      pinned: false,
      createdAt: 1,
      updatedAt: 2,
    };
    await putStudio(db, canvas);
    const listed = await listStudios(db);
    expect(listed.some((row) => row.id === "lesson:tb-tnseq-transit" && row.step === "papers")).toBe(true);
  });

  it("round-trips a pasted note through IndexedDB", async () => {
    const db = await openStudioDb();
    const item: LibraryItem = {
      id: "note-1",
      kind: "note",
      name: "Wilks on the bench",
      mime: "text/plain",
      size: 40,
      text: "Twice the log-likelihood gap.",
      createdAt: 1,
    };
    await putLibraryItem(db, item);
    const listed = await listLibrary(db);
    expect(listed.some((row) => row.id === "note-1" && row.text.includes("log-likelihood"))).toBe(true);
  });

  it("parses text files and titles from the first line", async () => {
    const file = new File(["Likelihood notes\n\nNested models only."], "note.txt", { type: "text/plain" });
    const parsed = await parseDroppedFile(file);
    expect(parsed.text).toContain("Nested models");
    expect(firstLineTitle(parsed.text, "x")).toBe("Likelihood notes");
    expect(extractTerms(parsed.text).some((term) => term.label.toLowerCase().includes("nested") || term.label.toLowerCase().includes("likelihood"))).toBe(
      true,
    );
  });

  it("treats a dropped .md as markdown even when the browser says text/plain", async () => {
    const file = new File(["# LRT\n\nNested models."], "note.md", { type: "text/plain" });
    expect(mimeForDroppedFile(file)).toBe("text/markdown");
    const parsed = await parseDroppedFile(file);
    expect(parsed.parseNote?.toLowerCase()).toMatch(/markdown/);
    expect(parsed.text).toContain("Nested models");
  });
});
