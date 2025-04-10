'use client';

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { ChatMessage, DisplayMessage } from './ChatMessage';
import { ChevronDown } from 'lucide-react';
import { FloatingSidebar } from '../ui/FloatingSidebar';
import { useBookmarks } from '@/hooks/useBookmarks';
import { ChatInput } from './ChatInput';

interface ChatWindowProps {
  messages: DisplayMessage[];
  onSendMessage: (message: string) => void;
  onAbort?: () => void;
  isLoading: boolean;
  onBookmarkChange?: (updatedMessages: DisplayMessage[]) => void;
}

// 定义暴露给父组件的方法接口
export interface ChatWindowHandle {
  scrollToBottom: () => void;
}

// 使用forwardRef包装组件
export const ChatWindow = forwardRef<ChatWindowHandle, ChatWindowProps>((props, ref) => {
  const { messages, onSendMessage, onAbort, isLoading, onBookmarkChange } = props;
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
      
      // NOTE: 手动切换打破视口判断 enable active message状态，设置激活消息ID并标记为手动激活
      setActiveMessageId(messageId);
      setIsManuallyActivated(true);
      
      // 清除之前的超时（如果有的话）
      if (manualActivationTimeoutRef.current) {
        clearTimeout(manualActivationTimeoutRef.current);
        manualActivationTimeoutRef.current = null;
      }
      
      // 不再设置定时器恢复，而是依靠滚动事件来恢复自动激活状态
      
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

  // 清理超时
  useEffect(() => {
    return () => {
      if (manualActivationTimeoutRef.current) {
        clearTimeout(manualActivationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex flex-col flex-grow overflow-hidden">
      <div 
        ref={containerRef}
        className="flex-grow p-4 overflow-y-auto space-y-4 message-list relative scrollbar-hide pb-24"
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
            onMark={handleToggleBookmark}
            isMarked={isCurrentMessageMarked()}
            hasPrevious={hasPreviousMessage}
            hasNext={hasNextMessage}
            onPrevious={goToPreviousMessage}
            onNext={goToNextMessage}
            markedMessages={markedMessages}
            onJumpToMessage={scrollToMessage}
            onSaveBookmark={handleSaveBookmark}
          />
        )}
      </div>
      
      {/* 集成聊天输入框 */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center px-4 pb-6 pt-2 z-10">
        <ChatInput 
          onSendMessage={onSendMessage} 
          onAbort={onAbort} 
          isLoading={isLoading}
        />
      </div>
    </div>
  );
});

ChatWindow.displayName = 'ChatWindow';