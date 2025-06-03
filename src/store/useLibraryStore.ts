import { create } from "zustand";
import { KnowledgeLibrary } from "@/types/knowledge";
import { DisplayMessage } from "@/components/chat/ChatMessage";
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
  appendMessages: (id: string, newMsgs: DisplayMessage[]) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  libraries: [],

  // 加载所有知识库
  loadAll: async () => {
    const libs = await getAllLibraries();
    // 兼容旧数据：确保messages字段存在
    const normalized = libs.map((l) => ({ ...l, messages: l.messages || [] }));
    set({ libraries: normalized });
  },

  // 创建知识库
  createLibrary: async (name = "未命名知识库") => {
    const lib: KnowledgeLibrary = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
      messages: [],
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

  // 追加对话消息
  appendMessages: async (id, newMsgs) => {
    if (!newMsgs || newMsgs.length === 0) return;
    const libs = get().libraries;
    const idx = libs.findIndex((l) => l.id === id);
    if (idx === -1) return;

    const existing = libs[idx].messages || [];
    const updated: KnowledgeLibrary = {
      ...libs[idx],
      messages: [...existing, ...newMsgs],
    };

    await saveLibrary(updated);
    set((state) => ({
      libraries: state.libraries.map((l) => (l.id === id ? updated : l)),
    }));
  },
}));
