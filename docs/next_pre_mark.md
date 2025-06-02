<think>这是一个较为复杂的功能请求，需要多个组件的修改和新增。我需要实现：

1. 侧边悬浮栏，包含"上一个"、"下一个"、"标记"按钮
2. 消息高亮状态（active状态）
3. 消息标记系统和大纲功能
4. 为消息生成ID和摘要

我需要添加和修改的组件：
1. 创建一个侧边栏组件
2. 修改ChatMessage组件，添加active状态和标记功能
3. 修改ChatWindow组件，控制当前活动消息
4. 创建大纲组件

让我们开始实现：</think>我将分步实现这个功能，首先创建侧边悬浮栏和消息导航功能，然后再添加标记和大纲功能。

### 第一步：创建侧边悬浮栏组件

```typescript jsx:src/components/ui/FloatingSidebar.tsx
"use client";

import React from 'react';
import { ChevronUp, ChevronDown, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingSidebarProps {
  onPrevious: () => void;
  onNext: () => void;
  onMark: () => void;
  isMarked: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const FloatingSidebar: React.FC<FloatingSidebarProps> = ({
  onPrevious,
  onNext,
  onMark,
  isMarked,
  hasNext,
  hasPrevious,
}) => {
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
      <button
        onClick={onPrevious}
        disabled={!hasPrevious}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
          "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 shadow-md",
          !hasPrevious && "opacity-50 cursor-not-allowed"
        )}
        title="上一条消息"
      >
        <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      
      <button
        onClick={onNext}
        disabled={!hasNext}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
          "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 shadow-md",
          !hasNext && "opacity-50 cursor-not-allowed"
        )}
        title="下一条消息"
      >
        <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      
      <button
        onClick={onMark}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
          isMarked 
            ? "bg-blue-500 hover:bg-blue-600 text-white" 
            : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
        )}
        title={isMarked ? "取消标记" : "标记此消息"}
      >
        {isMarked ? (
          <BookmarkCheck className="w-5 h-5" />
        ) : (
          <Bookmark className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        )}
      </button>
    </div>
  );
};
```
### 第二步：扩展DisplayMessage类型，添加摘要和标记状态

```typescript jsx:src/components/ChatMessage.tsx
// 扩展消息类型以包含思考过程
export interface DisplayMessage extends ChatMessageType {
  thinkContent?: string;
  isThinkingComplete?: boolean;
  mainContent?: string; // 用于流式接收
  summary?: string;    // 消息摘要
  isMarked?: boolean;  // 是否被标记
}
```
### 第三步：为ChatMessage组件添加active状态

```typescript jsx:src/components/ChatMessage.tsx
interface ChatMessageProps {
  message: DisplayMessage;
  isActive?: boolean;
  onInView?: (isInView: boolean, message: DisplayMessage) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isActive = false, onInView }) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const messageRef = useRef<HTMLDivElement>(null);

  // 当思考完成时自动折叠思考内容
  useEffect(() => {
    if (message.isThinkingComplete) {
      setIsThinkingExpanded(false);
    }
  }, [message.isThinkingComplete]);

  // 使用Intersection Observer API检测消息是否在视口中
  useEffect(() => {
    if (!onInView || !messageRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onInView(true, message);
        } else {
          onInView(false, message);
        }
      },
      {
        threshold: 0.5, // 当50%的元素可见时触发
        rootMargin: "0px"
      }
    );
    
    observer.observe(messageRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [message, onInView]);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError = message.role === 'error';

  // 获取头像URL
  const getAvatarUrl = () => {
    if (isUser) {
      return 'https://avatar.vercel.sh/user?size=32';
    } else if (isAssistant) {
      return 'https://avatar.vercel.sh/ollama?size=32';
    } else {
      return 'https://avatar.vercel.sh/error?size=32';
    }
  };

  const bubbleClasses = cn(
    "p-3 rounded-lg", // 调整宽度
    "prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-pre:my-2 prose-pre:p-2 prose-pre:bg-gray-800 prose-pre:rounded", // Markdown 基础样式
    isUser ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
    isError ? "bg-red-100 dark:bg-red-900 border border-red-500 text-red-700 dark:text-red-200 prose-red" : "",
    isActive && !isUser ? "ring-2 ring-blue-400 dark:ring-blue-500 bg-gray-200 dark:bg-gray-600" : "",
    isActive && isUser ? "ring-2 ring-blue-300" : ""
  );
```
### 第四步：更新ChatMessage组件中的渲染部分，添加ref

```typescript jsx:src/components/ChatMessage.tsx
  return (
    <div className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`} ref={messageRef}>
      {/* 非用户消息时，左侧显示头像 */}
      {!isUser && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <Image 
              src={getAvatarUrl()} 
              alt={isAssistant ? "AI" : "Error"} 
              width={32} 
              height={32}
              className={cn(
                "w-full h-full",
                isError ? "border border-red-500" : ""
              )}
            />
          </div>
        </div>
      )}
      
      <div className="flex flex-col max-w-[75%]">
        {message.isMarked && message.summary && (
          <div className="text-xs text-blue-500 dark:text-blue-400 mb-1 font-medium">
            {message.summary}
          </div>
        )}
        
        <div className={bubbleClasses}>
```
### 第五步：创建大纲组件

```typescript jsx:src/components/ui/OutlineView.tsx
"use client";

import React from 'react';
import { DisplayMessage } from '@/components/ChatMessage';
import { Bookmark } from 'lucide-react';

interface OutlineViewProps {
  markedMessages: DisplayMessage[];
  onJumpToMessage: (messageId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const OutlineView: React.FC<OutlineViewProps> = ({
  markedMessages,
  onJumpToMessage,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-64 bg-white dark:bg-gray-900 shadow-lg z-30 border-l border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-transform duration-300">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-medium text-lg flex items-center">
          <Bookmark className="w-4 h-4 mr-2" />
          内容大纲
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {markedMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p>暂无标记内容</p>
            <p className="text-sm mt-2">点击消息旁的书签按钮可添加到大纲</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {markedMessages.map((message) => (
              <li 
                key={message.id}
                className="cursor-pointer rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => onJumpToMessage(message.id)}
              >
                <div className="flex items-start space-x-2">
                  <Bookmark className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{message.summary || '未命名书签'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
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
### 第六步：修改ChatWindow组件，集成所有新功能

```typescript jsx:src/components/ChatWindow.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { ChatMessage, DisplayMessage } from './ChatMessage';
import { ChevronDown, Menu } from 'lucide-react';
import { FloatingSidebar } from './ui/FloatingSidebar';
import { OutlineView } from './ui/OutlineView';

interface ChatWindowProps {
  messages: DisplayMessage[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousMessagesLengthRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(new Set());
  const [outlineOpen, setOutlineOpen] = useState(false);

  // 跟踪标记的消息
  const [markedMessages, setMarkedMessages] = useState<DisplayMessage[]>([]);

  // 追踪是否有消息正在生成中
  const isGenerating = messages.length > 0 && 
    messages[messages.length - 1].role === 'assistant' && 
    messages[messages.length - 1].isThinkingComplete === false;

  // 监听滚动事件
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

  // 滚动到底部的函数，同时重新启用自动滚动
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAutoScrollEnabled(true);
  };

  // 监听消息可见性变化
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
  
  // 更新活动消息ID（当多个消息可见时，选择第一个可见的）
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

  // 智能滚动控制
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

  // 标记/取消标记消息
  const toggleMarkMessage = () => {
    if (!activeMessageId) return;
    
    const activeMessage = messages.find(m => m.id === activeMessageId);
    if (!activeMessage) return;
    
    // 创建消息的副本以避免修改原始消息
    const messageWithUpdatedMark = {
      ...activeMessage,
      isMarked: !activeMessage.isMarked,
      // 如果摘要为空，自动生成一个
      summary: activeMessage.summary || `${activeMessage.role === 'user' ? '用户问题' : '回复'} ${markedMessages.length + 1}`
    };
    
    // 更新标记的消息列表
    if (!activeMessage.isMarked) {
      // 标记消息
      setMarkedMessages(prev => [...prev, messageWithUpdatedMark]);
    } else {
      // 取消标记
      setMarkedMessages(prev => prev.filter(m => m.id !== activeMessageId));
    }
    
    // 这只是前端状态，实际应用中可能需要更新后端数据
    // 由于我们不能直接修改messages prop，这里只改变了前端显示
  };
  
  // 跳转到上一条消息
  const goToPreviousMessage = () => {
    if (!activeMessageId) return;
    
    const activeIndex = messages.findIndex(m => m.id === activeMessageId);
    if (activeIndex > 0) {
      const prevMessage = messages[activeIndex - 1];
      scrollToMessage(prevMessage.id);
    }
  };
  
  // 跳转到下一条消息
  const goToNextMessage = () => {
    if (!activeMessageId) return;
    
    const activeIndex = messages.findIndex(m => m.id === activeMessageId);
    if (activeIndex < messages.length - 1) {
      const nextMessage = messages[activeIndex + 1];
      scrollToMessage(nextMessage.id);
    }
  };
  
  // 滚动到指定消息
  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveMessageId(messageId);
    }
  };
  
  // 判断是否有上一条/下一条消息
  const activeIndex = activeMessageId ? messages.findIndex(m => m.id === activeMessageId) : -1;
  const hasPreviousMessage = activeIndex > 0;
  const hasNextMessage = activeIndex !== -1 && activeIndex < messages.length - 1;
  
  // 获取当前消息的标记状态
  const isCurrentMessageMarked = () => {
    if (!activeMessageId) return false;
    const activeMessage = messages.find(m => m.id === activeMessageId);
    return activeMessage?.isMarked || false;
  };

  return (
    <div 
      ref={containerRef}
      className="flex-grow p-4 overflow-y-auto space-y-4 message-list relative"
    >
      {messages.map((msg) => (
        <div id={`message-${msg.id}`} key={msg.id}>
          <ChatMessage 
            message={msg} 
            isActive={msg.id === activeMessageId}
            onInView={(isInView) => handleMessageInView(isInView, msg)}
          />
        </div>
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
      
      {/* 侧边悬浮栏 */}
      {messages.length > 0 && (
        <FloatingSidebar 
          onPrevious={goToPreviousMessage}
          onNext={goToNextMessage}
          onMark={toggleMarkMessage}
          isMarked={isCurrentMessageMarked()}
          hasPrevious={hasPreviousMessage}
          hasNext={hasNextMessage}
        />
      )}
      
      {/* 大纲按钮 */}
      <button
        onClick={() => setOutlineOpen(true)}
        className="fixed top-6 right-6 bg-gray-200 dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-gray-300 dark:hover:bg-gray-700 z-10"
        aria-label="打开大纲"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      
      {/* 大纲视图 */}
      <OutlineView 
        markedMessages={markedMessages}
        onJumpToMessage={scrollToMessage}
        isOpen={outlineOpen}
        onClose={() => setOutlineOpen(false)}
      />
    </div>
  );
};
```
### 第七步：修改ChatMessage组件的onInView参数处理

```typescript jsx:src/components/ChatMessage.tsx
  // 使用Intersection Observer API检测消息是否在视口中
  useEffect(() => {
    if (!onInView || !messageRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onInView(true, message);
        } else {
          onInView(false, message);
        }
      },
      {
        threshold: 0.5, // 当50%的元素可见时触发
        rootMargin: "0px"
      }
    );
    
    observer.observe(messageRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [message, onInView]);
```
太好了！所有必要的组件和功能已经实现完成。现在你有了一个功能丰富的聊天界面，包括：

### 已实现的功能：

1. **侧边悬浮栏**：
   - 上一条/下一条消息导航按钮
   - 标记/取消标记按钮（书签功能）
   - 根据上下文禁用不可用的按钮

2. **消息活动状态**：
   - 当前查看的消息高亮显示（蓝色边框）
   - 使用Intersection Observer自动检测视图中的消息
   - 智能选择多条可见消息中最上方的一条作为活动消息

3. **大纲功能**：
   - 右上角大纲按钮打开标记消息列表
   - 点击标记的消息直接跳转到对应位置
   - 为标记的消息显示摘要

4. **智能消息摘要**：
   - 标记消息时自动生成摘要（如果没有提供）
   - 在消息上方显示摘要（当消息被标记时）

### 使用方法：

1. **浏览消息**：
   - 正常滚动查看消息历史
   - 侧边栏上的上/下按钮可以快速跳转到前一条/后一条消息
   - 返回底部按钮可以快速回到最新消息

2. **标记重要消息**：
   - 滚动到想要标记的消息
   - 当消息高亮（有蓝色边框）时，点击侧边栏的书签按钮
   - 标记后，书签按钮会变为蓝色填充状态

3. **使用大纲**：
   - 点击右上角的菜单图标打开大纲视图
   - 大纲中列出了所有被标记的消息
   - 点击大纲中的任何项目可以直接跳转到对应消息

### 注意事项：

1. 由于这是客户端实现，标记和摘要在页面刷新后不会保存。要实现持久化存储，你需要将这些数据保存到后端。

2. 目前自动生成的摘要很简单，实际应用中你可以：
   - 在消息创建时让大模型生成一个摘要
   - 允许用户编辑摘要文本
   - 使用更智能的算法提取内容摘要

这个实现为你的聊天应用增加了更现代化的浏览和组织功能，特别适合长对话和内容丰富的交流。

如果你想添加其他功能，例如消息分组、标签筛选或更多导航选项，请告诉我！
