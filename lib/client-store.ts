"use client";

import type { DatasetAnalysis, StoredDataset } from "@/lib/types";

const DB_NAME = "excelinsight-ai";
const DB_VERSION = 1;
const DATASETS_STORE = "datasets";
const META_STORE = "metadata";
const LATEST_KEY = "excelinsight.latestDatasetId";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATASETS_STORE)) db.createObjectStore(DATASETS_STORE, { keyPath: "analysis.id" });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "id" });
    };
  });
}

export async function saveDataset(dataset: StoredDataset) {
  const db = await openDb();
  await transaction(db, DATASETS_STORE, "readwrite", (store) => store.put(dataset));
  await transaction(db, META_STORE, "readwrite", (store) =>
    store.put({
      id: dataset.analysis.id,
      fileName: dataset.analysis.fileName,
      createdAt: dataset.analysis.createdAt,
      summary: dataset.analysis.summary,
      sheetName: dataset.analysis.sheetName
    })
  );
  localStorage.setItem(LATEST_KEY, dataset.analysis.id);
}

export async function getDataset(id?: string | null): Promise<StoredDataset | null> {
  const db = await openDb();
  const datasetId = id || localStorage.getItem(LATEST_KEY);
  if (!datasetId) return null;
  return transaction<StoredDataset | undefined>(db, DATASETS_STORE, "readonly", (store) => store.get(datasetId)).then((dataset) => dataset ?? null);
}

export async function listDatasets(): Promise<Array<Pick<DatasetAnalysis, "id" | "fileName" | "createdAt" | "summary" | "sheetName">>> {
  const db = await openDb();
  return transaction(db, META_STORE, "readonly", (store) => store.getAll());
}

export async function deleteDataset(id: string) {
  const db = await openDb();
  await transaction(db, DATASETS_STORE, "readwrite", (store) => store.delete(id));
  await transaction(db, META_STORE, "readwrite", (store) => store.delete(id));
  if (localStorage.getItem(LATEST_KEY) === id) localStorage.removeItem(LATEST_KEY);
}

export function getLatestDatasetId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LATEST_KEY);
}

function transaction<T>(db: IDBDatabase, storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}
