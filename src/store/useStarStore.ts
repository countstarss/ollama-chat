import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  StarredMessage,
  saveStarredMessage,
  deleteStarredMessage,
  getAllStarredMessages,
  isMessageStarred,
} from "@/services/starStorage";
import toastService from "@/services/toastService";

interface StarState {
  // 状态
  starredMessages: StarredMessage[];
  isLoading: boolean;

  // 操作
  addStar: (content: string, tags?: string[]) => Promise<boolean>;
  removeStar: (id: string) => Promise<boolean>;
  searchStars: (
    query: string,
    timeRange?: { start?: number; end?: number }
  ) => Promise<StarredMessage[]>;
  refreshStars: () => Promise<void>;
  checkIfStarred: (content: string) => Promise<boolean>;
}

// 创建Store，添加持久化
export const useStarStore = create<StarState>()(
  persist(
    (set, get) => ({
      starredMessages: [],
      isLoading: false,

      // 添加收藏
      addStar: async (content: string, tags: string[] = []) => {
        try {
          // 检查是否已经收藏
          const alreadyStarred = await isMessageStarred(content);
          if (alreadyStarred) {
            toastService.info("此内容已收藏");
            return false;
          }

          // 创建新收藏
          const newMessage = await saveStarredMessage(content, tags);
          set((state) => ({
            starredMessages: [newMessage, ...state.starredMessages],
          }));
          toastService.success("收藏成功");
          return true;
        } catch (error) {
          console.error("添加收藏失败:", error);
          toastService.error("添加收藏失败");
          return false;
        }
      },

      // 删除收藏
      removeStar: async (id: string) => {
        try {
          const success = await deleteStarredMessage(id);
          if (success) {
            set((state) => ({
              starredMessages: state.starredMessages.filter(
                (msg) => msg.id !== id
              ),
            }));
            toastService.success("已取消收藏");
            return true;
          }
          return false;
        } catch (error) {
          console.error("删除收藏失败:", error);
          toastService.error("删除收藏失败");
          return false;
        }
      },

      // 搜索收藏
      searchStars: async (
        query: string,
        timeRange?: { start?: number; end?: number }
      ) => {
        set({ isLoading: true });
        try {
          const results = await searchStarredMessages(query, timeRange);
          set({
            starredMessages: results,
            isLoading: false,
          });
          return results;
        } catch (error) {
          console.error("搜索收藏失败:", error);
          toastService.error("搜索失败");
          set({ isLoading: false });
          return [];
        }
      },

      // 刷新收藏列表
      refreshStars: async () => {
        set({ isLoading: true });
        try {
          const messages = await getAllStarredMessages();
          set({
            starredMessages: messages,
            isLoading: false,
          });
        } catch (error) {
          console.error("加载收藏消息失败:", error);
          toastService.error("加载收藏消息失败");
          set({ isLoading: false });
        }
      },

      // 检查是否已收藏
      checkIfStarred: isMessageStarred,
    }),
    {
      name: "star-storage", // localStorage的键名
      storage: createJSONStorage(() => localStorage), // 使用localStorage
      partialize: (state) => ({
        starredMessages: state.starredMessages,
      }), // 只持久化starredMessages
    }
  )
);

// 初始化 - 在应用启动时自动加载收藏消息
if (typeof window !== "undefined") {
  // 如果localStorage中没有数据，才从后端加载
  if (useStarStore.getState().starredMessages.length === 0) {
    useStarStore.getState().refreshStars();
  }
}

// 在这里添加搜索星标消息的函数
async function searchStarredMessages(
  query: string,
  timeRange?: { start?: number; end?: number }
): Promise<StarredMessage[]> {
  try {
    const allMessages = await getAllStarredMessages();

    return allMessages.filter((msg) => {
      // 内容匹配
      const contentMatch = query
        ? msg.content.toLowerCase().includes(query.toLowerCase())
        : true;

      // 时间范围匹配
      let timeMatch = true;
      if (timeRange) {
        if (timeRange.start && msg.createdAt < timeRange.start) {
          timeMatch = false;
        }
        if (timeRange.end && msg.createdAt > timeRange.end) {
          timeMatch = false;
        }
      }

      return contentMatch && timeMatch;
    });
  } catch (error) {
    console.error("搜索收藏消息失败:", error);
    return [];
  }
}
