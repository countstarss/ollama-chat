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

      // 用户消息
      const userMsg: DisplayMessage = {
        id: uuidv4(),
        role: "user",
        content: userInput,
        libraryId: libraryId || undefined,
      };
      setMessages((prev) => [...prev, userMsg]);

      // 占位助手消息
      const assistantId = uuidv4();
      let assistantMsg: DisplayMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        mainContent: "",
        isThinkingComplete: false,
        isRagMessage: true,
        libraryId: libraryId || undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      setIsLoading(true);

      try {
        const controller = new AbortController();
        const response = await fetch("/api/rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: userInput, libraryId }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let partial = "";
        let sourcesCaptured = false;

        let isParsingThinking = false;
        let thinkContent = "";
        let mainContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          partial += decoder.decode(value, { stream: true });

          const lines = partial.split("\n");
          partial = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.substring(6).trim();
            if (dataStr === "[DONE]") continue;

            const data = JSON.parse(dataStr);

            // 首帧 sources
            if (!sourcesCaptured && data.sources) {
              assistantMsg = { ...assistantMsg, sources: data.sources };
              sourcesCaptured = true;
              continue;
            }

            // 处理增量 delta
            const deltaText = data.choices?.[0]?.delta?.content ?? "";
            if (!deltaText) continue;

            let remaining = deltaText;
            while (remaining.length > 0) {
              if (isParsingThinking) {
                const endIdx = remaining.indexOf("</think>");
                if (endIdx !== -1) {
                  thinkContent += remaining.substring(0, endIdx);
                  isParsingThinking = false;
                  remaining = remaining.substring(endIdx + 8);
                } else {
                  thinkContent += remaining;
                  remaining = "";
                }
              } else {
                const startIdx = remaining.indexOf("<think>");
                if (startIdx !== -1) {
                  mainContent += remaining.substring(0, startIdx);
                  isParsingThinking = true;
                  remaining = remaining.substring(startIdx + 7);
                } else {
                  mainContent += remaining;
                  remaining = "";
                }
              }
            }

            // 更新UI
            assistantMsg = {
              ...assistantMsg,
              thinkContent: thinkContent || undefined,
              mainContent,
            };

            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? assistantMsg : m))
            );
          }
        }

        assistantMsg = { ...assistantMsg, isThinkingComplete: true };
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? assistantMsg : m))
        );

        // 滚动
        if (!searchParams.get("messageId")) scrollToBottom();

        saveCurrentChat(
          [...messages, userMsg, assistantMsg],
          selectedModel || undefined
        );

        if (libraryId) {
          const { appendMessages } = useLibraryStore.getState();
          await appendMessages(libraryId, [userMsg, assistantMsg]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  role: "error",
                  mainContent: `RAG 错误: ${msg}`,
                  isThinkingComplete: true,
                }
              : m
          )
        );
        toastService.error("RAG 查询失败", { description: msg });
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
