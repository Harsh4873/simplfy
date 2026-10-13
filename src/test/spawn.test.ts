import { describe, expect, it } from "vitest";
import { cardsFromNoteText } from "../library/noteCards";
import {
  getCollection,
  getLibraryItem,
  getStudio,
  listRecall,
  listStudios,
  openStudioDb,
  putCollection,
  putLibraryItem,
  putRecallCard,
  putStudio,
  type Collection,
  type LibraryItem,
} from "../library/db";
import { isolateClassFromCatalogue, removeFiledCollection, removeFiledSource, seedClassStudios, seedNoteDeck } from "../library/spawn";

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

  it("refreshes a missed card when the note changes and drops a removed heading", async () => {
    const db = await openStudioDb();
    const item: LibraryItem = { ...note, id: "solo", collectionId: undefined };
    await seedNoteDeck(db, item);
    const before = await listRecall(db);
    const card = before.find((row) => row.noteId === "solo" && /5-tuple/i.test(row.prompt));
    expect(card).toBeTruthy();
    await putRecallCard(db, { ...card!, misses: 4, prompt: "old prompt", answer: "old answer that was frozen" });
    await putRecallCard(db, {
      id: "gone",
      moduleId: "note",
      checkId: "solo:removed",
      prompt: "Removed heading",
      answer: "This answer should leave when the heading is gone.",
      kind: "conceptual",
      createdAt: 1,
      misses: 2,
      lastMissedAt: 1,
      noteId: "solo",
    });
    await seedNoteDeck(db, {
      ...item,
      text: "# Last class\n\n## DFA 5-tuple\n\nA DFA is five parts: states, alphabet, transition, start, and accept states.\n",
    });
    const after = await listRecall(db);
    const updated = after.find((row) => row.id === card!.id);
    expect(updated?.misses).toBe(4);
    expect(updated?.answer).toMatch(/five parts/i);
    expect(after.some((row) => row.id === "gone")).toBe(false);

    await putCollection(db, folder);
    await seedClassStudios(db, folder, [note]);
    const classCards = await listRecall(db);
    const classCard = classCards.find((row) => row.noteId === note.id && /5-tuple/i.test(row.prompt));
    expect(classCard).toBeTruthy();
    await putRecallCard(db, { ...classCard!, misses: 3, prompt: "stale", answer: "stale answer" });
    await seedClassStudios(db, folder, [{
      ...note,
      text: "# Last class\n\n## DFA 5-tuple\n\nA DFA is five parts: states, alphabet, transition, start, and accept states.\n",
    }]);
    const classAfter = await listRecall(db);
    const classUpdated = classAfter.find((row) => row.id === classCard!.id);
    expect(classUpdated?.misses).toBe(3);
    expect(classUpdated?.answer).toMatch(/five parts/i);
  });

  it("deletes a loose file's recall rows from the store", async () => {
    const db = await openStudioDb();
    const item: LibraryItem = { ...note, id: "loose", collectionId: undefined, relPath: "loose.md" };
    await putLibraryItem(db, item);
    await putRecallCard(db, {
      id: "only-in-db",
      moduleId: "note",
      checkId: "loose:extra",
      prompt: "Extra card",
      answer: "This card is only in the database.",
      kind: "conceptual",
      createdAt: 1,
      misses: 1,
      lastMissedAt: 1,
      noteId: "loose",
    });
    await removeFiledSource(db, "loose");
    expect(await getLibraryItem(db, "loose")).toBeUndefined();
    expect(await getStudio(db, "note:loose")).toBeUndefined();
    expect((await listRecall(db)).some((row) => row.noteId === "loose")).toBe(false);
  });

  it("rebuilds a capped class deck after one file is removed", async () => {
    const db = await openStudioDb();
    await putCollection(db, folder);
    const pack = (id: string, name: string) => {
      const sections = Array.from({ length: 16 }, (_, index) =>
        `## Point ${index} for ${id}\n\nThis sentence is long enough to cut a recall card from heading ${index}.\n`,
      ).join("\n");
      const text = `# ${name}\n\n${sections}`;
      const item: LibraryItem = {
        id,
        kind: "note",
        name,
        mime: "text/markdown",
        size: text.length,
        text,
        createdAt: 1,
        collectionId: folder.id,
        relPath: name,
      };
      return item;
    };
    const early = pack("early", "a-early.md");
    const mid = pack("mid", "b-mid.md");
    const late = pack("late", "c-late.md");
    await putLibraryItem(db, early);
    await putLibraryItem(db, mid);
    await putLibraryItem(db, late);
    const plan = await seedClassStudios(db, folder, [early, mid, late]);
    expect(plan.cardsCapped).toBe(true);
    const before = await listRecall(db);
    const lateBuilt = cardsFromNoteText(late.text, late.id, late.name).length;
    const lateBefore = before.filter((row) => row.noteId === late.id).length;
    expect(lateBefore).toBeGreaterThan(0);
    expect(lateBefore).toBeLessThan(lateBuilt);
    const midCard = before.find((row) => row.noteId === mid.id);
    expect(midCard).toBeTruthy();
    await putRecallCard(db, { ...midCard!, misses: 5 });
    await putRecallCard(db, {
      id: "orphan-early",
      moduleId: "note",
      checkId: "early:orphan",
      prompt: "Orphan from the removed file",
      answer: "This row was stored after the deck was built.",
      kind: "conceptual",
      createdAt: 2,
      misses: 1,
      lastMissedAt: 2,
      noteId: early.id,
      collectionId: folder.id,
    });

    await removeFiledSource(db, early.id);

    const after = await listRecall(db);
    expect(await getLibraryItem(db, early.id)).toBeUndefined();
    expect(after.some((row) => row.noteId === early.id)).toBe(false);
    expect(after.filter((row) => row.noteId === late.id).length).toBe(lateBuilt);
    expect(after.find((row) => row.id === midCard!.id)?.misses).toBe(5);
  });

  it("removes a class from the store, including rows missing from a stale snapshot", async () => {
    const db = await openStudioDb();
    await putCollection(db, folder);
    await putLibraryItem(db, note);
    await putStudio(db, {
      id: `class:${folder.id}`,
      kind: "class",
      title: folder.name,
      collectionId: folder.id,
      pinned: false,
      createdAt: 1,
      updatedAt: 1,
    });
    await putRecallCard(db, {
      id: "class-only",
      moduleId: "note",
      checkId: "note-dfa:hidden",
      prompt: "Stored only in the database",
      answer: "This card should leave with the class.",
      kind: "conceptual",
      createdAt: 1,
      misses: 0,
      lastMissedAt: 1,
      noteId: note.id,
      collectionId: folder.id,
    });
    await removeFiledCollection(db, folder.id);
    expect(await getCollection(db, folder.id)).toBeUndefined();
    expect(await getLibraryItem(db, note.id)).toBeUndefined();
    expect(await getStudio(db, `class:${folder.id}`)).toBeUndefined();
    expect(await getStudio(db, `note:${note.id}`)).toBeUndefined();
    expect((await listRecall(db)).some((row) => row.collectionId === folder.id || row.noteId === note.id)).toBe(false);
  });
});
