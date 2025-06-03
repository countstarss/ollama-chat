import { useEffect } from "react";
import { useLibraryStore } from "@/store/useLibraryStore";

export function useLibrarySession() {
  const { libraries, createLibrary, renameLibrary, removeLibrary, loadAll } =
    useLibraryStore();

  // 初始加载
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    libraries,
    createLibrary,
    renameLibrary,
    removeLibrary,
    reload: loadAll,
  };
}
