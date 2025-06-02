import { useCallback, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { KnowledgeLibrary } from "@/types/knowledge";
import {
  getAllLibraries,
  saveLibrary,
  deleteLibrary,
} from "@/services/libraryStorage";

export function useLibrarySession() {
  const [libraries, setLibraries] = useState<KnowledgeLibrary[]>([]);

  const loadAll = useCallback(async () => {
    const libs = await getAllLibraries();
    setLibraries(libs);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const createLibrary = useCallback(async (name = "未命名知识库") => {
    const lib: KnowledgeLibrary = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
    };
    await saveLibrary(lib);
    setLibraries((prev) => [...prev, lib]);
    return lib.id;
  }, []);

  const renameLibrary = useCallback(
    async (id: string, name: string) => {
      const lib = libraries.find((l) => l.id === id);
      if (!lib) return;
      const updated = { ...lib, name };
      await saveLibrary(updated);
      setLibraries((prev) => prev.map((l) => (l.id === id ? updated : l)));
    },
    [libraries]
  );

  const removeLibrary = useCallback(async (id: string) => {
    await deleteLibrary(id);
    setLibraries((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return {
    libraries,
    createLibrary,
    renameLibrary,
    removeLibrary,
    reload: loadAll,
  };
}
