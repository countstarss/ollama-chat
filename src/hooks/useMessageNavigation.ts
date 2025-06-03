import { useCallback, Dispatch, SetStateAction, useRef } from "react";
import { DisplayMessage } from "@/components/chat/ChatMessage";

interface NavigationParams {
  messages: DisplayMessage[];
  activeMessageId: string | null;
  setActiveMessageId: Dispatch<SetStateAction<string | null>>;
  setIsManuallyActivated: Dispatch<SetStateAction<boolean>>;
  /** 用于检测/切换书签 */
  isMessageMarked: (id: string) => boolean;
  toggleBookmark: (msg: DisplayMessage) => void;
  addBookmark: (msg: DisplayMessage, name?: string) => void;
  /** 通知父组件书签变化 */
  onBookmarkChange?: (updated: DisplayMessage[]) => void;
}

export function useMessageNavigation({
  messages,
  activeMessageId,
  setActiveMessageId,
  setIsManuallyActivated,
  isMessageMarked,
  toggleBookmark,
  addBookmark,
  onBookmarkChange,
}: NavigationParams) {
  const manualActivationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // MARK: Helper: 更新父组件消息列表中的书签状态
  const updateListAndNotify = useCallback(
    (messageId: string, updater: (prev: DisplayMessage) => DisplayMessage) => {
      if (!onBookmarkChange) return;
      const updated = messages.map((m) =>
        m.id === messageId ? updater(m) : m
      );
      onBookmarkChange(updated);
    },
    [messages, onBookmarkChange]
  );

  // MARK: 切换书签
  const handleToggleBookmark = useCallback(() => {
    if (!activeMessageId) return;
    const activeMsg = messages.find((m) => m.id === activeMessageId);
    if (!activeMsg) return;

    toggleBookmark(activeMsg);
    updateListAndNotify(activeMessageId, (msg) => ({
      ...msg,
      isMarked: !isMessageMarked(activeMessageId),
    }));
  }, [
    activeMessageId,
    messages,
    toggleBookmark,
    updateListAndNotify,
    isMessageMarked,
  ]);

  // MARK: 保存书签
  const handleSaveBookmark = useCallback(
    (bookmarkName: string) => {
      if (!activeMessageId) return;
      const activeMsg = messages.find((m) => m.id === activeMessageId);
      if (!activeMsg) return;

      addBookmark(activeMsg, bookmarkName);
      updateListAndNotify(activeMessageId, (msg) => ({
        ...msg,
        isMarked: true,
        summary: bookmarkName,
      }));
    },
    [activeMessageId, messages, addBookmark, updateListAndNotify]
  );

  // 判断当前消息是否已标记
  const isCurrentMessageMarked = useCallback(() => {
    return activeMessageId ? isMessageMarked(activeMessageId) : false;
  }, [activeMessageId, isMessageMarked]);

  // MARK: 获取索引并导航
  const getCurrentIndex = useCallback(
    () =>
      activeMessageId
        ? messages.findIndex((m) => m.id === activeMessageId)
        : -1,
    [activeMessageId, messages]
  );

  const scrollToMessage = useCallback(
    (id: string) => {
      const el = document.getElementById(`message-${id}`);
      if (el) {
        setActiveMessageId(id);
        setIsManuallyActivated(true);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // 清除旧timer
        if (manualActivationTimeoutRef.current) {
          clearTimeout(manualActivationTimeoutRef.current);
          manualActivationTimeoutRef.current = null;
        }
      }
    },
    [setActiveMessageId, setIsManuallyActivated]
  );

  const goToPreviousMessage = useCallback(() => {
    const idx = getCurrentIndex();
    if (idx > 0) scrollToMessage(messages[idx - 1].id);
  }, [messages, getCurrentIndex, scrollToMessage]);

  const goToNextMessage = useCallback(() => {
    const idx = getCurrentIndex();
    if (idx >= 0 && idx < messages.length - 1)
      scrollToMessage(messages[idx + 1].id);
  }, [messages, getCurrentIndex, scrollToMessage]);

  // 切换自动高亮 (localStorage 持久化)
  const toggleAutoHighlight = useCallback(() => {
    setIsManuallyActivated((prev) => prev); // 占位，真正逻辑在ChatWindow已处理
  }, [setIsManuallyActivated]);

  return {
    handleToggleBookmark,
    handleSaveBookmark,
    isCurrentMessageMarked,
    goToPreviousMessage,
    goToNextMessage,
    scrollToMessage,
    toggleAutoHighlight,
  };
}
