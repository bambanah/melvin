// Minimal IndexedDB persistence for the Log's on-device state: one record
// holding sessions, clients, and the mutation queue. The payload is a day or
// two of captures, so whole-record writes stay cheap and atomic - no need for
// per-row stores or an IndexedDB wrapper dependency.
import type { LogClient, LogOp, LogSession } from "./log-types";

const DB_NAME = "melvin-log";
const STORE = "log";
const KEY = "state";

export interface PersistedLog {
	sessions: LogSession[];
	clients: LogClient[];
	queue: LogOp[];
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore(STORE);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function withStore<T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	const db = await openDb();
	try {
		return await new Promise<T>((resolve, reject) => {
			const request = run(db.transaction(STORE, mode).objectStore(STORE));
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	} finally {
		db.close();
	}
}

export async function loadPersistedLog(): Promise<PersistedLog | null> {
	try {
		return (await withStore("readonly", (store) => store.get(KEY))) ?? null;
	} catch {
		// A broken or unavailable IndexedDB (private browsing, storage pressure)
		// degrades to online-only behaviour rather than blocking the Log.
		return null;
	}
}

export async function savePersistedLog(state: PersistedLog): Promise<void> {
	try {
		await withStore("readwrite", (store) => store.put(state, KEY));
	} catch {
		// Same degradation as loading: captures still work for this page's
		// lifetime and sync opportunistically; they just don't survive a close.
	}
}
