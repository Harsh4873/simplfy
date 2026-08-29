import { useCallback, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  waitForPendingWrites,
  type Unsubscribe,
} from "firebase/firestore";
import { authPersistenceReady, firebaseAuth, googleProvider, simplfyFirestore } from "./firebase";
import {
  SYNC_STORES,
  applyRemoteSyncRecord,
  clearStudioData,
  getSyncMetadata,
  listSyncMetadata,
  listSyncStoreRows,
  putSyncMetadata,
  subscribeStudioMutations,
  syncMetadataKey,
  type StudioMutation,
  type SyncMetadata,
  type SyncStore,
} from "./library/db";
import { resolveOwnerVault } from "./owner-vault";
import {
  compareSyncVersion,
  encodeSyncDocumentId,
  isValidSyncRow,
  metadataFor,
  parseSyncEnvelope,
  syncRowId,
  syncableData,
  type SyncEnvelope,
} from "./sync-core";

export type SimplfySyncStatus =
  | "connecting"
  | "syncing"
  | "synced"
  | "offline"
  | "signed-out"
  | "action-needed";

export interface SimplfySync {
  status: SimplfySyncStatus;
  user: User | null;
  message?: string;
  lastSyncedAt?: string;
  signingOut: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

function friendlyError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code).toLowerCase()
    : "";
  if (code.includes("popup-closed-by-user")) return "Sign-in was cancelled. Your local study desk is unchanged.";
  if (code.includes("popup-blocked")) return "Allow the Google sign-in window, then try again.";
  if (code.includes("permission-denied")) return "Simplfy could not access its private cloud record. Your local study desk is still safe.";
  if (code.includes("unavailable") || !navigator.onLine) return "Offline — changes stay on this device and sync after reconnection.";
  return error instanceof Error ? error.message : "Simplfy could not finish syncing.";
}

function createClientId() {
  const key = "simplfy-sync-client-v1";
  try {
    const stored = localStorage.getItem(key);
    if (stored && /^[A-Za-z0-9_-]{8,128}$/.test(stored)) return stored;
    const next = crypto.randomUUID().replaceAll("-", "");
    localStorage.setItem(key, next);
    return next;
  } catch {
    return crypto.randomUUID().replaceAll("-", "");
  }
}

function envelopeFromLocal(
  store: SyncStore,
  id: string,
  value: Record<string, unknown> | null,
  metadata: Pick<SyncMetadata, "updatedAtMs" | "clientId" | "deleted">,
): SyncEnvelope | null {
  if (metadata.deleted) {
    return {
      schemaVersion: 1,
      id,
      updatedAtMs: metadata.updatedAtMs,
      clientId: metadata.clientId,
      deleted: true,
    };
  }
  if (!value) return null;
  const data = syncableData(store, value);
  if (!data) return null;
  return {
    schemaVersion: 1,
    id,
    updatedAtMs: metadata.updatedAtMs,
    clientId: metadata.clientId,
    deleted: false,
    data,
  };
}

function rowMap(store: SyncStore, rows: Record<string, unknown>[]) {
  const map = new Map<string, Record<string, unknown>>();
  rows.forEach((row) => {
    const id = syncRowId(store, row);
    if (id && isValidSyncRow(store, id, row)) map.set(id, row);
  });
  return map;
}

export function useSimplfySync(
  database: IDBDatabase | null,
  refresh: (database: IDBDatabase) => Promise<void>,
): SimplfySync {
  const [status, setStatus] = useState<SimplfySyncStatus>("connecting");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<string>();
  const [lastSyncedAt, setLastSyncedAt] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);
  const clientIdRef = useRef<string | undefined>(undefined);
  const activeVaultRef = useRef<string | null>(null);
  const pendingWritesRef = useRef(0);
  const listenersRef = useRef<Unsubscribe[]>([]);
  const tooLargeRef = useRef(new Set<string>());

  if (!clientIdRef.current) clientIdRef.current = createClientId();

  const stopListeners = useCallback(() => {
    listenersRef.current.forEach((unsubscribe) => unsubscribe());
    listenersRef.current = [];
  }, []);

  const markSynced = useCallback(() => {
    if (tooLargeRef.current.size > 0) {
      const count = tooLargeRef.current.size;
      setStatus("action-needed");
      setMessage(`${count} unusually large local source${count === 1 ? " is" : "s are"} staying on this device; everything else is synced.`);
      return;
    }
    setStatus(navigator.onLine ? "synced" : "offline");
    setMessage(navigator.onLine ? undefined : "Changes stay here and sync when this device reconnects.");
    setLastSyncedAt(new Date().toISOString());
  }, []);

  const writeEnvelope = useCallback(async (vaultId: string, store: SyncStore, envelope: SyncEnvelope) => {
    const documentId = encodeSyncDocumentId(envelope.id);
    if (!documentId) {
      tooLargeRef.current.add(syncMetadataKey(store, envelope.id));
      markSynced();
      return;
    }
    pendingWritesRef.current += 1;
    setStatus(navigator.onLine ? "syncing" : "offline");
    try {
      await setDoc(doc(simplfyFirestore, "simplfy_users", vaultId, store, documentId), envelope);
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
      if (pendingWritesRef.current === 0) markSynced();
    } catch (error) {
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
      setStatus(navigator.onLine ? "action-needed" : "offline");
      setMessage(friendlyError(error));
    }
  }, [markSynced]);

  useEffect(() => {
    if (!database) return;
    let disposed = false;
    let authRevision = 0;
    let unsubscribeAuth: Unsubscribe = () => undefined;
    let mutationQueue = Promise.resolve();

    async function recordMutation(mutation: StudioMutation) {
      if (disposed) return;
      const current = await getSyncMetadata(database!, mutation.store, mutation.id);
      const metadata: SyncMetadata = {
        key: syncMetadataKey(mutation.store, mutation.id),
        store: mutation.store,
        id: mutation.id,
        updatedAtMs: Math.max(mutation.updatedAtMs, (current?.updatedAtMs ?? 0) + 1),
        clientId: clientIdRef.current!,
        deleted: mutation.value === null,
      };
      await putSyncMetadata(database!, metadata);
      const envelope = envelopeFromLocal(mutation.store, mutation.id, mutation.value, metadata);
      if (!envelope) {
        tooLargeRef.current.add(metadata.key);
        if (activeVaultRef.current) markSynced();
        return;
      }
      tooLargeRef.current.delete(metadata.key);
      const vaultId = activeVaultRef.current;
      if (vaultId) await writeEnvelope(vaultId, mutation.store, envelope);
    }

    const unsubscribeMutations = subscribeStudioMutations((mutation) => {
      mutationQueue = mutationQueue.then(() => recordMutation(mutation)).catch((error) => {
        setStatus(navigator.onLine ? "action-needed" : "offline");
        setMessage(friendlyError(error));
      });
    });

    async function applyRemote(store: SyncStore, envelope: SyncEnvelope) {
      const current = await getSyncMetadata(database!, store, envelope.id);
      if (current && compareSyncVersion(envelope, current) <= 0) return false;
      const value = envelope.deleted ? null : envelope.data ?? null;
      if (value && !isValidSyncRow(store, envelope.id, value)) {
        throw new Error(`The cloud ${store} record “${envelope.id}” has an unsupported format.`);
      }
      await applyRemoteSyncRecord(database!, store, envelope.id, value, metadataFor(store, envelope));
      return true;
    }

    function watchCloud(vaultId: string) {
      stopListeners();
      SYNC_STORES.forEach((store) => {
        const unsubscribe = onSnapshot(
          collection(simplfyFirestore, "simplfy_users", vaultId, store),
          async (snapshot) => {
            try {
              let changed = false;
              for (const change of snapshot.docChanges()) {
                if (change.type === "removed") continue;
                const envelope = parseSyncEnvelope(change.doc.data());
                if (!envelope) throw new Error(`The cloud ${store} record has an unsupported format.`);
                changed = await applyRemote(store, envelope) || changed;
              }
              if (changed) await refresh(database!);
              if (!snapshot.metadata.fromCache && pendingWritesRef.current === 0) markSynced();
            } catch (error) {
              setStatus("action-needed");
              setMessage(friendlyError(error));
            }
          },
          (error) => {
            setStatus(navigator.onLine ? "action-needed" : "offline");
            setMessage(friendlyError(error));
          },
        );
        listenersRef.current.push(unsubscribe);
      });
    }

    async function bootstrap(vaultId: string) {
      setStatus(navigator.onLine ? "syncing" : "offline");
      setMessage(undefined);

      const [metadataRows, ...localRows] = await Promise.all([
        listSyncMetadata(database!),
        ...SYNC_STORES.map((store) => listSyncStoreRows(database!, store)),
      ]);
      const remoteSnapshots = await Promise.all(
        SYNC_STORES.map((store) => getDocs(collection(simplfyFirestore, "simplfy_users", vaultId, store))),
      );
      if (disposed || activeVaultRef.current !== vaultId) return;

      const metadata = new Map(metadataRows.map((row) => [row.key, row]));
      let changedLocally = false;
      const uploads: Promise<void>[] = [];

      for (let index = 0; index < SYNC_STORES.length; index += 1) {
        const store = SYNC_STORES[index];
        const local = rowMap(store, localRows[index] ?? []);
        const remote = new Map<string, SyncEnvelope>();
        for (const snapshot of remoteSnapshots[index]!.docs) {
          const envelope = parseSyncEnvelope(snapshot.data());
          if (!envelope) throw new Error(`The cloud ${store} record has an unsupported format.`);
          remote.set(envelope.id, envelope);
        }

        const ids = new Set([
          ...local.keys(),
          ...remote.keys(),
          ...metadataRows.filter((row) => row.store === store).map((row) => row.id),
        ]);

        for (const id of ids) {
          const localValue = local.get(id) ?? null;
          const localMetadata = metadata.get(syncMetadataKey(store, id));
          const remoteEnvelope = remote.get(id);

          if (remoteEnvelope && !localMetadata) {
            changedLocally = await applyRemote(store, remoteEnvelope) || changedLocally;
            continue;
          }

          if (remoteEnvelope && localMetadata) {
            if (compareSyncVersion(remoteEnvelope, localMetadata) > 0) {
              changedLocally = await applyRemote(store, remoteEnvelope) || changedLocally;
            } else if (compareSyncVersion(localMetadata, remoteEnvelope) > 0) {
              const localEnvelope = envelopeFromLocal(store, id, localValue, localMetadata);
              if (localEnvelope) uploads.push(writeEnvelope(vaultId, store, localEnvelope));
              else tooLargeRef.current.add(localMetadata.key);
            }
            continue;
          }

          if (!remoteEnvelope && (localValue || localMetadata?.deleted)) {
            const nextMetadata: SyncMetadata = localMetadata ?? {
              key: syncMetadataKey(store, id),
              store,
              id,
              updatedAtMs: Date.now(),
              clientId: clientIdRef.current!,
              deleted: false,
            };
            if (!localMetadata) await putSyncMetadata(database!, nextMetadata);
            const localEnvelope = envelopeFromLocal(store, id, localValue, nextMetadata);
            if (localEnvelope) uploads.push(writeEnvelope(vaultId, store, localEnvelope));
            else tooLargeRef.current.add(nextMetadata.key);
          }
        }
      }

      await Promise.all(uploads);
      if (changedLocally) await refresh(database!);
      watchCloud(vaultId);
      if (pendingWritesRef.current === 0) markSynced();
    }

    async function startSession(authUser: User, revision: number) {
      try {
        const membership = await resolveOwnerVault(simplfyFirestore, authUser);
        if (disposed || revision !== authRevision) return;
        activeVaultRef.current = membership.vaultId;
        setUser(authUser);
        try {
          await bootstrap(membership.vaultId);
        } catch (error) {
          if (disposed || revision !== authRevision) return;
          setStatus(navigator.onLine ? "action-needed" : "offline");
          setMessage(friendlyError(error));
        }
      } catch (error) {
        if (disposed || revision !== authRevision) return;
        activeVaultRef.current = null;
        setUser(null);
        setStatus("action-needed");
        setMessage(friendlyError(error));
      }
    }

    void authPersistenceReady.then(() => {
      if (disposed) return;
      unsubscribeAuth = onAuthStateChanged(firebaseAuth, (authUser) => {
        const revision = ++authRevision;
        stopListeners();
        activeVaultRef.current = null;
        setUser(null);
        if (!authUser) {
          setStatus(navigator.onLine ? "signed-out" : "offline");
          setMessage(navigator.onLine
            ? "Sign in once to sync this study desk across devices."
            : "Offline — this study desk is saved on this device.");
          return;
        }
        void startSession(authUser, revision);
      });
    }).catch((error) => {
      setStatus("action-needed");
      setMessage(friendlyError(error));
    });

    const handleOffline = () => {
      setStatus("offline");
      setMessage("Offline — changes stay on this device and sync after reconnection.");
    };
    const handleOnline = () => {
      const vaultId = activeVaultRef.current;
      if (vaultId) void bootstrap(vaultId).catch((error) => {
        setStatus("action-needed");
        setMessage(friendlyError(error));
      });
      else {
        setStatus("signed-out");
        setMessage("Sign in once to sync this study desk across devices.");
      }
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      disposed = true;
      authRevision += 1;
      unsubscribeAuth();
      unsubscribeMutations();
      stopListeners();
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [database, markSynced, refresh, stopListeners, writeEnvelope]);

  const signIn = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      setMessage("Connect to the internet for Google sign-in.");
      return;
    }
    setStatus("connecting");
    setMessage(undefined);
    try {
      await authPersistenceReady;
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (error) {
      setStatus("action-needed");
      setMessage(friendlyError(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!database || !user) return;
    if (!navigator.onLine) {
      setStatus("action-needed");
      setMessage("Reconnect before signing out so Simplfy can finish every pending sync.");
      return;
    }
    setSigningOut(true);
    setStatus("syncing");
    setMessage("Finishing sync, then clearing this device’s private study desk…");
    try {
      await waitForPendingWrites(simplfyFirestore);
      stopListeners();
      activeVaultRef.current = null;
      await clearStudioData(database);
      await firebaseSignOut(firebaseAuth);
      await refresh(database);
      setLastSyncedAt(undefined);
      setStatus("signed-out");
      setMessage("Signed out. This device’s private study desk was cleared.");
    } catch (error) {
      setStatus("action-needed");
      setMessage(friendlyError(error));
    } finally {
      setSigningOut(false);
    }
  }, [database, refresh, stopListeners, user]);

  return { status, user, message, lastSyncedAt, signingOut, signIn, signOut };
}
