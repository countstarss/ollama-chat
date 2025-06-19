"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { ChatWindow, ChatWindowHandle } from "@/components/chat/ChatWindow";
import { DisplayMessage } from "@/components/chat/ChatMessage";
import { useStreamResponse } from "@/hooks/useStreamResponse";
import { ModelConfig, useModelConfig } from "@/hooks/useModelConfig";
import { ModelSelectorContainer } from "@/components/ui/model-setting/ModelSelectorContainer";
import { ModelSettingsButton } from "@/components/ui/model-setting/ModelSettingsButton";
import { useModelSettings } from "@/hooks/useModelSettings";
import { useChatActions } from "@/hooks/useChatActions";
import { useChatSession } from "@/hooks/useChatSession";
import {
  PanelRight,
  PanelRightClose,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { useSidebar } from "@/components/context/sidebar-context";
import { Button } from "@/components/ui/button";
import { EditableChatTitle } from "@/components/ui/EditableChatTitle";
import toastService from "@/services/toastService";
import { useFloatingSidebar } from "@/components/context/floating-sidebar-context";
import { SelectionModeToggle } from "./SelectionModeToggle";
import { useSearchParams } from "next/navigation";
import { useRagMessage } from "@/hooks/useRagMessage";
import { useLibrarySession } from "@/hooks/useLibrarySession";
import { useChatMessage } from "@/hooks/useChatMessage";

interface ChatProps {
  mode?: "chat" | "rag";
  libraryId?: string | null;
  messageId?: string | null;
}

export default function Chat({ mode = "chat", libraryId = null, messageId = null }: ChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [messageToScrollTo, setMessageToScrollTo] = useState<string | null>(
    null
  );

  // 使用hooks
  const { modelSettings } = useModelSettings();
  const { getSelectedModel } = useModelConfig();
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const chatWindowRef = useRef<ChatWindowHandle>(null);
  const { sendStreamRequest } = useStreamResponse();
  const { toggleSidebar, isCollapsed } = useSidebar();
  const searchParams = useSearchParams();

  // 使用聊天会话hook
  const {
    currentChatId,
    chatName,
    loadChat,
    saveCurrentChat,
    renameChat,
    refreshRecentChats,
  } = useChatSession();

  // 追踪消息数量和生成状态
  const previousMessagesCountRef = useRef<number>(0);
  const isStreamCompletedRef = useRef<boolean>(true);

  // 使用聊天操作hook
  const {
    handleAbort,
    updateLastMessage,
    scrollToBottom,
    prepareRequestBody,
    addAssistantPlaceholder,
    createAbortController,
  } = useChatActions(chatWindowRef, messages, setMessages, setIsLoading);

  // MARK: 侧边栏
  const { isFloatingSidebarVisible, toggleFloatingSidebar } =
    useFloatingSidebar();

  // 知识库相关
  const { libraries, renameLibrary } = useLibrarySession();
  const [libraryName, setLibraryName] = useState<string>("未命名知识库");

  // NOTE: 监听libraryId或libraries变化，同步当前库名称
  useEffect(() => {
    if (mode === "rag" && libraryId) {
      const lib = libraries.find((l) => l.id === libraryId);
      if (lib) {
        setLibraryName(lib.name || "未命名知识库");
        // 同步历史消息，确保每条消息都有 libraryId
        if (Array.isArray(lib.messages)) {
          const messagesWithLibraryId = lib.messages.map((msg) => ({
            ...msg,
            libraryId: libraryId, // 确保每条消息都有 libraryId
          }));
          setMessages(messagesWithLibraryId);
          console.log("[Chat] 加载知识库消息，添加 libraryId:", {
            libraryId,
            messageCount: messagesWithLibraryId.length,
          });
          
          // 如果有messageId参数，设置需要滚动到的消息
          if (messageId) {
            console.log(`[Chat] RAG模式检测到messageId参数: ${messageId}`);
            setMessageToScrollTo(messageId);
          }
        }
      }
    }
  }, [mode, libraryId, libraries, messageId]);

  // 处理知识库重命名
  const handleRenameLibrary = useCallback(
    (newTitle: string) => {
      if (!libraryId) return;
      renameLibrary(libraryId, newTitle);
      setLibraryName(newTitle);
    },
    [libraryId, renameLibrary]
  );

  // 初始化时设置当前选中的模型
  useEffect(() => {
    const model = getSelectedModel();
    if (model) {
      setSelectedModel(model);
      setIsModelReady(true);
      console.log(`[初始化] 当前选中模型: ${model.name} (${model.modelId})`);
    }
  }, [getSelectedModel]);

  // ========== 滚动控制逻辑 ==========
  useEffect(() => {
    const loadMessages = async () => {
      if (currentChatId) {
        const loadedMessages = await loadChat(currentChatId);
        if (loadedMessages && loadedMessages.length > 0) {
          setMessages(loadedMessages);

          // 检查URL中是否有messageId参数
          const messageId = searchParams.get("messageId");
          if (messageId) {
            console.log(`[滚动控制] URL参数中包含messageId: ${messageId}`);
            // 优先级1: 如果URL指定了messageId，设置为需要滚动到的消息ID
            setMessageToScrollTo(messageId);
          } else {
            // 优先级2: 如果没有特定的messageId，则滚动到最新消息
            setTimeout(() => {
              scrollToBottom();
              console.log("[滚动控制] 聊天加载完成，滚动到最新消息");
            }, 300);
          }
        } else {
          // 如果没有加载到消息，清空当前消息列表
          setMessages([]);
        }
      }
    };

    loadMessages();
  }, [currentChatId, loadChat, searchParams, scrollToBottom]);

  // MARK: 滚动到指定-最高优
  useEffect(() => {
    // 如果有需要滚动到的消息ID且消息已加载
    if (messageToScrollTo && messages.length > 0 && chatWindowRef.current) {
      // 检查消息是否存在
      const messageExists = messages.some(
        (msg) => msg.id === messageToScrollTo
      );

      if (messageExists) {
        console.log(`[滚动控制] 准备滚动到指定消息: ${messageToScrollTo}`);

        // 等待DOM更新后执行滚动
        setTimeout(() => {
          // 尝试获取消息元素并滚动到该位置
          const messageElement = document.getElementById(
            `message-${messageToScrollTo}`
          );
          if (messageElement) {
            // 执行滚动并添加视觉反馈
            messageElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });

            // 添加高亮动画类
            messageElement.classList.add("message-highlight-pulse");

            // 短暂高亮后移除效果
            setTimeout(() => {
              messageElement.classList.remove("message-highlight-pulse");
            }, 2000); // 保持高亮2秒

            console.log(`[滚动控制] 已滚动到消息: ${messageToScrollTo}`);
          } else {
            console.warn(
              `[滚动控制] 未找到消息元素: message-${messageToScrollTo}`
            );
          }

          // 完成滚动后清除ID，避免重复滚动
          setMessageToScrollTo(null);
        }, 500);
      } else {
        console.warn(`[滚动控制] 消息不存在: ${messageToScrollTo}`);
        setMessageToScrollTo(null);
      }
    }
  }, [messageToScrollTo, messages]);

  // ========== 其他状态逻辑 ==========

  // 在消息变化时保存聊天，但仅在消息数量变化或消息生成完成时
  useEffect(() => {
    // 只有当currentChatId存在且有消息时才继续
    if (!currentChatId || messages.length === 0) {
      previousMessagesCountRef.current = messages.length;
      return;
    }

    // MARK: 监控消息数量
    const messageCountChanged =
      previousMessagesCountRef.current !== messages.length;

    // 检查最后一条消息是否完成生成（非流式响应中）
    const lastMessage = messages[messages.length - 1];
    const isLastMessageComplete =
      lastMessage &&
      (lastMessage.role !== "assistant" ||
        lastMessage.isThinkingComplete === true);

    // 更新消息数量引用
    previousMessagesCountRef.current = messages.length;
    // 只有在以下情况下保存:
    // 1. 消息数量发生变化 2. 最后一条消息完成生成 3. 流式响应已完成
    if (
      messageCountChanged ||
      (isLastMessageComplete && isStreamCompletedRef.current)
    ) {
      console.log("保存聊天: 消息数量变化或消息生成完成");
      saveCurrentChat(messages, selectedModel || undefined);
    }
  }, [messages, currentChatId, selectedModel, saveCurrentChat]);

  // MARK: 标题重命名
  const handleRenameChat = useCallback(
    (newTitle: string) => {
      if (currentChatId) {
        console.log(`[Home] 重命名聊天: ${currentChatId}, 新标题: ${newTitle}`);
        renameChat(currentChatId, newTitle)
          .then(() => {
            console.log("[Home] 聊天标题重命名成功，已同步到数据库");
            // 手动刷新侧边栏最近聊天列表
            return refreshRecentChats();
          })
          .then((success) => {
            if (success) {
              console.log("[Home] 侧边栏最近聊天列表已刷新");
            } else {
              console.warn("[Home] 侧边栏最近聊天列表刷新失败");
            }
          })
          .catch((error) => {
            console.error("[Home] 聊天标题重命名失败:", error);
          });
      } else {
        console.warn("[Home] 无法重命名聊天: 当前没有活动的聊天ID");
      }
    },
    [currentChatId, renameChat, refreshRecentChats]
  );

  // MARK: 处理书签变化
  const handleBookmarkChange = useCallback(
    (updatedMessages: DisplayMessage[]) => {
      // 更新消息列表
      setMessages(updatedMessages);

      // 确保立即保存更新后的消息
      if (currentChatId) {
        console.log("保存聊天: 书签状态变化");
        saveCurrentChat(updatedMessages, selectedModel || undefined);
        toastService.success("书签已更新");
      }
    },
    [currentChatId, saveCurrentChat, selectedModel]
  );

  // MARK: RAG hook
  const { handleRagMessage } = useRagMessage({
    messages,
    setMessages,
    setIsLoading,
    searchParams,
    scrollToBottom,
    saveCurrentChat,
    selectedModel,
    libraryId,
  });

  // MARK: 普通聊天hook
  const { handleChatMessage } = useChatMessage({
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
  });

  // MARK: 处理发送消息
  // NOTE: 根据模式分流
  const handleSendMessage = useCallback(
    (input: string) => {
      if (mode === "rag") return handleRagMessage(input);
      return handleChatMessage(input);
    },
    [mode, handleChatMessage, handleRagMessage]
  );

  // 处理模型选择变更
  const handleModelChange = useCallback((modelId: string) => {
    // 先将就绪状态设为false，直到确认模型可用
    setIsModelReady(false);

    // 创建一个临时的模型配置对象
    const tempModel: ModelConfig = {
      id: `temp-${Date.now()}`,
      name: modelId, // 使用modelId作为显示名称
      modelId: modelId, // 直接使用传入的modelId
      description: `直接指定的模型 ${modelId}`,
    };

    setSelectedModel(tempModel);
    setModelError(null);

    // 模拟等待一段时间后模型就绪
    setTimeout(() => {
      setIsModelReady(true);
    }, 500);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 scrollbar-hide">
      <header className="h-13 p-2 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          {modelError && <div className="hidden" />}

          {mode === "rag" ? (
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <EditableChatTitle
                title={libraryName}
                onRename={handleRenameLibrary}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <EditableChatTitle title={chatName} onRename={handleRenameChat} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {mode === "chat" && (
            <>
              <ModelSelectorContainer
                isLoading={isLoading}
                onModelChange={handleModelChange}
                isModelReady={isModelReady}
              />

              <ModelSettingsButton isLoading={isLoading} />
            </>
          )}

          <SelectionModeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFloatingSidebar}
            className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={isFloatingSidebarVisible ? "隐藏工具栏" : "显示工具栏"}
          >
            {isFloatingSidebarVisible ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        <ChatWindow
          messages={messages}
          ref={chatWindowRef}
          onSendMessage={handleSendMessage}
          onAbort={handleAbort}
          isLoading={isLoading}
          onBookmarkChange={handleBookmarkChange}
          currentChatId={currentChatId}
          mode={mode}
        />
      </div>
    </div>
  );
}
