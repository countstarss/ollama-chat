import { create } from "zustand";
import { DisplayMessage } from "@/components/chat/ChatMessage";
import { useStarStore } from "@/store/useStarStore";
import toastService from "@/services/toastService";

interface SelectionState {
  // 状态
  isSelectionMode: boolean;
  selectedMessages: DisplayMessage[];
  autoSelectEnabled: boolean;

  // 操作
  toggleSelectionMode: () => void;
  addToSelection: (message: DisplayMessage) => void;
  removeFromSelection: (messageId: string) => void;
  toggleMessageSelection: (message: DisplayMessage) => void;
  clearSelection: () => void;
  isSelected: (messageId: string) => boolean;

  // 自动选择设置
  setAutoSelectEnabled: (enabled: boolean) => void;

  // 批量操作
  groupStarSelected: () => Promise<boolean>;
  combineSelected: () => string;
  summarizeSelected: () => Promise<string | null>;
  promptSummarizeSelected: () => string;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  // 初始状态
  isSelectionMode: false,
  selectedMessages: [],
  autoSelectEnabled: false,

  // MARK: 切换选择模式
  toggleSelectionMode: () =>
    set((state) => {
      const newMode = !state.isSelectionMode;
      // 退出选择模式时清空选择
      return {
        isSelectionMode: newMode,
        selectedMessages: newMode ? state.selectedMessages : [],
        autoSelectEnabled: newMode ? state.autoSelectEnabled : false,
      };
    }),

  // MARK: 添加到选择
  addToSelection: (message) =>
    set((state) => {
      if (!state.isSelectionMode) return state;

      // 检查消息是否已经在选择列表中
      const messageExists = state.selectedMessages.some(
        (m) => m.id === message.id
      );
      if (messageExists) return state;

      return {
        selectedMessages: [...state.selectedMessages, message],
      };
    }),

  // MARK: 移除选择
  removeFromSelection: (messageId) =>
    set((state) => ({
      selectedMessages: state.selectedMessages.filter(
        (m) => m.id !== messageId
      ),
    })),

  // MARK: 切换消息选择
  toggleMessageSelection: (message) =>
    set((state) => {
      const messageIndex = state.selectedMessages.findIndex(
        (m) => m.id === message.id
      );

      if (messageIndex >= 0) {
        // 消息已在选择列表中，移除它
        return {
          selectedMessages: state.selectedMessages.filter(
            (m) => m.id !== message.id
          ),
        };
      } else {
        // 消息不在选择列表中，添加它
        return {
          selectedMessages: [...state.selectedMessages, message],
        };
      }
    }),

  // MARK: 清空选择
  clearSelection: () => set({ selectedMessages: [] }),

  // MARK: isSelected
  isSelected: (messageId) => {
    return get().selectedMessages.some((m) => m.id === messageId);
  },

  // 自动选择设置
  setAutoSelectEnabled: (enabled) => set({ autoSelectEnabled: enabled }),

  // 批量操作 - 批量收藏
  groupStarSelected: async () => {
    const { selectedMessages } = get();
    if (selectedMessages.length === 0) {
      toastService.info("请先选择要收藏的消息");
      return false;
    }

    try {
      // 获取 useStarStore 的 addStar 方法
      const { addStar } = useStarStore.getState();

      // 合并所选消息的内容，并添加更多结构和格式
      const sortedMessages = [...selectedMessages].sort((a, b) => {
        // 确保消息按照原始顺序排列
        const aIndex = parseInt(a.id.split("-")[1] || "0");
        const bIndex = parseInt(b.id.split("-")[1] || "0");
        return aIndex - bIndex;
      });

      // 创建更结构化的内容
      const combinedContent =
        `# 消息集合 (${new Date().toLocaleString("zh-CN")})\n\n` +
        sortedMessages
          .map((msg, index) => {
            const roleText = msg.role === "user" ? "用户" : "助手";
            return `## ${index + 1}. ${roleText}消息\n\n${msg.content}\n`;
          })
          .join("\n\n---\n\n");

      // 使用标签标记这是一个分组收藏
      const result = await addStar(combinedContent, [
        "group-star",
        `messages-${selectedMessages.length}`,
      ]);

      if (result) {
        toastService.success(`已收藏 ${selectedMessages.length} 条消息`);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("批量收藏失败:", error);
      toastService.error("批量收藏失败");
      return false;
    }
  },

  combineSelected: () => {
    const { selectedMessages } = get();
    // 合并所有选中消息的内容
    return selectedMessages
      .sort((a, b) => {
        // 确保消息按照原始顺序排列
        const aIndex = parseInt(a.id.split("-")[1] || "0");
        const bIndex = parseInt(b.id.split("-")[1] || "0");
        return aIndex - bIndex;
      })
      .map(
        (msg) => `${msg.role === "user" ? "用户: " : "助手: "}\n${msg.content}`
      )
      .join("\n\n---\n\n");
  },

  // 生成摘要提示
  promptSummarizeSelected: () => {
    const { selectedMessages } = get();
    const messageCount = selectedMessages.length;

    // 生成一个提示，指导AI如何汇总内容
    return `请对以下 ${messageCount} 条对话消息进行汇总。提取关键信息，保留重要细节，并形成一个连贯、全面的文档。保持原始内容的核心含义，同时消除冗余和重复。以markdown格式输出结果，使用合适的标题、列表和引用来组织信息：`;
  },

  // 调用API对选中消息进行摘要
  summarizeSelected: async () => {
    const { selectedMessages } = get();
    if (selectedMessages.length === 0) {
      toastService.info("请先选择要汇总的消息");
      return null;
    }

    try {
      toastService.info("正在生成汇总内容...");

      // 获取对话内容和提示
      const dialogContent = get().combineSelected();
      const prompt = get().promptSummarizeSelected();

      // 准备API请求
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: selectedMessages,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.statusText}`);
      }

      const data = await response.json();

      // 检查API响应
      if (data.error) {
        throw new Error(data.error);
      }

      // 如果成功，返回摘要内容
      toastService.success("汇总内容已生成");
      return data.summary || dialogContent;
    } catch (error) {
      console.error("汇总内容失败:", error);
      toastService.error("汇总内容失败，请稍后再试");

      // 发生错误时，返回原始合并内容
      return get().combineSelected();
    }
  },
}));
