import { useCallback, Dispatch, SetStateAction, RefObject } from "react";
import { v4 as uuidv4 } from "uuid";
import { DisplayMessage } from "@/components/chat/ChatMessage";
import { ModelConfig } from "@/hooks/useModelConfig";
import { ModelSettingsData } from "@/components/ui/model-setting/ModelSettings";
import toastService from "@/services/toastService";
import { ApiRequestBody } from "@/lib/types";

interface ChatMessageParams {
  messages: DisplayMessage[];
  setMessages: Dispatch<SetStateAction<DisplayMessage[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setModelError: Dispatch<SetStateAction<string | null>>;
  selectedModel: ModelConfig | null;
  modelSettings: ModelSettingsData;
  sendStreamRequest: (
    body: ApiRequestBody,
    updateCb: (partial: Partial<DisplayMessage>) => void,
    controller: AbortController
  ) => Promise<boolean>;
  /** 从 useChatActions 获取的工具函数 */
  prepareRequestBody: (
    userInput: string,
    messages: DisplayMessage[],
    model: ModelConfig,
    settings: ModelSettingsData
  ) => ApiRequestBody;
  addAssistantPlaceholder: () => void;
  createAbortController: () => AbortController;
  updateLastMessage: (
    updater: (prev: DisplayMessage) => Partial<DisplayMessage>
  ) => void;
  scrollToBottom: () => void;
  searchParams: { get: (name: string) => string | null };
  saveCurrentChat: (
    msgs: DisplayMessage[],
    model?: ModelConfig
  ) => void | Promise<void>;
  /** 引用自 Chat 组件，用于告知流是否结束 */
  isStreamCompletedRef: RefObject<boolean>;
}

export function useChatMessage({
  messages,
  setMessages,
  setIsLoading,
  setModelError,
  selectedModel,
  modelSettings,
  sendStreamRequest,
  prepareRequestBody,
  addAssistantPlaceholder,
  createAbortController,
  updateLastMessage,
  scrollToBottom,
  searchParams,
  saveCurrentChat,
  isStreamCompletedRef,
}: ChatMessageParams) {
  const handleChatMessage = useCallback(
    async (userInput: string) => {
      // 清除错误
      setModelError(null);

      // MARK: 输出模型信息
      console.log(
        `[发送消息] 当前使用模型: ${
          selectedModel
            ? `${selectedModel.name} (${selectedModel.modelId})`
            : "未选择模型"
        }`
      );

      // MARK: 添加用户消息
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "user" as const,
          content: userInput,
        },
      ]);

      setIsLoading(true);
      // 重置流完成标志
      if (isStreamCompletedRef.current) isStreamCompletedRef.current = false;

      const controller = createAbortController();

      if (!selectedModel) {
        setModelError("未选择模型");
        setIsLoading(false);
        return;
      }

      const requestBody = prepareRequestBody(
        userInput,
        messages,
        selectedModel,
        modelSettings
      );

      // MARK: 添加助手占位
      addAssistantPlaceholder();

      try {
        const success = await sendStreamRequest(
          requestBody,
          (updates) => updateLastMessage(() => updates),
          controller
        );

        if (!success) toastService.error("响应生成失败，请重试");

        // 滚动控制
        const messageId = searchParams.get("messageId");
        if (!messageId) scrollToBottom();

        // MARK: 流结束
        if (isStreamCompletedRef.current) isStreamCompletedRef.current = true;
        saveCurrentChat(messages, selectedModel || undefined);
      } catch (error) {
        console.error("消息发送错误", error);
        const errMsg = error instanceof Error ? error.message : String(error);
        const isModelError =
          errMsg.includes("模型") ||
          errMsg.includes("model") ||
          errMsg.includes("找不到") ||
          errMsg.includes("not found");

        if (isModelError) {
          setModelError(
            `模型 "${selectedModel.modelId}" 可能不可用。错误: ${errMsg}`
          );
          updateLastMessage(() => ({
            role: "error",
            content: "",
            mainContent: `模型错误: ${errMsg}\n\n请尝试选择其他模型或检查Ollama服务是否正常运行。`,
            isThinkingComplete: true,
          }));
          toastService.error(`模型 "${selectedModel.modelId}" 不可用`, {
            description: "请尝试选择其他模型或检查服务是否正常运行",
          });
        } else {
          updateLastMessage(() => ({
            role: "error",
            content: "",
            mainContent: `发送消息错误: ${errMsg}`,
            isThinkingComplete: true,
          }));
          toastService.error("发送消息失败", { description: errMsg });
        }
      } finally {
        if (isStreamCompletedRef.current) isStreamCompletedRef.current = true;
        setIsLoading(false);
      }
    },
    [
      setModelError,
      selectedModel,
      setMessages,
      setIsLoading,
      isStreamCompletedRef,
      prepareRequestBody,
      addAssistantPlaceholder,
      sendStreamRequest,
      updateLastMessage,
      scrollToBottom,
      searchParams,
      saveCurrentChat,
      messages,
      modelSettings,
      createAbortController,
    ]
  );

  return { handleChatMessage };
}
