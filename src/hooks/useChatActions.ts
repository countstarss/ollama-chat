import { useCallback, useState, RefObject } from "react";
import { v4 as uuidv4 } from "uuid";
import { DisplayMessage } from "@/components/chat/ChatMessage";
import { ApiRequestBody, ApiTaskType } from "@/lib/types";
import { ChatWindowHandle } from "@/components/chat/ChatWindow";
import { ModelConfig } from "@/hooks/useModelConfig";
import { ModelSettingsData } from "@/components/ui/model-setting/ModelSettings";

export function useChatActions(
  chatWindowRef: RefObject<ChatWindowHandle | null>,
  messages: DisplayMessage[],
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setModelError: React.Dispatch<React.SetStateAction<string | null>>
) {
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // 更新最后一条消息的工具函数
  const updateLastMessage = useCallback(
    (updater: (prevContent: DisplayMessage) => Partial<DisplayMessage>) => {
      setMessages((prevMessages) => {
        if (prevMessages.length === 0) return prevMessages; // 防止空数组更新
        const lastMessageIndex = prevMessages.length - 1;
        // 确保只更新最后一条助手消息
        if (prevMessages[lastMessageIndex].role !== "assistant")
          return prevMessages;

        const lastMessage = prevMessages[lastMessageIndex];
        const updates = updater(lastMessage);
        // 创建新数组以触发 React 更新
        const newMessages = [...prevMessages];
        newMessages[lastMessageIndex] = { ...lastMessage, ...updates };
        return newMessages;
      });
    },
    [setMessages]
  );

  // 添加新消息的工具函数
  const addMessage = useCallback(
    (message: Omit<DisplayMessage, "id">) => {
      setMessages((prev) => [...prev, { ...message, id: uuidv4() }]);
    },
    [setMessages]
  );

  // 中断当前请求
  const handleAbort = useCallback(() => {
    if (abortController) {
      console.log("aborting request...");
      abortController.abort();
      setAbortController(null);

      // 向用户显示请求已中断
      updateLastMessage((prev) => ({
        mainContent: prev.mainContent + "\n\n[用户已中断回复]",
        isThinkingComplete: true,
      }));

      setIsLoading(false);
    }
  }, [abortController, updateLastMessage, setIsLoading]);

  // 滚动到底部
  const scrollToBottom = useCallback(
    (delay = 100) => {
      setTimeout(() => chatWindowRef.current?.scrollToBottom?.(), delay);
    },
    [chatWindowRef]
  );

  // 准备请求体
  const prepareRequestBody = useCallback(
    (
      userInput: string,
      messages: DisplayMessage[],
      selectedModel: ModelConfig,
      modelSettings: ModelSettingsData
    ): ApiRequestBody => {
      // 输出详细的模型信息用于调试
      console.log(`[准备请求] 模型详情:`, {
        id: selectedModel.id,
        name: selectedModel.name,
        modelId: selectedModel.modelId,
        description: selectedModel.description,
      });

      // 简化：只发送当前用户消息，让后端处理历史（如果后端支持）
      // 或者在这里组装历史记录
      const historyToSend = messages
        .slice(-6) // 发送最近几条消息 + 当前消息
        .filter((m) => m.role === "user" || m.role === "assistant") // 只发送用户和助手消息
        .map((m) => ({ role: m.role, content: m.mainContent ?? m.content })); // 发送最终内容
      historyToSend.push({ role: "user", content: userInput });

      const currentTask: ApiTaskType = "general_chat";

      const requestBody = {
        task: currentTask,
        payload: historyToSend,
        model: selectedModel.modelId, // 传递选中的模型ID
        settings: {
          temperature: modelSettings.temperature,
          topP: modelSettings.topP,
          topK: modelSettings.topK,
          maxTokens: modelSettings.maxTokens,
          presencePenalty: modelSettings.presencePenalty,
          frequencyPenalty: modelSettings.frequencyPenalty,
        },
      };

      console.log(`[发送API请求] 使用模型ID: ${requestBody.model}`);

      return requestBody;
    },
    []
  );

  // 添加助手占位消息
  const addAssistantPlaceholder = useCallback(() => {
    const assistantMessageId = uuidv4();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        thinkContent: "",
        mainContent: "",
        isThinkingComplete: false,
      },
    ]);

    // 滚动到底部
    scrollToBottom();
  }, [setMessages, scrollToBottom]);

  // 创建新的AbortController
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    setAbortController(controller);
    return controller;
  }, []);

  return {
    abortController,
    updateLastMessage,
    addMessage,
    handleAbort,
    scrollToBottom,
    prepareRequestBody,
    addAssistantPlaceholder,
    createAbortController,
  };
}
