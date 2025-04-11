import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DisplayMessage } from "@/components/chat/ChatMessage";
import starStorageService, {
  StarredMessage,
} from "@/services/starStorageService";
import toastService from "@/services/toastService";

// 定义星标状态接口
interface StarState {
  starredMessages: StarredMessage[];
  isLoading: boolean;
  searchResults: StarredMessage[];
  searchQuery: string;
  hasInitialized: boolean; // 添加初始化标志，用于缓存控制

  // 初始化星标消息
  init: () => Promise<void>;

  // 添加星标消息
  addStar: (message: DisplayMessage) => Promise<boolean>;

  // 移除星标消息
  removeStar: (messageId: string) => Promise<boolean>;

  // 检查消息是否已星标
  isStarred: (messageId: string) => boolean;

  // 搜索星标消息
  searchStarredMessages: (query: string) => Promise<void>;

  // 刷新星标消息列表
  refreshStarredMessages: () => Promise<void>;

  // 更新星标消息标题
  updateStarTitle: (messageId: string, title: string) => Promise<boolean>;

  // 获取星标消息详情
  getStarredMessage: (messageId: string) => StarredMessage | undefined;
}

// 创建星标状态存储
export const useStarStore = create<StarState>()(
  persist(
    (set, get) => ({
      starredMessages: [],
      isLoading: false,
      searchResults: [],
      searchQuery: "",
      hasInitialized: false, // 初始未初始化

      // 初始化，从IndexedDB加载星标消息，但添加缓存控制
      init: async () => {
        // 如果已经初始化过且有数据，则直接返回，不重新加载
        const { hasInitialized, starredMessages } = get();
        if (hasInitialized && starredMessages.length > 0) {
          console.log("[收藏缓存] 使用缓存数据，跳过重新加载");
          return;
        }

        try {
          set({ isLoading: true });
          console.log("[收藏] 正在从数据库加载收藏消息...");
          const messages = await starStorageService.getAllStarredMessages();
          set({
            starredMessages: messages,
            isLoading: false,
            hasInitialized: true, // 标记为已初始化
          });
          console.log(`[收藏] 加载完成，共 ${messages.length} 条收藏`);
        } catch (error) {
          console.error("[收藏] 加载星标消息失败:", error);
          set({ isLoading: false });
        }
      },

      // 添加星标消息
      addStar: async (message: DisplayMessage) => {
        try {
          const { starredMessages } = get();
          // 检查是否已经收藏
          if (starredMessages.some((sm) => sm.id === message.id)) {
            return true; // 已收藏，直接返回成功
          }

          const starredMessage = await starStorageService.saveStarredMessage(
            message
          );
          set({
            starredMessages: [...starredMessages, starredMessage],
            hasInitialized: true, // 确保标记为已初始化
          });
          return true;
        } catch (error) {
          console.error("收藏消息失败:", error);
          toastService.error("收藏消息失败");
          return false;
        }
      },

      // 移除星标消息
      removeStar: async (messageId: string) => {
        try {
          await starStorageService.removeStarredMessage(messageId);
          const { starredMessages, searchResults, searchQuery } = get();

          // 更新状态，移除已删除的消息
          const updatedMessages = starredMessages.filter(
            (m) => m.id !== messageId
          );
          set({ starredMessages: updatedMessages });

          // 如果有搜索结果，也更新搜索结果
          if (searchQuery) {
            const updatedResults = searchResults.filter(
              (m) => m.id !== messageId
            );
            set({ searchResults: updatedResults });
          }

          return true;
        } catch (error) {
          console.error("取消收藏失败:", error);
          toastService.error("取消收藏失败");
          return false;
        }
      },

      // 检查消息是否已收藏
      isStarred: (messageId: string) => {
        const { starredMessages } = get();
        return starredMessages.some((m) => m.id === messageId);
      },

      // 搜索收藏消息
      searchStarredMessages: async (query: string) => {
        // 确保先初始化数据
        const { hasInitialized } = get();
        if (!hasInitialized) {
          await get().init();
        }

        try {
          set({ searchQuery: query, isLoading: true });
          const results = await starStorageService.searchStarredMessages(query);
          set({ searchResults: results, isLoading: false });
        } catch (error) {
          console.error("搜索收藏消息失败:", error);
          set({ isLoading: false });
        }
      },

      // 刷新收藏消息列表 - 当确实需要刷新时调用
      refreshStarredMessages: async () => {
        try {
          set({ isLoading: true });
          console.log("[收藏] 正在刷新收藏消息列表...");
          const messages = await starStorageService.getAllStarredMessages();
          set({
            starredMessages: messages,
            isLoading: false,
            hasInitialized: true,
          });
          console.log(`[收藏] 刷新完成，共 ${messages.length} 条收藏`);

          // 如果有搜索查询，也更新搜索结果
          const { searchQuery } = get();
          if (searchQuery) {
            await get().searchStarredMessages(searchQuery);
          }
        } catch (error) {
          console.error("[收藏] 刷新收藏消息失败:", error);
          set({ isLoading: false });
        }
      },

      // 更新收藏消息标题
      updateStarTitle: async (messageId: string, title: string) => {
        try {
          await starStorageService.updateStarredMessageTitle(messageId, title);

          // 更新内存中的数据
          const { starredMessages, searchResults, searchQuery } = get();

          const updatedMessages = starredMessages.map((m) =>
            m.id === messageId ? { ...m, title } : m
          );

          set({ starredMessages: updatedMessages });

          // 如果有搜索结果，也更新搜索结果
          if (searchQuery) {
            const updatedResults = searchResults.map((m) =>
              m.id === messageId ? { ...m, title } : m
            );
            set({ searchResults: updatedResults });
          }

          return true;
        } catch (error) {
          console.error("更新收藏标题失败:", error);
          toastService.error("更新收藏标题失败");
          return false;
        }
      },

      // 获取收藏消息详情
      getStarredMessage: (messageId: string) => {
        const { starredMessages } = get();
        return starredMessages.find((m) => m.id === messageId);
      },
    }),
    {
      name: "ollama-chat-starred-messages", // localStorage 键名
      partialize: (state) => ({
        starredMessages: state.starredMessages,
        hasInitialized: state.hasInitialized, // 也持久化初始化状态
      }),
    }
  )
);

// 初始化store - 但不会每次都重新加载数据
if (typeof window !== "undefined") {
  // 在客户端环境中初始化
  useStarStore.getState().init();
}
