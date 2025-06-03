import { create } from "zustand";
import { KnowledgeLibrary } from "@/types/knowledge";
import { v4 as uuidv4 } from "uuid";
import {
  getAllLibraries,
  saveLibrary,
  deleteLibrary,
} from "@/services/libraryStorage";

interface LibraryState {
  libraries: KnowledgeLibrary[];
  loadAll: () => Promise<void>;
  createLibrary: (name?: string) => Promise<string>;
  renameLibrary: (id: string, name: string) => Promise<void>;
  removeLibrary: (id: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  libraries: [],

  // 加载所有知识库
  loadAll: async () => {
    const libs = await getAllLibraries();
    set({ libraries: libs });
  },

  // 创建知识库
  createLibrary: async (name = "未命名知识库") => {
    const lib: KnowledgeLibrary = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
    };
    await saveLibrary(lib);
    set((state) => ({ libraries: [...state.libraries, lib] }));
    return lib.id;
  },

  // 重命名知识库
  renameLibrary: async (id, name) => {
    const libs = get().libraries;
    const idx = libs.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const updated: KnowledgeLibrary = { ...libs[idx], name };
    await saveLibrary(updated);
    set((state) => ({
      libraries: state.libraries.map((l) => (l.id === id ? updated : l)),
    }));
  },

  // 删除知识库
  removeLibrary: async (id) => {
    await deleteLibrary(id);
    set((state) => ({
      libraries: state.libraries.filter((l) => l.id !== id),
    }));
  },
}));
