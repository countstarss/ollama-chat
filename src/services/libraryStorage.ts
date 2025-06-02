import { KnowledgeLibrary } from "@/types/knowledge";
import { openDB, IDBPDatabase } from "idb";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB("ollama-library-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("libraries")) {
          db.createObjectStore("libraries", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllLibraries(): Promise<KnowledgeLibrary[]> {
  const db = await getDb();
  return (await db.getAll("libraries")) as KnowledgeLibrary[];
}

export async function saveLibrary(lib: KnowledgeLibrary): Promise<void> {
  const db = await getDb();
  await db.put("libraries", lib);
}

export async function deleteLibrary(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("libraries", id);
}

export async function getLibrary(id: string): Promise<KnowledgeLibrary | null> {
  const db = await getDb();
  const lib = (await db.get("libraries", id)) as KnowledgeLibrary | undefined;
  return lib || null;
}
