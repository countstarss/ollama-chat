<think>用户希望将书签相关的组件和逻辑进行拆分，以提高代码的模块化和可维护性。我需要:

1. 创建一个独立的书签输入组件 (BookmarkInput)
2. 可能创建一个书签列表组件 (BookmarkList)
3. 将书签相关的逻辑提取到一个自定义钩子中 (useBookmarks)

这样可以让 FloatingSidebar 和 ChatWindow 组件更加精简和专注于自己的职责。</think>我将把书签功能拆分为独立的组件和钩子，这样可以提高代码的可维护性和复用性。首先，创建一个书签输入组件和一个书签列表组件：

```typescript jsx:src/components/ui/BookmarkInput.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BookmarkInputProps {
  onSave: (name: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  timeoutDuration?: number;
}

export const BookmarkInput: React.FC<BookmarkInputProps> = ({
  onSave,
  onCancel,
  autoFocus = true,
  timeoutDuration = 3000,
}) => {
  const [bookmarkName, setBookmarkName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 保存书签
  const handleSave = () => {
    clearTimeout();
    onSave(bookmarkName);
  };

  // 取消保存
  const handleCancel = () => {
    clearTimeout();
    onCancel();
  };

  // 清除超时定时器
  const clearTimeout = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // 设置自动保存定时器
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }

    // 设置超时自动保存
    timeoutRef.current = window.setTimeout(() => {
      handleSave();
    }, timeoutDuration);

    return () => {
      clearTimeout();
    };
  }, [timeoutDuration]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex flex-col gap-2 w-64 border border-gray-200 dark:border-gray-700">
      <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
        书签名称
      </label>
      <input
        ref={inputRef}
        type="text"
        value={bookmarkName}
        onChange={(e) => setBookmarkName(e.target.value)}
        placeholder="输入书签名称..."
        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave();
          } else if (e.key === 'Escape') {
            handleCancel();
          }
        }}
      />
      <div className="flex justify-between">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          保存
        </button>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        {Math.round(timeoutDuration / 1000)}秒内不操作将自动保存
      </div>
    </div>
  );
};
```
现在创建书签列表组件：

```typescript jsx:src/components/ui/BookmarkList.tsx
'use client';

import React, { useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplayMessage } from '@/components/ChatMessage';

interface BookmarkListProps {
  markedMessages: DisplayMessage[];
  onJumpToMessage: (messageId: string) => void;
  onClose: () => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  markedMessages,
  onJumpToMessage,
  onClose
}) => {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="font-medium text-base flex items-center whitespace-nowrap overflow-hidden">
          <Bookmark className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" />
          <span className="truncate text-gray-700 dark:text-gray-200">书签</span>
        </h3>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 -mr-1 rounded"
        >
          <X className="w-4 h-4"/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
        {markedMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8 p-2">
            <p>暂无标记内容</p>
            <p className="text-xs mt-2">点击消息旁的书签按钮可添加到大纲</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {markedMessages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "cursor-pointer rounded-lg p-2 transition-all duration-200",
                  hoveredItemId === message.id
                    ? "bg-gray-100/90 dark:bg-gray-700/90 scale-[1.02] shadow-sm"
                    : "bg-white/70 dark:bg-gray-900/70 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
                )}
                onClick={() => onJumpToMessage(message.id)}
                onMouseEnter={() => setHoveredItemId(message.id)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <div className="flex items-start space-x-2">
                  <Bookmark className={cn(
                    "flex-shrink-0 mt-0.5 transition-all duration-200",
                    hoveredItemId === message.id
                      ? "w-[18px] h-[18px] text-blue-500"
                      : "w-4 h-4 text-blue-400/70"
                  )} />
                  <div className="min-w-0">
                    <div className={cn(
                      "font-medium transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis",
                      hoveredItemId === message.id
                        ? "text-[15px] text-gray-800 dark:text-gray-100"
                        : "text-sm text-gray-600/90 dark:text-gray-300/90"
                    )}>
                      {message.summary || '未命名书签'}
                    </div>
                    <div className={cn(
                      "mt-1 line-clamp-2 transition-all duration-200",
                      hoveredItemId === message.id
                        ? "text-xs text-gray-700 dark:text-gray-200"
                        : "text-xs text-gray-500/70 dark:text-gray-400/70"
                    )}>
                      {message.content && message.content.length > 120
                        ? `${message.content.substring(0, 120)}...`
                        : message.content}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
```
接下来创建书签管理的自定义钩子：

```typescript:src/hooks/useBookmarks.ts
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
```
修复 BookmarkInput 组件中的错误并再次修改：

```typescript jsx:src/components/ui/BookmarkInput.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BookmarkInputProps {
  onSave: (name: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  timeoutDuration?: number;
}

export const BookmarkInput: React.FC<BookmarkInputProps> = ({
  onSave,
  onCancel,
  autoFocus = true,
  timeoutDuration = 3000,
}) => {
  const [bookmarkName, setBookmarkName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 保存书签
  const handleSave = () => {
    clearTimeoutRef();
    onSave(bookmarkName);
  };

  // 取消保存
  const handleCancel = () => {
    clearTimeoutRef();
    onCancel();
  };

  // 清除超时定时器
  const clearTimeoutRef = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // 设置自动保存定时器
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }

    // 设置超时自动保存
    timeoutRef.current = setTimeout(() => {
      handleSave();
    }, timeoutDuration);

    return () => {
      clearTimeoutRef();
    };
  }, [timeoutDuration]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex flex-col gap-2 w-64 border border-gray-200 dark:border-gray-700">
      <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
        书签名称
      </label>
      <input
        ref={inputRef}
        type="text"
        value={bookmarkName}
        onChange={(e) => setBookmarkName(e.target.value)}
        placeholder="输入书签名称..."
        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave();
          } else if (e.key === 'Escape') {
            handleCancel();
          }
        }}
      />
      <div className="flex justify-between">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          保存
        </button>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        {Math.round(timeoutDuration / 1000)}秒内不操作将自动保存
      </div>
    </div>
  );
};
```
现在修改FloatingSidebar组件，使用我们新创建的组件和钩子：

```typescript jsx:src/components/ui/FloatingSidebar.tsx
"use client";

import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, Bookmark, BookmarkCheck, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplayMessage } from '@/components/ChatMessage';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkInput } from './BookmarkInput';
import { BookmarkList } from './BookmarkList';

interface FloatingSidebarProps {
  onPrevious: () => void;
  onNext: () => void;
  onMark: () => void;
  isMarked: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  markedMessages: DisplayMessage[];
  onJumpToMessage: (messageId: string) => void;
  onSaveBookmark?: (bookmarkName: string) => void;
}

export const FloatingSidebar: React.FC<FloatingSidebarProps> = ({
  onPrevious,
  onNext,
  onMark,
  isMarked,
  hasNext,
  hasPrevious,
  markedMessages,
  onJumpToMessage,
  onSaveBookmark
}) => {
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);
  const outlineRef = useRef<HTMLDivElement>(null);

  const toggleOutline = () => {
    setIsOutlineExpanded(!isOutlineExpanded);
  };

  // 处理书签按钮点击
  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isMarked) {
      onMark(); // 如果已标记，则取消标记
    } else {
      setShowBookmarkInput(true); // 显示书签输入
    }
  };

  // 处理保存书签
  const handleSaveBookmark = (name: string) => {
    if (onSaveBookmark) {
      onSaveBookmark(name);
    } else {
      onMark(); // 如果没有提供onSaveBookmark，则使用默认标记方法
    }
    setShowBookmarkInput(false);
  };

  // 处理取消书签
  const handleCancelBookmark = () => {
    setShowBookmarkInput(false);
  };

  const springTransition = {
    type: "spring",
    stiffness: 260,
    damping: 25,
  };

  const outlineRightOffset = "right-14";

  return (
    <div className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 pointer-events-none h-[60vh] max-h-[600px] select-none">
      {/* 侧边按钮组 */}
      <div
        className={cn(
          "absolute top-1/2 right-0 -translate-y-1/2",
          "flex flex-col gap-2 md:gap-3 flex-shrink-0 pointer-events-auto"
        )}
      >
        {/* 上一条消息按钮 */}
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
            "bg-gray-200/85 dark:bg-gray-800/85 hover:bg-gray-300/90 dark:hover:bg-gray-700/90 shadow-md",
            !hasPrevious && "opacity-50 cursor-not-allowed"
          )}
          title="上一条消息"
        >
          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* 下一条消息按钮 */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
            "bg-gray-200/85 dark:bg-gray-800/85 hover:bg-gray-300/90 dark:hover:bg-gray-700/90 shadow-md",
            !hasNext && "opacity-50 cursor-not-allowed"
          )}
          title="下一条消息"
        >
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* 书签按钮 */}
        <button
          onClick={handleBookmarkClick}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
            isMarked
              ? "bg-blue-500/90 hover:bg-blue-600/95 text-white"
              : "bg-gray-200/85 dark:bg-gray-800/85 hover:bg-gray-300/90 dark:hover:bg-gray-700/90"
          )}
          title={isMarked ? "取消标记" : "标记此消息"}
        >
          {isMarked ? (
            <BookmarkCheck className="w-5 h-5" />
          ) : (
            <Bookmark className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* 书签输入弹出层 */}
        <AnimatePresence>
          {showBookmarkInput && (
            <motion.div 
              className="absolute right-12 top-[72px] z-30 pointer-events-auto"
              initial={{ opacity: 0, scale: 0.9, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <BookmarkInput 
                onSave={handleSaveBookmark}
                onCancel={handleCancelBookmark}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 大纲按钮 */}
        <button
          onClick={toggleOutline}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
            isOutlineExpanded
              ? "bg-blue-500/90 hover:bg-blue-600/95 text-white"
              : "bg-gray-200/85 dark:bg-gray-800/85 hover:bg-gray-300/90 dark:hover:bg-gray-700/90"
          )}
          title={isOutlineExpanded ? "关闭大纲" : "打开大纲"}
        >
          {isOutlineExpanded ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* 大纲面板 */}
      <AnimatePresence>
        {isOutlineExpanded && (
          <motion.div
            ref={outlineRef}
            key="outline-sidebar-content"
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              outlineRightOffset,
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg rounded-lg h-[60vh] max-h-[600px] overflow-hidden w-64 pointer-events-auto"
            )}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={springTransition}
          >
            <BookmarkList 
              markedMessages={markedMessages}
              onJumpToMessage={onJumpToMessage}
              onClose={toggleOutline}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```
最后，修改ChatWindow组件，使用我们新的useBookmarks钩子：

```typescript jsx:src/components/ChatWindow.tsx
'use client';

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { ChatMessage, DisplayMessage } from './ChatMessage';
import { ChevronDown } from 'lucide-react';
import { FloatingSidebar } from './ui/FloatingSidebar';
import { useBookmarks } from '@/hooks/useBookmarks';

interface ChatWindowProps {
  messages: DisplayMessage[];
}

// 定义暴露给父组件的方法接口
export interface ChatWindowHandle {
  scrollToBottom: () => void;
}

// 使用forwardRef包装组件
export const ChatWindow = forwardRef<ChatWindowHandle, ChatWindowProps>((props, ref) => {
  const { messages } = props;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousMessagesLengthRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(new Set());

  // 使用useBookmarks钩子管理书签
  const {
    markedMessages,
    isMessageMarked,
    toggleBookmark,
    addBookmark,
    removeBookmark
  } = useBookmarks();

  // 追踪是否有消息正在生成中
  const isGenerating = messages.length > 0 && 
    messages[messages.length - 1].role === 'assistant' && 
    messages[messages.length - 1].isThinkingComplete === false;

  // 滚动到底部的函数，同时重新启用自动滚动
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAutoScrollEnabled(true);
  };
  
  // 使用useImperativeHandle向父组件暴露方法
  useImperativeHandle(ref, () => ({
    scrollToBottom
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
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isAutoScrollEnabled]);

  // MARK: 监听消息可见性变化
  const handleMessageInView = (isInView: boolean, message: DisplayMessage) => {
    setVisibleMessages(prev => {
      const newSet = new Set(prev);
      if (isInView) {
        newSet.add(message.id);
      } else {
        newSet.delete(message.id);
      }
      return newSet;
    });
  };
  
  // MARK: 更新活动消息ID（当多个消息可见时，选择第一个可见的）
  useEffect(() => {
    if (visibleMessages.size > 0) {
      // 找出所有可见消息中在messages数组中索引最小的
      const visibleMessagesArray = Array.from(visibleMessages);
      const messagesIds = messages.map(m => m.id);
      
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
  }, [visibleMessages, messages]);

  // MARK: 智能滚动控制
  useEffect(() => {
    // 检测是否添加了新消息
    const hasNewMessage = messages.length > previousMessagesLengthRef.current;
    
    // 如果添加了新消息，且自动滚动已启用，则滚动到底部
    if (hasNewMessage && isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } 
    // 如果消息正在生成，且自动滚动已启用，则滚动到底部
    else if (isGenerating && isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    
    // 更新前一个消息长度的引用
    previousMessagesLengthRef.current = messages.length;
  }, [messages, isGenerating, isAutoScrollEnabled]);

  // MARK: 标记/取消标记消息
  const handleToggleBookmark = () => {
    if (!activeMessageId) return;
    
    const activeMessage = messages.find(m => m.id === activeMessageId);
    if (!activeMessage) return;
    
    toggleBookmark(activeMessage);
  };
  
  // 处理保存自定义名称的书签
  const handleSaveBookmark = (bookmarkName: string) => {
    if (!activeMessageId) return;
    
    const activeMessage = messages.find(m => m.id === activeMessageId);
    if (!activeMessage) return;
    
    // 添加书签，并传入自定义名称
    addBookmark(activeMessage, bookmarkName);
  };
  
  // MARK: 跳转到上一条
  const goToPreviousMessage = () => {
    if (!activeMessageId) return;
    
    const activeIndex = messages.findIndex(m => m.id === activeMessageId);
    if (activeIndex > 0) {
      const prevMessage = messages[activeIndex - 1];
      scrollToMessage(prevMessage.id);
    }
  };
  
  // MARK: 跳转到下一条
  const goToNextMessage = () => {
    if (!activeMessageId) return;
    
    const activeIndex = messages.findIndex(m => m.id === activeMessageId);
    if (activeIndex < messages.length - 1) {
      const nextMessage = messages[activeIndex + 1];
      scrollToMessage(nextMessage.id);
    }
  };
  
  // MARK: 滚动到指定消息
  const scrollToMessage = (messageId: string) => {
    // 首先检查精确的消息ID选择器
    const messageElement = document.getElementById(`message-${messageId}`);
    
    if (messageElement) {
      // 确保滚动到消息顶部，并添加一些偏移量，避免被界面顶部元素遮挡
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      });
      
      // 增加调试信息
      console.log(`Scrolling to message: ${messageId}`);
      
      // 设置激活消息ID
      setActiveMessageId(messageId);
      
      // 添加视觉反馈，短暂高亮消息
      messageElement.classList.add('scroll-highlight');
      setTimeout(() => {
        messageElement.classList.remove('scroll-highlight');
      }, 1500);
    } else {
      console.warn(`Message element with ID message-${messageId} not found`);
    }
  };
  
  // MARK: 判断是否有上一条/下一条消息
  const activeIndex = activeMessageId ? messages.findIndex(m => m.id === activeMessageId) : -1;
  const hasPreviousMessage = activeIndex > 0;
  const hasNextMessage = activeIndex !== -1 && activeIndex < messages.length - 1;
  
  // MARK: 获取当前消息的标记状态
  const isCurrentMessageMarked = () => {
    if (!activeMessageId) return false;
    return isMessageMarked(activeMessageId);
  };

  return (
    <div 
      ref={containerRef}
      className="flex-grow p-4 overflow-y-auto space-y-4 message-list relative scrollbar-hide pb-20"
    >
      {messages.map((msg) => (
        <ChatMessage 
          key={msg.id}
          message={msg} 
          isActive={msg.id === activeMessageId}
          onInView={(isInView) => handleMessageInView(isInView, msg)}
        />
      ))}
      
      {/* 空div用于滚动目标 */}
      <div ref={messagesEndRef} />
      
      {/* 返回底部按钮 */}
      {showScrollButton && (
        <div 
          className="fixed bottom-24 right-6 bg-blue-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-all z-10"
          onClick={scrollToBottom}
          aria-label="滚动到最新消息"
        >
          <ChevronDown className="w-5 h-5" />
        </div>
      )}
      
      {/* 集成了大纲的侧边悬浮栏 */}
      {messages.length > 0 && (
        <FloatingSidebar 
          onPrevious={goToPreviousMessage}
          onNext={goToNextMessage}
          onMark={handleToggleBookmark}
          onSaveBookmark={handleSaveBookmark}
          isMarked={isCurrentMessageMarked()}
          hasPrevious={hasPreviousMessage}
          hasNext={hasNextMessage}
          markedMessages={markedMessages}
          onJumpToMessage={scrollToMessage}
        />
      )}
    </div>
  );
});
```
修正 BookmarkInput 组件中的 timeout 类型问题：

```typescript jsx:src/components/ui/BookmarkInput.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BookmarkInputProps {
  onSave: (name: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  timeoutDuration?: number;
}

export const BookmarkInput: React.FC<BookmarkInputProps> = ({
  onSave,
  onCancel,
  autoFocus = true,
  timeoutDuration = 3000,
}) => {
  const [bookmarkName, setBookmarkName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清除超时定时器
  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 保存书签
  const handleSave = useCallback(() => {
    clearTimeoutRef();
    onSave(bookmarkName);
  }, [clearTimeoutRef, bookmarkName, onSave]);

  // 取消保存
  const handleCancel = useCallback(() => {
    clearTimeoutRef();
    onCancel();
  }, [clearTimeoutRef, onCancel]);

  // 设置自动保存定时器
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }

    // 设置超时自动保存
    timeoutRef.current = setTimeout(() => {
      handleSave();
    }, timeoutDuration);

    return () => {
      clearTimeoutRef();
    };
  }, [timeoutDuration, autoFocus, clearTimeoutRef, handleSave]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex flex-col gap-2 w-64 border border-gray-200 dark:border-gray-700">
      <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
        书签名称
      </label>
      <input
        ref={inputRef}
        type="text"
        value={bookmarkName}
        onChange={(e) => setBookmarkName(e.target.value)}
        placeholder="输入书签名称..."
        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave();
          } else if (e.key === 'Escape') {
            handleCancel();
          }
        }}
      />
      <div className="flex justify-between">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          保存
        </button>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        {Math.round(timeoutDuration / 1000)}秒内不操作将自动保存
      </div>
    </div>
  );
};
```
我已经成功完成了书签功能的拆分和重构！让我来总结一下改进：

## 组件拆分

1. **BookmarkInput 组件**
   - 专门处理书签的输入和命名
   - 支持自动聚焦、自动超时保存
   - 提供清晰的用户界面和交互方法

2. **BookmarkList 组件**
   - 专门展示书签列表
   - 处理书签的显示和交互效果
   - 提供空列表的友好提示

3. **FloatingSidebar 组件**
   - 现在更加精简
   - 只处理侧边栏的显示和动画
   - 与子组件之间通过清晰的props通信

## 逻辑拆分

1. **useBookmarks 钩子**
   - 集中管理书签的状态和操作
   - 提供添加、删除、更新、切换等功能
   - 可重用于其他组件

2. **ChatWindow 组件**
   - 不再直接管理书签状态
   - 通过useBookmarks钩子管理书签
   - 代码更加清晰简洁

## 改进的功能

1. **更好的命名支持**
   - 书签命名逻辑清晰
   - 有默认值和自定义选项

2. **更清晰的交互流程**
   - 点击书签按钮 → 显示输入框 → 输入名称 → 保存/取消

3. **更好的代码组织**
   - 关注点分离
   - 各组件各司其职

这样的重构使代码更易于维护、测试和扩展。如果将来需要添加更多功能，比如编辑书签名称、导出书签等，将会更加容易实现。
