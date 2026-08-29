import { describe, expect, it } from "vitest";
import {
  compareSyncVersion,
  encodeSyncDocumentId,
  parseSyncEnvelope,
  syncableData,
} from "../sync-core";

describe("Simplfy sync records", () => {
  it("keeps extracted study text but never sends uploaded blobs or derived briefs", () => {
    const data = syncableData("library", {
      id: "source-1",
      kind: "note",
      name: "Likelihood notes",
      mime: "text/plain",
      size: 20,
      text: "Nested models only.",
      createdAt: 1,
      blob: new Blob(["private original"]),
      brief: { title: "Derived" },
    });

    expect(data).toMatchObject({ id: "source-1", text: "Nested models only." });
    expect(data).not.toHaveProperty("blob");
    expect(data).not.toHaveProperty("brief");
  });

  it("parses live records and tombstones but rejects malformed envelopes", () => {
    expect(parseSyncEnvelope({
      schemaVersion: 1,
      id: "source-1",
      updatedAtMs: 10,
      clientId: "client_1234",
      deleted: false,
      data: { id: "source-1" },
    })?.deleted).toBe(false);

    expect(parseSyncEnvelope({
      schemaVersion: 1,
      id: "source-1",
      updatedAtMs: 20,
      clientId: "client_1234",
      deleted: true,
    })?.deleted).toBe(true);

    expect(parseSyncEnvelope({
      schemaVersion: 1,
      id: "source-1",
      updatedAtMs: -1,
      clientId: "short",
      deleted: false,
      data: {},
    })).toBeNull();
  });

  it("uses a stable tie-breaker and Firestore-safe document ids", () => {
    expect(compareSyncVersion(
      { updatedAtMs: 20, clientId: "client_b" },
      { updatedAtMs: 20, clientId: "client_a" },
    )).toBeGreaterThan(0);
    expect(encodeSyncDocumentId("papers:rpoB/I491F")).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
