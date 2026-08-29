import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

const PROJECT_ID = "demo-simplfy";
const MEMBER_UID = "approved-member";
const VAULT_ID = "owner-vault-1234";

function record(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    id: "source-1",
    updatedAtMs: 100,
    clientId: "client_1234",
    deleted: false,
    data: {
      id: "source-1",
      kind: "note",
      name: "Likelihood notes",
      mime: "text/plain",
      size: 20,
      text: "Nested models only.",
      createdAt: 1,
    },
    ...overrides,
  };
}

describe("Simplfy Firestore rules", () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: await readFile("firestore.rules", "utf8"),
      },
    });
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "owner_vault_members", MEMBER_UID), {
        schemaVersion: 1,
        vaultId: VAULT_ID,
        status: "active",
      });
    });
  });

  afterAll(async () => environment?.cleanup());

  it("lets a provisioned verified Google member sync an allowed store", async () => {
    const context = environment.authenticatedContext(MEMBER_UID, {
      email: "member@example.test",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
    });
    const reference = doc(context.firestore(), "simplfy_users", VAULT_ID, "library", "source-1");
    await assertSucceeds(setDoc(reference, record()));
    await assertSucceeds(getDoc(reference));
  });

  it("denies unprovisioned accounts and unknown stores", async () => {
    const outsider = environment.authenticatedContext("outsider", {
      email: "outsider@example.test",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
    });
    await assertFails(setDoc(
      doc(outsider.firestore(), "simplfy_users", VAULT_ID, "library", "source-1"),
      record(),
    ));

    const member = environment.authenticatedContext(MEMBER_UID, {
      email: "member@example.test",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
    });
    await assertFails(setDoc(
      doc(member.firestore(), "simplfy_users", VAULT_ID, "secrets", "source-1"),
      record(),
    ));
  });

  it("accepts tombstones and rejects physical deletion", async () => {
    const context = environment.authenticatedContext(MEMBER_UID, {
      email: "member@example.test",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
    });
    const reference = doc(context.firestore(), "simplfy_users", VAULT_ID, "library", "source-1");
    await assertSucceeds(setDoc(reference, {
      schemaVersion: 1,
      id: "source-1",
      updatedAtMs: 200,
      clientId: "client_1234",
      deleted: true,
    }));
    await assertFails(deleteDoc(reference));
  });
});
