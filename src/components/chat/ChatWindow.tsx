'use client';

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { ChatMessage, DisplayMessage } from './ChatMessage';
import { ChevronDown } from 'lucide-react';
import { FloatingSidebar } from '../ui/FloatingSidebar';
import { useBookmarks } from '@/hooks/useBookmarks';
import { InputArea } from './InputArea';

interface ChatWindowProps {
  messages: DisplayMessage[];
  onSendMessage: (message: string) => void;
  onAbort?: () => void;
  isLoading: boolean;
  onBookmarkChange?: (updatedMessages: DisplayMessage[]) => void;
  currentChatId?: string | null; // 当前聊天ID
}

// 定义暴露给父组件的方法接口
export interface ChatWindowHandle {
  scrollToBottom: () => void;
}

// 使用forwardRef包装组件
export const ChatWindow = forwardRef<ChatWindowHandle, ChatWindowProps>((props, ref) => {
  const { messages, onBookmarkChange, isLoading, onSendMessage, onAbort, currentChatId } = props;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousMessagesLengthRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(new Set());
  const [isManuallyActivated, setIsManuallyActivated] = useState<boolean>(false);
  const manualActivationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 从消息列表中获取已标记的消息
  const initialMarkedMessages = useMemo(() => 
    messages.filter(msg => msg.isMarked), 
    [messages] // 当消息列表变化时更新
  );

  // 使用useBookmarks钩子管理书签
  const {
    markedMessages,
    isMessageMarked,
    toggleBookmark,
    addBookmark
  } = useBookmarks({
    initialMarkedMessages: initialMarkedMessages
  });
  
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
      
      // 如果是手动激活状态，检测到滚动后恢复自动激活状态
      if (isManuallyActivated) {
        setIsManuallyActivated(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isAutoScrollEnabled, isManuallyActivated]);

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
    // 如果是手动激活状态，则跳过视口检测的自动激活
    if (isManuallyActivated) return;

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
  }, [visibleMessages, messages, isManuallyActivated]);

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
    
    // 通知书签变化
    if (onBookmarkChange) {
      // 更新消息列表中的标记状态
      const updatedMessages = messages.map(msg => 
        msg.id === activeMessageId 
          ? { ...msg, isMarked: !isMessageMarked(activeMessageId), summary: msg.summary }
          : msg
      );
      onBookmarkChange(updatedMessages);
    }
  };
  
  // 处理保存自定义名称的书签
  const handleSaveBookmark = (bookmarkName: string) => {
    if (!activeMessageId) return;
    
    const activeMessage = messages.find(m => m.id === activeMessageId);
    if (!activeMessage) return;
    
    // 添加书签，并传入自定义名称
    addBookmark(activeMessage, bookmarkName);
    
    // 通知书签变化
    if (onBookmarkChange) {
      // 更新消息列表中的标记状态和摘要
      const updatedMessages = messages.map(msg => 
        msg.id === activeMessageId 
          ? { ...msg, isMarked: true, summary: bookmarkName }
          : msg
      );
      onBookmarkChange(updatedMessages);
    }
  };

  // 判断当前活动消息是否已标记
  const isCurrentMessageMarked = () => {
    return activeMessageId ? isMessageMarked(activeMessageId) : false;
  };

  // 获取导航状态
  const currentMessageIndex = activeMessageId ? messages.findIndex(m => m.id === activeMessageId) : -1;
  const hasPreviousMessage = currentMessageIndex > 0;
  const hasNextMessage = currentMessageIndex >= 0 && currentMessageIndex < messages.length - 1;

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
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // 如果存在以前的超时，清除它
      if (manualActivationTimeoutRef.current) {
        clearTimeout(manualActivationTimeoutRef.current);
      }
      
      // 设置新的超时，在一段时间后允许自动激活
      manualActivationTimeoutRef.current = setTimeout(() => {
        setIsManuallyActivated(false);
      }, 2000);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col relative">
      {/* 消息列表 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent relative"
      >
        <div className="w-full pb-24 pt-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={{...message, chatId: message.chatId || (currentChatId || undefined)}}
              isActive={activeMessageId === message.id}
              onInView={handleMessageInView}
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
        />
      )}

      <div className='py-2 mx-auto absolute bottom-4 left-0 right-0'>
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
});

ChatWindow.displayName = 'ChatWindow';