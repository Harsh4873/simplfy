import { describe, expect, it } from "vitest";
import {
  listRecall,
  listStudios,
  openStudioDb,
  putCollection,
  putRecallCard,
  putStudio,
  type Collection,
  type LibraryItem,
} from "../library/db";
import { isolateClassFromCatalogue, seedClassStudios } from "../library/spawn";

const folder: Collection = { id: "class-1", name: "CSCE 627", createdAt: 1, updatedAt: 1 };

const note: LibraryItem = {
  id: "note-dfa",
  kind: "note",
  name: "last-class.md",
  mime: "text/markdown",
  size: 40,
  text: "# Last class\n\n## DFA 5-tuple\n\nA DFA is the 5-tuple (Q, Sigma, delta, q0, F).\n",
  createdAt: 1,
  collectionId: folder.id,
  relPath: "update/last-class.md",
};

describe("class catalogue isolation", () => {
  it("detaches glued tutor plates and drops catalogue cards from a class", async () => {
    const db = await openStudioDb();
    await putCollection(db, folder);
    await putStudio(db, {
      id: "lesson:tb-tnseq-transit",
      kind: "lesson",
      title: "TnSeq and TRANSIT",
      moduleId: "tb-tnseq-transit",
      collectionId: folder.id,
      pinned: false,
      createdAt: 1,
      updatedAt: 1,
    });
    await putStudio(db, {
      id: "papers:prpd",
      kind: "papers",
      title: "Lookup · prpD",
      papersQuery: "prpD",
      collectionId: folder.id,
      pinned: false,
      createdAt: 1,
      updatedAt: 1,
    });
    await putRecallCard(db, {
      id: "card-glue",
      moduleId: "tb-tnseq-transit",
      checkId: "say-back",
      prompt: "Say back TRANSIT",
      kind: "conceptual",
      createdAt: 1,
      misses: 0,
      lastMissedAt: 1,
      collectionId: folder.id,
    });
    await putRecallCard(db, {
      id: "card-practiced",
      moduleId: "stats-lrt",
      checkId: "say-back",
      prompt: "Say back LRT",
      kind: "conceptual",
      createdAt: 1,
      misses: 2,
      lastMissedAt: 1,
      collectionId: folder.id,
    });

    await isolateClassFromCatalogue(db, folder.id);

    const canvases = await listStudios(db);
    expect(canvases.find((row) => row.id === "lesson:tb-tnseq-transit")?.collectionId).toBeUndefined();
    expect(canvases.find((row) => row.id === "papers:prpd")?.collectionId).toBeUndefined();
    const cards = await listRecall(db);
    expect(cards.some((row) => row.id === "card-glue")).toBe(false);
    expect(cards.find((row) => row.id === "card-practiced")?.collectionId).toBeUndefined();
  });

  it("seeds recall from class notes only", async () => {
    const db = await openStudioDb();
    await putCollection(db, folder);
    await putRecallCard(db, {
      id: "card-glue",
      moduleId: "tb-tnseq-transit",
      checkId: "say-back",
      prompt: "Say back TRANSIT",
      kind: "conceptual",
      createdAt: 1,
      misses: 0,
      lastMissedAt: 1,
      collectionId: folder.id,
    });
    const plan = await seedClassStudios(db, folder, [note]);
    expect(plan.moduleIds).toEqual([]);
    expect(plan.paperQueries).toEqual([]);
    expect(plan.noteCards).toBeGreaterThan(0);
    const cards = await listRecall(db);
    expect(cards.every((row) => row.noteId === note.id || row.collectionId !== folder.id)).toBe(true);
    expect(cards.some((row) => row.id === "card-glue")).toBe(false);
  });
});
