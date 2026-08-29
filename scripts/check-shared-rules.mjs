import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siblings = ["gym", "daymark", "fare", "slate", "notes", "research", "degree", "recipes", "radar"];
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonical = readFileSync(resolve(repository, "firestore.rules"));
const expected = readFileSync(resolve(repository, "shared-firestore-rules.sha256"), "utf8").trim();
const actual = createHash("sha256").update(canonical).digest("hex");

if (actual !== expected) {
  throw new Error(`firestore.rules digest mismatch: expected ${expected}, received ${actual}`);
}

const checked = [];
for (const sibling of siblings) {
  const path = resolve(repository, "..", sibling, "firestore.rules");
  if (!existsSync(path)) continue;
  if (!readFileSync(path).equals(canonical)) {
    throw new Error(`${sibling}/firestore.rules differs from Simplfy's shared ruleset`);
  }
  checked.push(sibling);
}

console.log(`Shared Firestore rules verified at ${actual}${checked.length ? ` against ${checked.join(", ")}` : ""}.`);
