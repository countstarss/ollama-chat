import { useState, useCallback } from 'react';
import { DisplayMessage } from '@/components/ChatMessage';

export interface UseBookmarksOptions {
  generateDefaultName?: (message: DisplayMessage, index: number) => string;
}

export function useBookmarks(options?: UseBookmarksOptions) {
  const [markedMessages, setMarkedMessages] = useState<DisplayMessage[]>([]);

  // 生成默认书签名称
  const generateDefaultName = useCallback((message: DisplayMessage, index: number) => {
    if (options?.generateDefaultName) {
      return options.generateDefaultName(message, index);
    }
    return `${message.role === 'user' ? '用户问题' : '回复'} ${index + 1}`;
  }, [options]);

  // 检查消息是否已被标记
  const isMessageMarked = useCallback((messageId: string) => {
    return markedMessages.some(m => m.id === messageId);
  }, [markedMessages]);

  // 添加书签
  const addBookmark = useCallback((message: DisplayMessage, customName?: string) => {
    // 如果已标记，不重复添加
    if (isMessageMarked(message.id)) return;

    // 使用自定义名称或生成默认名称
    const summaryText = (customName && customName.trim()) || 
      message.summary || 
      generateDefaultName(message, markedMessages.length);

    // 创建书签对象
    const bookmarkedMessage: DisplayMessage = {
      ...message,
      isMarked: true,
      summary: summaryText
    };

    // 添加到书签列表
    setMarkedMessages(prev => [...prev, bookmarkedMessage]);
  }, [markedMessages, isMessageMarked, generateDefaultName]);

  // 移除书签
  const removeBookmark = useCallback((messageId: string) => {
    setMarkedMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  // 切换书签状态
  const toggleBookmark = useCallback((message: DisplayMessage, customName?: string) => {
    if (isMessageMarked(message.id)) {
      removeBookmark(message.id);
    } else {
      addBookmark(message, customName);
    }
  }, [isMessageMarked, removeBookmark, addBookmark]);

  // 更新书签名称
  const updateBookmarkName = useCallback((messageId: string, newName: string) => {
    setMarkedMessages(prev => prev.map(message => 
      message.id === messageId 
        ? { ...message, summary: newName.trim() || message.summary } 
        : message
    ));
  }, []);

  // 清空所有书签
  const clearAllBookmarks = useCallback(() => {
    setMarkedMessages([]);
  }, []);

  return {
    markedMessages,
    isMessageMarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    updateBookmarkName,
    clearAllBookmarks
  };
} 