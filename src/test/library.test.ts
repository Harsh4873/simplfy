import { describe, expect, it } from "vitest";
import { recallCursorAfterKnown, recallCursorAfterMiss } from "../pages/RecallPage";
import {
  applyRemoteSyncRecord,
  clearDeskAfterSignOut,
  getLibraryItem,
  getPref,
  listCollections,
  listLibrary,
  listRecall,
  listStudios,
  openStudioDb,
  putCollection,
  putLibraryItem,
  putRecallCard,
  putStudio,
  setPref,
  type LibraryItem,
  type StudioCanvas,
} from "../library/db";
import { parseDroppedFile, mimeForDroppedFile } from "../library/parse";
import { extractTerms, firstLineTitle } from "../library/fieldNote";

describe("recall cursor", () => {
  it("advances to the next card from the list before a miss moves it", () => {
    expect(recallCursorAfterMiss(["a", "b"], 1)).toBe("a");
    expect(recallCursorAfterMiss(["a", "b", "c"], 2)).toBe("a");
    expect(recallCursorAfterMiss(["a", "b", "c"], 0)).toBe("b");
    expect(recallCursorAfterMiss(["only"], 0)).toBe("only");
  });

  it("leaves the following card in place after a known card is removed", () => {
    expect(recallCursorAfterKnown(["a", "b", "c"], 1)).toBe("c");
    expect(recallCursorAfterKnown(["a", "b", "c"], 2)).toBe("a");
    expect(recallCursorAfterKnown(["only"], 0)).toBeNull();
  });
});

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

  it("keeps a local file blob when a newer cloud row replaces the text", async () => {
    const db = await openStudioDb();
    const blob = new Blob(["pdf-bytes"], { type: "application/pdf" });
    const brief = {
      version: 2,
      title: "Local brief",
      dek: "",
      stripped: "",
      blocks: [],
      hits: [],
      links: [],
    };
    await putLibraryItem(db, {
      id: "pdf-1",
      kind: "file",
      name: "scan.pdf",
      mime: "application/pdf",
      size: blob.size,
      text: "local extract",
      createdAt: 1,
      blob,
      brief,
    }, false);
    await applyRemoteSyncRecord(db, "library", "pdf-1", {
      id: "pdf-1",
      kind: "file",
      name: "scan.pdf",
      mime: "application/pdf",
      size: blob.size,
      text: "cloud extract",
      createdAt: 1,
    }, {
      key: "library:pdf-1",
      store: "library",
      id: "pdf-1",
      updatedAtMs: 5,
      clientId: "client_abcd1234",
      deleted: false,
    });
    const saved = await getLibraryItem(db, "pdf-1");
    expect(saved?.text).toBe("cloud extract");
    expect(saved?.blob).toBeTruthy();
    expect(saved?.brief).toBeUndefined();

    await applyRemoteSyncRecord(db, "library", "pdf-1", null, {
      key: "library:pdf-1",
      store: "library",
      id: "pdf-1",
      updatedAtMs: 6,
      clientId: "client_abcd1234",
      deleted: true,
    });
    expect(await getLibraryItem(db, "pdf-1")).toBeUndefined();
  });

  it("keeps local-only library rows when the synced desk is cleared", async () => {
    const db = await openStudioDb();
    const ordinary: LibraryItem = {
      id: "small",
      kind: "note",
      name: "Small",
      mime: "text/plain",
      size: 4,
      text: "Synced text",
      createdAt: 1,
    };
    const withFile: LibraryItem = {
      id: "pdf",
      kind: "file",
      name: "scan.pdf",
      mime: "application/pdf",
      size: 3,
      text: "Extracted",
      createdAt: 2,
      blob: new Blob(["original"]),
    };
    const huge: LibraryItem = {
      id: "huge",
      kind: "note",
      name: "Huge",
      mime: "text/plain",
      size: 900_000,
      text: "n".repeat(900_000),
      createdAt: 3,
    };
    await putCollection(db, { id: "class-1", name: "TB", createdAt: 1, updatedAt: 1 });
    await putLibraryItem(db, ordinary, false);
    await putLibraryItem(db, { ...withFile, collectionId: "class-1" }, false);
    await putLibraryItem(db, huge, false);
    await putStudio(db, {
      id: "note:small",
      kind: "note",
      title: "Small",
      noteId: "small",
      pinned: false,
      createdAt: 1,
      updatedAt: 1,
    });
    await putStudio(db, {
      id: "note:pdf",
      kind: "note",
      title: "scan.pdf",
      noteId: "pdf",
      collectionId: "class-1",
      pinned: false,
      createdAt: 1,
      updatedAt: 1,
    });
    await putStudio(db, {
      id: "class:class-1",
      kind: "class",
      title: "TB",
      collectionId: "class-1",
      pinned: true,
      createdAt: 1,
      updatedAt: 1,
    });
    await putRecallCard(db, {
      id: "card-pdf",
      moduleId: "note",
      checkId: "pdf:topic",
      prompt: "Topic from the scan",
      answer: "The answer that has to stay with the local file.",
      kind: "conceptual",
      createdAt: 1,
      misses: 2,
      lastMissedAt: 1,
      noteId: "pdf",
      collectionId: "class-1",
    });
    await putRecallCard(db, {
      id: "card-small",
      moduleId: "note",
      checkId: "small:topic",
      prompt: "Synced card",
      answer: "This card belongs to a row the cloud can restore.",
      kind: "conceptual",
      createdAt: 1,
      misses: 0,
      lastMissedAt: 1,
      noteId: "small",
    });
    await setPref(db, "lastTopic", "library:pdf");
    expect(await clearDeskAfterSignOut(db)).toBe(2);
    const left = await listLibrary(db);
    expect(left.map((row) => row.id).sort()).toEqual(["huge", "pdf"]);
    expect(left.find((row) => row.id === "pdf")?.blob).toBeTruthy();
    expect((await listCollections(db)).map((row) => row.id)).toEqual(["class-1"]);
    expect((await listStudios(db)).map((row) => row.id).sort()).toEqual(["class:class-1", "note:pdf"]);
    expect((await listRecall(db)).map((row) => row.id)).toEqual(["card-pdf"]);
    expect(await getPref(db, "lastTopic")).toBe("library:pdf");
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
