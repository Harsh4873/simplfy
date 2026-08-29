import type { SyncMetadata, SyncStore } from "./library/db";

export const MAX_SYNC_RECORD_BYTES = 850_000;

export interface SyncEnvelope {
  schemaVersion: 1;
  id: string;
  updatedAtMs: number;
  clientId: string;
  deleted: boolean;
  data?: Record<string, unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 800;
}

function validClientId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

export function parseSyncEnvelope(value: unknown): SyncEnvelope | null {
  if (!isObject(value)
    || value.schemaVersion !== 1
    || !validId(value.id)
    || typeof value.updatedAtMs !== "number"
    || !Number.isSafeInteger(value.updatedAtMs)
    || value.updatedAtMs < 0
    || !validClientId(value.clientId)
    || typeof value.deleted !== "boolean") return null;

  if (value.deleted) {
    if ("data" in value) return null;
    return {
      schemaVersion: 1,
      id: value.id,
      updatedAtMs: value.updatedAtMs,
      clientId: value.clientId,
      deleted: true,
    };
  }
  if (!isObject(value.data)) return null;
  return {
    schemaVersion: 1,
    id: value.id,
    updatedAtMs: value.updatedAtMs,
    clientId: value.clientId,
    deleted: false,
    data: value.data,
  };
}

export function syncRowId(store: SyncStore, value: Record<string, unknown>): string | null {
  const id = store === "prefs" ? value.key : value.id;
  return validId(id) ? id : null;
}

export function isValidSyncRow(
  store: SyncStore,
  id: string,
  value: Record<string, unknown>,
): boolean {
  if (syncRowId(store, value) !== id) return false;
  if (store === "prefs") return typeof value.value === "string";
  if (store === "collections") {
    return typeof value.name === "string"
      && typeof value.createdAt === "number"
      && typeof value.updatedAt === "number";
  }
  if (store === "studios") {
    return ["lesson", "note", "papers", "class"].includes(String(value.kind))
      && typeof value.title === "string"
      && typeof value.pinned === "boolean"
      && typeof value.createdAt === "number"
      && typeof value.updatedAt === "number";
  }
  if (store === "recall") {
    return typeof value.moduleId === "string"
      && typeof value.checkId === "string"
      && typeof value.prompt === "string"
      && ["conceptual", "calculation", "figure"].includes(String(value.kind))
      && typeof value.createdAt === "number"
      && typeof value.misses === "number"
      && typeof value.lastMissedAt === "number";
  }
  return ["file", "note", "paper"].includes(String(value.kind))
    && typeof value.name === "string"
    && typeof value.mime === "string"
    && typeof value.size === "number"
    && typeof value.text === "string"
    && typeof value.createdAt === "number";
}

function cleanValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    return value.map(cleanValue).filter((item) => item !== undefined);
  }
  if (!isObject(value)) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const next = cleanValue(item);
    if (next !== undefined) clean[key] = next;
  }
  return clean;
}

export function syncableData(
  store: SyncStore,
  value: Record<string, unknown>,
): Record<string, unknown> | null {
  const source = store === "library"
    ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== "blob" && key !== "brief"))
    : value;
  const clean = cleanValue(source);
  if (!isObject(clean) || !isValidSyncRow(store, syncRowId(store, clean) ?? "", clean)) return null;
  const bytes = new TextEncoder().encode(JSON.stringify(clean)).byteLength;
  return bytes <= MAX_SYNC_RECORD_BYTES ? clean : null;
}

export function compareSyncVersion(
  left: Pick<SyncEnvelope, "updatedAtMs" | "clientId">,
  right: Pick<SyncEnvelope, "updatedAtMs" | "clientId">,
) {
  return left.updatedAtMs - right.updatedAtMs || left.clientId.localeCompare(right.clientId);
}

export function metadataFor(
  store: SyncStore,
  envelope: SyncEnvelope,
): SyncMetadata {
  return {
    key: `${store}:${envelope.id}`,
    store,
    id: envelope.id,
    updatedAtMs: envelope.updatedAtMs,
    clientId: envelope.clientId,
    deleted: envelope.deleted,
  };
}

export function encodeSyncDocumentId(id: string): string | null {
  const bytes = new TextEncoder().encode(id);
  if (bytes.byteLength > 800) return null;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
