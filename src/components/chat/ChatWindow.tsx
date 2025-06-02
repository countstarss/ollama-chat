"use client";

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import { ChatMessage, DisplayMessage } from "./ChatMessage";
import { ChevronDown } from "lucide-react";
import { FloatingSidebar } from "../ui/FloatingSidebar";
import { useBookmarks } from "@/hooks/useBookmarks";
import { InputArea } from "./InputArea";

interface ChatWindowProps {
  messages: DisplayMessage[];
  onSendMessage: (message: string) => void;
  onAbort?: () => void;
  isLoading: boolean;
  onBookmarkChange?: (updatedMessages: DisplayMessage[]) => void;
  currentChatId?: string | null; // 当前聊天ID
  mode?: "chat" | "rag"; // 聊天模式
}

// 定义暴露给父组件的方法接口
export interface ChatWindowHandle {
  scrollToBottom: () => void;
}

// 使用forwardRef包装组件
export const ChatWindow = forwardRef<ChatWindowHandle, ChatWindowProps>(
  (props, ref) => {
    const {
      messages,
      onBookmarkChange,
      isLoading,
      onSendMessage,
      onAbort,
      currentChatId,
      mode,
    } = props;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const previousMessagesLengthRef = useRef(0);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
    const [visibleMessages, setVisibleMessages] = useState<Set<string>>(
      new Set()
    );
    const [isManuallyActivated, setIsManuallyActivated] =
      useState<boolean>(false);
    const manualActivationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // MARK: 自动高亮状态
    // NOTE: 自动高亮状态，默认开启
    const [autoHighlightEnabled, setAutoHighlightEnabled] = useState<boolean>(
      () => {
        // 从localStorage读取设置，如果不存在则默认为true
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("chat-auto-highlight");
          return saved !== null ? saved === "true" : true;
        }
        return true;
      }
    );

    // 从消息列表中获取已标记的消息
    const initialMarkedMessages = useMemo(
      () => messages.filter((msg) => msg.isMarked),
      [messages] // 当消息列表变化时更新
    );

    // 使用useBookmarks钩子管理书签
    const { markedMessages, isMessageMarked, toggleBookmark, addBookmark } =
      useBookmarks({
        initialMarkedMessages: initialMarkedMessages,
      });

    // 追踪是否有消息正在生成中
    const isGenerating =
      messages.length > 0 &&
      messages[messages.length - 1].role === "assistant" &&
      messages[messages.length - 1].isThinkingComplete === false;

    // 滚动到底部的函数，同时重新启用自动滚动
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setIsAutoScrollEnabled(true);
    };

    // 使用useImperativeHandle向父组件暴露方法
    useImperativeHandle(ref, () => ({
      scrollToBottom,
    }));

    // MARK: 监听滚动事件
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleScroll = () => {
        if (!container) return;

        // 计算滚动位置
        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // 如果距离底部超过100px，显示滚动按钮
        const isNearBottom = distanceFromBottom < 100;
        setShowScrollButton(!isNearBottom);

        // 当用户向上滚动时，禁用自动滚动
        // 只检查一次，避免重复设置
        if (!isNearBottom && isAutoScrollEnabled) {
          setIsAutoScrollEnabled(false);
        }

        // 检测到用户主动滚动，判断是否需要恢复自动激活
        if (isManuallyActivated) {
          // 获取当前手动激活的消息元素
          const activeElement = activeMessageId
            ? document.getElementById(`message-${activeMessageId}`)
            : null;

          if (activeElement) {
            // 计算消息元素是否在视口中央
            const rect = activeElement.getBoundingClientRect();
            const elementCenter = rect.top + rect.height / 2;
            const viewportCenter = window.innerHeight / 2;
            const distanceFromCenter = Math.abs(elementCenter - viewportCenter);

            // 如果消息元素离开了视口中央区域（用户滚动位置明显变化），才恢复自动激活
            // 这样可以避免轻微滚动就取消手动激活状态
            if (distanceFromCenter > 150) {
              setIsManuallyActivated(false);
              console.log("用户滚动位置明显变化，恢复自动激活");
            }
          } else {
            // 找不到元素，恢复自动激活
            setIsManuallyActivated(false);
          }
        }
      };

      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }, [isAutoScrollEnabled, isManuallyActivated, activeMessageId]);

    // MARK: 监听消息可见性变化
    const handleMessageInView = (
      isInView: boolean,
      message: DisplayMessage
    ) => {
      setVisibleMessages((prev) => {
        const newSet = new Set(prev);
        if (isInView) {
          newSet.add(message.id);
        } else {
          newSet.delete(message.id);
        }
        return newSet;
      });
    };

    // MARK: 更新活动消息ID
    // NOTE: 当多个消息可见时，选择第一个可见的
    useEffect(() => {
      // 如果是手动激活状态或自动高亮功能被禁用，则跳过视口检测的自动激活
      if (isManuallyActivated || !autoHighlightEnabled) return;

      if (visibleMessages.size > 0) {
        // 找出所有可见消息中在messages数组中索引最小的
        const visibleMessagesArray = Array.from(visibleMessages);
        const messagesIds = messages.map((m) => m.id);

        let lowestIndexMessageId = null;
        let lowestIndex = Infinity;

        for (const id of visibleMessagesArray) {
          const index = messagesIds.indexOf(id);
          if (index !== -1 && index < lowestIndex) {
            lowestIndex = index;
            lowestIndexMessageId = id;
          }
        }

        if (lowestIndexMessageId) {
          setActiveMessageId(lowestIndexMessageId);
        }
      } else if (messages.length > 0) {
        // 如果没有可见消息，默认设置最后一条消息为活动
        setActiveMessageId(messages[messages.length - 1].id);
      }
    }, [visibleMessages, messages, isManuallyActivated, autoHighlightEnabled]);

    // MARK: 智能滚动控制
    useEffect(() => {
      // 检测是否添加了新消息
      const hasNewMessage = messages.length > previousMessagesLengthRef.current;

      // 如果添加了新消息，且自动滚动已启用，则滚动到底部
      if (hasNewMessage && isAutoScrollEnabled) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      // 如果消息正在生成，且自动滚动已启用，则滚动到底部
      else if (isGenerating && isAutoScrollEnabled) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }

      // 更新前一个消息长度的引用
      previousMessagesLengthRef.current = messages.length;
    }, [messages, isGenerating, isAutoScrollEnabled]);

    // MARK: 标记/取消标记消息
    const handleToggleBookmark = () => {
      if (!activeMessageId) return;

      const activeMessage = messages.find((m) => m.id === activeMessageId);
      if (!activeMessage) return;

      toggleBookmark(activeMessage);

      // 通知书签变化
      if (onBookmarkChange) {
        // 更新消息列表中的标记状态
        const updatedMessages = messages.map((msg) =>
          msg.id === activeMessageId
            ? {
                ...msg,
                isMarked: !isMessageMarked(activeMessageId),
                summary: msg.summary,
              }
            : msg
        );
        onBookmarkChange(updatedMessages);
      }
    };

    // MARK: SaveBookmark
    // NOTE: 处理保存自定义名称的书签
    const handleSaveBookmark = (bookmarkName: string) => {
      if (!activeMessageId) return;

      const activeMessage = messages.find((m) => m.id === activeMessageId);
      if (!activeMessage) return;

      // 添加书签，并传入自定义名称
      addBookmark(activeMessage, bookmarkName);

      // 通知书签变化
      if (onBookmarkChange) {
        // 更新消息列表中的标记状态和摘要
        const updatedMessages = messages.map((msg) =>
          msg.id === activeMessageId
            ? { ...msg, isMarked: true, summary: bookmarkName }
            : msg
        );
        onBookmarkChange(updatedMessages);
      }
    };

    // MARK: 判断是否已标记
    // NOTE: 判断当前活动消息是否已标记
    const isCurrentMessageMarked = () => {
      return activeMessageId ? isMessageMarked(activeMessageId) : false;
    };

    // 获取导航状态
    const currentMessageIndex = activeMessageId
      ? messages.findIndex((m) => m.id === activeMessageId)
      : -1;
    const hasPreviousMessage = currentMessageIndex > 0;
    const hasNextMessage =
      currentMessageIndex >= 0 && currentMessageIndex < messages.length - 1;

    // 导航到上一条消息
    const goToPreviousMessage = () => {
      if (!hasPreviousMessage) return;

      const prevMessageId = messages[currentMessageIndex - 1].id;
      scrollToMessage(prevMessageId);
    };

    // 导航到下一条消息
    const goToNextMessage = () => {
      if (!hasNextMessage) return;

      const nextMessageId = messages[currentMessageIndex + 1].id;
      scrollToMessage(nextMessageId);
    };

    // 滚动到指定消息
    const scrollToMessage = (messageId: string) => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        setActiveMessageId(messageId);
        setIsManuallyActivated(true);

        // 滚动到消息
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });

        // 如果存在以前的超时，清除它
        if (manualActivationTimeoutRef.current) {
          clearTimeout(manualActivationTimeoutRef.current);
          manualActivationTimeoutRef.current = null;
        }

        // 不再自动恢复视口检测，只有当用户滚动时才恢复
        // 用户滚动会触发监听滚动事件中的处理函数，将isManuallyActivated设为false
        // 这样手动激活状态会一直保持，直到用户主动滚动
      }
    };

    // MARK: toggleAuto
    // NOTE: 切换自动高亮状态
    const toggleAutoHighlight = useCallback(() => {
      setAutoHighlightEnabled((prev) => {
        const newValue = !prev;
        // 保存到localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("chat-auto-highlight", String(newValue));
        }
        return newValue;
      });
    }, []);

    return (
      <div className="flex-1 h-full flex flex-col relative">
        {/* 消息列表 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent relative"
        >
          <div className="w-full pb-24 pt-4">
            {/* RAG 模式使用提示 */}
            {mode === "rag" && messages.length === 0 && (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="max-w-2xl mx-auto p-6">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                      RAG 知识问答使用提示
                    </h3>
                    <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                      <li>• 确保 Ollama 服务运行在 localhost:11434</li>
                      <li>• 确保 ChromaDB 服务运行在 localhost:8000</li>
                      <li>
                        • 使用{" "}
                        <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
                          pnpm run ingest
                        </code>{" "}
                        导入文档
                      </li>
                      <li>• 尝试问一些关于已导入文档的问题</li>
                      <li>• 支持书签收藏和消息标记功能</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{
                  ...message,
                  chatId: message.chatId || currentChatId || undefined,
                }}
                isActive={activeMessageId === message.id}
                onInView={handleMessageInView}
                mode={mode}
              />
            ))}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* 浮动侧边栏 - 用于处理书签/导航 */}
        {messages.length > 0 && (
          <FloatingSidebar
            onPrevious={goToPreviousMessage}
            onNext={goToNextMessage}
            onMark={handleToggleBookmark}
            isMarked={isCurrentMessageMarked()}
            hasNext={hasNextMessage}
            hasPrevious={hasPreviousMessage}
            markedMessages={markedMessages}
            onJumpToMessage={scrollToMessage}
            onSaveBookmark={handleSaveBookmark}
            autoHighlight={autoHighlightEnabled}
            onToggleAutoHighlight={toggleAutoHighlight}
          />
        )}

        <div className="py-2 mx-auto absolute bottom-4 left-0 right-0">
          <InputArea
            isLoading={isLoading}
            onSendMessage={onSendMessage}
            onAbort={onAbort}
          />
        </div>

        {/* 滚动到底部按钮 */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 right-8 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-200 z-10"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </div>
    );
  }
);

ChatWindow.displayName = "ChatWindow";
