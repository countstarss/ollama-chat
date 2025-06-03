import { useCallback, Dispatch, SetStateAction } from "react";
import { v4 as uuidv4 } from "uuid";
import { DisplayMessage } from "@/components/chat/ChatMessage";
import toastService from "@/services/toastService";
import { ModelConfig } from "@/hooks/useModelConfig";
import { useLibraryStore } from "@/store/useLibraryStore";

interface RagParams {
  messages: DisplayMessage[];
  setMessages: Dispatch<SetStateAction<DisplayMessage[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  searchParams: { get: (name: string) => string | null };
  scrollToBottom: () => void;
  saveCurrentChat: (
    msgs: DisplayMessage[],
    model?: ModelConfig
  ) => void | Promise<void>;
  selectedModel: ModelConfig | null | undefined;
  libraryId?: string | null;
}

export function useRagMessage({
  messages,
  setMessages,
  setIsLoading,
  searchParams,
  scrollToBottom,
  saveCurrentChat,
  selectedModel,
  libraryId = null,
}: RagParams) {
  const handleRagMessage = useCallback(
    async (userInput: string) => {
      console.log("[RAG模式] 发送消息:", userInput);

      // 创建用户消息对象
      const userMsg = {
        id: uuidv4(),
        role: "user" as const,
        content: userInput,
      } as DisplayMessage;

      setMessages((prev) => [...prev, userMsg]);

      setIsLoading(true);

      // 添加助手占位消息
      const assistantId = uuidv4();
      const assistantPlaceholder: DisplayMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        mainContent: "正在搜索相关信息...",
        isThinkingComplete: false,
        isRagMessage: true,
      };

      setMessages((prev) => [...prev, assistantPlaceholder]);

      try {
        const response = await fetch("/api/rag", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: userInput, libraryId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const ragResponse = await response.json();

        const assistantMsgFinal: DisplayMessage = {
          ...assistantPlaceholder,
          content: ragResponse.answer,
          mainContent: ragResponse.answer,
          sources: ragResponse.sources,
          isThinkingComplete: true,
          isRagMessage: true,
        };

        // 更新助手消息
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantId ? assistantMsgFinal : msg))
        );

        // 滚动到底部
        const messageId = searchParams.get("messageId");
        if (!messageId) {
          scrollToBottom();
        }

        // 保存聊天（无需等待返回）
        saveCurrentChat(messages, selectedModel || undefined);

        // === 将RAG问答保存到知识库 ===
        if (libraryId) {
          const { appendMessages } = useLibraryStore.getState();
          await appendMessages(libraryId, [userMsg, assistantMsgFinal]);
        }
      } catch (error) {
        console.error("RAG 消息发送错误:", error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // 更新为错误消息
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  role: "error",
                  content: "",
                  mainContent: `RAG 查询失败: ${errorMessage}`,
                  isThinkingComplete: true,
                }
              : msg
          )
        );

        toastService.error("RAG 查询失败", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      setMessages,
      setIsLoading,
      searchParams,
      scrollToBottom,
      saveCurrentChat,
      messages,
      selectedModel,
      libraryId,
    ]
  );

  return { handleRagMessage };
}
