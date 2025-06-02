"use client";
import { useCallback, useEffect, useState } from "react";
import { openDB, IDBPDatabase } from "idb";

interface LocalDoc {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: ArrayBuffer;
  status: "pending" | "uploading" | "synced" | "error";
  libraryId?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB("ollama-docs", 1, {
      upgrade(db) {
        db.createObjectStore("files", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export function useDocStore(libraryId?: string) {
  const [docs, setDocs] = useState<LocalDoc[]>([]);

  // 加载所有文件
  const loadDocs = useCallback(async () => {
    const db = await getDb();
    const all = (await db.getAll("files")) as LocalDoc[];
    setDocs(all.filter((d) => d.libraryId === libraryId));
  }, [libraryId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // 添加文件
  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const db = await getDb();
      const newDocs: LocalDoc[] = [];

      for (const file of Array.from(files)) {
        const buffer = await file.arrayBuffer();
        const doc: LocalDoc = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          content: buffer,
          status: "pending",
          libraryId,
        };
        await db.put("files", doc);
        newDocs.push(doc);
      }
      setDocs((prev) => [...prev, ...newDocs]);
    },
    [libraryId]
  );

  // 上传单个文件
  const uploadDoc = useCallback(
    async (doc: LocalDoc) => {
      const db = await getDb();
      // 更新状态为 uploading
      await db.put("files", { ...doc, status: "uploading" });
      setDocs((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "uploading" } : d))
      );

      try {
        const formData = new FormData();
        formData.append("file", new File([doc.content], doc.name));
        if (libraryId) formData.append("libraryId", libraryId);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(await res.text());

        await db.put("files", { ...doc, status: "synced" });
        setDocs((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, status: "synced" } : d))
        );
      } catch (e) {
        console.error(e);
        await db.put("files", { ...doc, status: "error" });
        setDocs((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, status: "error" } : d))
        );
      }
    },
    [libraryId]
  );

  // 批量上传 pending 文件
  const syncAll = useCallback(async () => {
    const pending = docs.filter(
      (d) =>
        (d.status === "pending" || d.status === "error") &&
        d.libraryId === libraryId
    );
    for (const doc of pending) {
      await uploadDoc(doc);
    }
  }, [docs, uploadDoc, libraryId]);

  return {
    docs,
    addFiles,
    uploadDoc,
    syncAll,
    reload: loadDocs,
  };
}
