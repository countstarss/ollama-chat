"use client";

import React, { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStarStore } from '@/store/useStarStore';
import { DisplayMessage } from '@/components/chat/ChatMessage';

interface StarButtonProps {
  text: string;
  className?: string;
  successText?: string;
  errorText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'outline';
  isStarred?: boolean;
  setIsStarred?: (isStarred: boolean) => void;
  message?: DisplayMessage; // 可选的消息对象，用于保存完整消息
  currentChatId?: string; // 当前聊天ID，用于设置收藏消息的chatId
}

export function StarButton({
  text,
  className,
  size = 'md',
  variant = 'default',
  isStarred = false,
  setIsStarred = () => {},
  message,
  currentChatId,
}: StarButtonProps) {
  // 使用Zustand store
  const { addStar, isStarred: checkIsStarred, refreshStarredMessages } = useStarStore();
  const [isStarring, setIsStarring] = useState(false);
  const [localIsStarred, setLocalIsStarred] = useState(isStarred);

  // 组件加载时检查是否已收藏
  useEffect(() => {
    // 如果提供了消息对象，使用其ID检查状态
    if (message && message.id) {
      const starred = checkIsStarred(message.id);
      setLocalIsStarred(starred);
      setIsStarred(starred);
    }
  }, [message, checkIsStarred, setIsStarred]);

  // 点击处理
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStarring) return; // 防止重复点击
    
    setIsStarring(true);
    try {
      // 使用消息对象或创建一个简单的消息对象
      const messageToStar = message || {
        id: `star-${Date.now()}`, // 生成一个唯一ID
        role: 'assistant',
        content: text,
      };
      
      // 添加chatId字段
      if (currentChatId && !messageToStar.chatId) {
        messageToStar.chatId = currentChatId;
      }
      
      const result = await addStar(messageToStar);
      if (result) {
        setLocalIsStarred(true);
        setIsStarred(true);
        // 刷新收藏列表
        refreshStarredMessages();
      }
    } finally {
      setIsStarring(false);
    }
  };

  // 大小映射
  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-8 w-8 p-1.5',
    lg: 'h-10 w-10 p-2',
  };
  
  // 变体映射
  const variantClasses = {
    default: 'bg-primary/90 hover:bg-primary text-primary-foreground',
    subtle: 'bg-primary/10 hover:bg-primary/20 text-primary',
    outline: 'bg-transparent border border-primary/30 hover:border-primary text-primary',
  };
  
  // 星标状态的独特样式
  const starredStyles = localIsStarred ? 
    'text-yellow-500 fill-yellow-500' : 
    '';

  return (
    <button
      onClick={handleClick}
      className={cn(
        localIsStarred ? 'fill-yellow-500' : '',
        'rounded-md flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
        sizeClasses[size],
        variantClasses[variant],
        'opacity-80 hover:opacity-100',
        starredStyles,
        className
      )}
      title={localIsStarred ? "已收藏" : "收藏内容"}
      type="button"
      disabled={isStarring}
    >
      {isStarring ? (
        <Loader2 className="h-full w-full animate-spin" />
      ) : (
        localIsStarred ? <Star className="h-full w-full fill-yellow-500" /> : <Star className="h-full w-full" />
      )}
    </button>
  );
} 